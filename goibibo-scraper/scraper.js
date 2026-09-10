const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'goibibo_cookies.json');

async function scrapeGoibibo() {
    let browser;
    try {
        const hasCookies = fs.existsSync(COOKIES_PATH);
        
        console.log("Launching visible Chrome browser...");
        browser = await puppeteer.launch({
            headless: false,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
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
        console.log("Current URL:", currentUrl);

        // Check if we need to login
        if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('signin')) {
            console.log("⚠️  Not logged in. Please login manually in the Chrome window.");
            console.log("   Use your PHONE NUMBER to login (avoid Google Sign-In).");
            console.log("   Waiting up to 5 minutes for you to complete login...\n");
            
            // Wait for the bookings page to appear after login
            await page.waitForFunction(() => {
                const text = document.body.innerText || '';
                return text.includes('Guest Name') || 
                       text.includes('Check-in') || 
                       text.includes('Bookings') ||
                       text.includes('Booking ID') ||
                       text.includes('Stay Duration');
            }, { timeout: 300000 }); // 5 minutes

            console.log("✅ Login successful! Saving cookies for future use...");
            const cookies = await page.cookies();
            fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
            
            // Wait for data to load after login
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log("✅ Already logged in via saved cookies!");
        }

        console.log("Extracting booking details...");

        const bookings = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('tr');
            
            rows.forEach((row, index) => {
                if (index === 0) return; // skip header
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const text = row.innerText;
                    if (text.includes('₹') || text.includes('Check-In') || text.includes('Guests')) {
                        results.push({
                            raw_text: text.trim().replace(/\n/g, ' | '),
                            guest_name: cells[0]?.innerText?.trim() || '',
                            stay_duration: cells[1]?.innerText?.trim() || '',
                            room_info: cells[2]?.innerText?.trim() || '',
                            booking_id: cells[3]?.innerText?.trim() || '',
                            amount: cells[cells.length - 1]?.innerText?.trim() || '',
                        });
                    }
                }
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
        return bookings;

    } catch (error) {
        console.error("Scraping failed:", error.message);
        if (browser) {
            try { await browser.close(); } catch(e) {}
        }
        throw error;
    }
}

module.exports = { scrapeGoibibo };
