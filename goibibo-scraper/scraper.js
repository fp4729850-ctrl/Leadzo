const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'goibibo_cookies.json');

async function scrapeGoibibo(options = {}) {
    const { username, password, otp } = options;
    let browser;
    try {
        const hasCookies = fs.existsSync(COOKIES_PATH);
        
        const isCloud = process.env.NODE_ENV === 'production' || process.env.HEADLESS === 'true';
        const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        let chromePath = process.env.CHROME_PATH;

        if (isCloud) {
            try {
                const chromium = require('@sparticuz/chromium');
                chromePath = await chromium.executablePath();
                console.log("Using @sparticuz/chromium executablePath:", chromePath);
            } catch (e) {
                console.log("Sparticuz chromium notice:", e.message);
            }
        }

        if (!chromePath) {
            if (fs.existsSync(macChrome)) {
                chromePath = macChrome;
            } else {
                try {
                    chromePath = puppeteer.executablePath();
                } catch (e) {
                    console.log("Executable path notice:", e.message);
                }
            }
        }

        console.log(`Launching Chrome browser (Cloud Mode: ${isCloud}, Path: ${chromePath})...`);
        browser = await puppeteer.launch({
            headless: isCloud ? 'new' : false,
            executablePath: chromePath,
            defaultViewport: isCloud ? { width: 1280, height: 900 } : null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-size=1280,900'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        });

        const page = await browser.newPage();
        
        // Set a real user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Remove webdriver flag
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // If we have saved cookies, load them
        if (hasCookies) {
            console.log("Loading saved Goibibo session cookies...");
            const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
            await page.setCookie(...cookies);
        }

        console.log("Navigating to Goibibo Extranet...");
        await page.goto('https://in.goibibo.com/newextranet/bookings/bookingslist', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const currentUrl = page.url();
        const pageTitle = await page.title();
        console.log("Current URL:", currentUrl);
        console.log("Page Title:", pageTitle);

        // Check if we need to login
        const isLoginPage = !hasCookies || 
                            currentUrl.includes('login') || 
                            currentUrl.includes('auth') || 
                            currentUrl.includes('signin') || 
                            pageTitle.includes('Registration') || 
                            pageTitle.includes('Connect');

        if (isLoginPage) {
            console.log("⚠️  Not logged in.");
            
            if (otp) {
                console.log("📲 Auto-filling OTP provided by user...");
                try {
                    const otpInput = await page.$('input[name*="otp"], input[placeholder*="OTP"], input[placeholder*="otp"], input[type="tel"], #otp, input[maxLength="4"], input[maxLength="6"]');
                    if (otpInput) {
                        await otpInput.type(otp, { delay: 50 });
                        const verifyBtn = await page.$('button[type="submit"], button.btn-primary, #verify-btn, #submit-otp');
                        if (verifyBtn) await verifyBtn.click();
                    }
                } catch (e) {
                    console.log("OTP fill notice:", e.message);
                }
            } else if (username || password) {
                console.log("🔑 Auto-filling credentials provided by user...");
                try {
                    if (username) {
                        const userInput = await page.$('input[type="text"], input[type="email"], input[type="tel"], input[name="username"], input[name="mobileNumber"], #username, #userId');
                        if (userInput) {
                            await userInput.type(username, { delay: 50 });
                        }
                    }
                    if (password) {
                        const passInput = await page.$('input[type="password"]');
                        if (passInput) {
                            await passInput.type(password, { delay: 50 });
                        }
                    }
                    const submitBtn = await page.$('button[type="submit"], button.btn-primary, #login-btn, input[type="submit"]');
                    if (submitBtn) {
                        await submitBtn.click();
                    }
                } catch (e) {
                    console.log("Auto-fill notice:", e.message);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if page requires OTP right now
            const checkBodyText = await page.evaluate(() => document.body.innerText || '');
            if (!otp && (checkBodyText.includes('OTP') || checkBodyText.includes('verification code') || checkBodyText.includes('Enter Code') || checkBodyText.includes('Sent to'))) {
                console.log("📲 OTP required for Goibibo login!");
                await browser.close();
                return {
                    needOtp: true,
                    message: "OTP sent to your registered mobile number. Please enter OTP to complete sync."
                };
            }

            console.log("   Waiting for login to complete...\n");
            const loginTimeout = isCloud ? 20000 : 300000;
            
            // Wait for the bookings page to appear after login
            try {
                await page.waitForFunction(() => {
                    const text = document.body.innerText || '';
                    return (text.includes('Guest Name') || 
                            text.includes('Stay Duration') || 
                            text.includes('Check-In') ||
                            text.includes('Booking ID')) && 
                           !text.includes('Free Hotel Registration');
                }, { timeout: loginTimeout });
            } catch (waitErr) {
                const pageBody = await page.evaluate(() => document.body.innerText || '');
                if (pageBody.includes('OTP') || pageBody.includes('verification') || pageBody.includes('Sent to')) {
                    await browser.close();
                    return {
                        needOtp: true,
                        message: "OTP sent to your registered mobile number / email. Please enter OTP below."
                    };
                }
                if (pageBody.includes('invalid') || pageBody.includes('Incorrect') || pageBody.includes('failed')) {
                    throw new Error("Goibibo Login Failed: Invalid Mobile / Password entered.");
                }
                throw new Error("Goibibo Login Timeout: Please check your Mobile / Password or enter OTP.");
            }

            console.log("✅ Login successful! Saving cookies for future use...");
            const cookies = await page.cookies();
            fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
            
            // Wait for data to load after login
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log("✅ Already logged in via saved cookies!");
        }

        console.log("Extracting booking details...");
        
        // DEBUG: Save the page HTML so we can see the exact DOM structure
        const pageHtml = await page.content();
        fs.writeFileSync(path.join(__dirname, 'page_dump.html'), pageHtml);
        console.log("Page HTML saved to page_dump.html for debugging");
        
        // Also take a screenshot
        await page.screenshot({ path: path.join(__dirname, 'page_screenshot.png'), fullPage: true });
        console.log("Screenshot saved to page_screenshot.png");

        const bookings = await page.evaluate(() => {
            const results = [];
            
            // Goibibo Extranet table: each booking row is a <tr> with multiple <td> cells
            // Columns: Guest Name | Stay Duration | Room & Meal Plan | Booking ID | Guest Contact | Net Amount
            const allRows = document.querySelectorAll('table tr');
            
            allRows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                // Booking rows typically have 6+ cells (Guest Name, Stay, Room, BookingID, Contact, Amount)
                if (cells.length < 5) return;
                
                const rowText = row.innerText || '';
                
                // Skip rows that are headers, date separators, or promotional banners
                if (rowText.includes('Guest Name') || rowText.includes('Stay Duration')) return;
                if (rowText.includes('No Bookings') || rowText.includes('Offer Promotion')) return;
                if (!rowText.includes('Check-In') && !rowText.includes('Guests')) return;
                
                // Extract guest name (first cell) - e.g., "MUKUL KUM...\n+1 Guests"
                const guestCell = cells[0]?.innerText?.trim() || '';
                const guestNameMatch = guestCell.split('\n')[0]?.trim() || guestCell;
                
                // Extract stay duration (second cell) - e.g., "Check-In: 11 Sep\nCheck-Out: 12 Sep"
                const stayCell = cells[1]?.innerText?.trim() || '';
                const checkInMatch = stayCell.match(/Check-In[:\s]*(\d+\s+\w+)/i);
                const checkOutMatch = stayCell.match(/Check-Out[:\s]*(\d+\s+\w+)/i);
                const checkIn = checkInMatch ? checkInMatch[1].trim() : '';
                const checkOut = checkOutMatch ? checkOutMatch[1].trim() : '';
                
                // Extract room info (third cell) - e.g., "1 Small\nDelux No. 02"
                const roomCell = cells[2]?.innerText?.trim() || '';
                
                // Extract booking ID (fourth cell) - e.g., "GH25081277146554"
                const bookingIdCell = cells[3]?.innerText?.trim() || '';
                
                // Extract guest contact/phone (fifth cell) - e.g., "919867738371"
                const contactCell = cells[4]?.innerText?.trim() || '';
                const phoneMatch = contactCell.match(/(\d{10,12})/);
                const phone = phoneMatch ? phoneMatch[1] : contactCell;
                
                // Extract net amount (last cell) - e.g., "₹ 1,415.88"
                const amountCell = cells[cells.length - 1]?.innerText?.trim() || '';
                const amountMatch = amountCell.match(/[\d,]+\.?\d*/);
                const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
                
                results.push({
                    guest_name: guestNameMatch,
                    check_in: checkIn,
                    check_out: checkOut,
                    room_info: roomCell,
                    room_label: roomCell,
                    booking_id: bookingIdCell,
                    phone: phone,
                    amount: amount,
                    raw_text: rowText.trim().replace(/\n/g, ' | ')
                });
            });

            return {
                bookings: results,
                totalFound: results.length,
                pageTitle: document.title,
                currentUrl: window.location.href
            };
        });

        console.log(`\n📊 Found ${bookings.totalFound} bookings!`);
        console.log("Data:", JSON.stringify(bookings, null, 2));

        await browser.close();
        return bookings.bookings;

    } catch (error) {
        console.error("Scraping failed:", error.message);
        if (browser) {
            try { await browser.close(); } catch(e) {}
        }
        throw error;
    }
}

module.exports = { scrapeGoibibo };
