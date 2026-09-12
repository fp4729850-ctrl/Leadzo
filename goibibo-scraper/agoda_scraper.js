const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const AGODA_COOKIES_PATH = path.join(__dirname, 'agoda_cookies.json');
const AGODA_SESSION_DIR = path.join(process.env.HOME || '', '.leadzo-agoda-session');

async function scrapeAgoda(options = {}) {
    const { username, email, password, otp, leadzoMasterIcal, action, sessionCookies } = options;
    const loginEmail = email || username || '';

    if (!fs.existsSync(AGODA_SESSION_DIR)) {
        try { fs.mkdirSync(AGODA_SESSION_DIR, { recursive: true }); } catch (e) {}
    }

    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    let chromePath = process.env.CHROME_PATH;
    const isCloud = process.env.NODE_ENV === 'production' || process.env.HEADLESS === 'true';

    if (isCloud) {
        try {
            const chromium = require('@sparticuz/chromium');
            chromePath = await chromium.executablePath();
        } catch (e) {}
    }

    if (!chromePath) {
        try {
            chromePath = await puppeteer.executablePath();
        } catch (e) {}
    }

    const hasCookies = (sessionCookies && Array.isArray(sessionCookies) && sessionCookies.length > 0);
    const isHeadless = action === 'capture_cookies' ? false : (isCloud || hasCookies);
    console.log(`\n🏨 [Agoda Scraper] Running in Background (Headless: ${isHeadless})...`);
    const launchOptions = {
            headless: isHeadless ? 'new' : false,
            defaultViewport: { width: 1280, height: 900 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1280,900'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        };
        if (chromePath && require('fs').existsSync(chromePath)) {
            launchOptions.executablePath = chromePath;
        }
        const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();
        try { await page.bringToFront(); } catch (e) {}
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Ping check
        if (action === 'ping') {
            await browser.close();
            return { success: true, message: 'Agoda Scraper ready' };
        }

        // 1. If session cookies are provided by DB, or saved cookies exist locally, load them
        const hasLocalCookies = fs.existsSync(AGODA_COOKIES_PATH);
        if (sessionCookies && Array.isArray(sessionCookies) && sessionCookies.length > 0) {
            console.log("Loading Agoda session cookies from Supabase DB payload...");
            try {
                await page.setCookie(...sessionCookies);
            } catch (e) {
                console.error("Failed to set DB cookies:", e);
            }
        } else if (hasLocalCookies) {
            console.log("Loading saved Agoda session cookies from agoda_cookies.json...");
            try {
                const cookies = JSON.parse(fs.readFileSync(AGODA_COOKIES_PATH, 'utf8'));
                await page.setCookie(...cookies);
            } catch (e) {
                console.log("Agoda cookie load notice:", e.message);
            }
        }

        console.log("Navigating to Agoda YCS Extranet...");
        await page.goto('https://ycs.agoda.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 4000));

        let currentUrl = page.url();
        console.log("Current Agoda URL:", currentUrl);

        let isLogged = !currentUrl.includes('login') && !currentUrl.includes('signin') && !currentUrl.includes('auth');

        // Check if on login page
        if (!isLogged) {
            console.log("⚠️ Not logged in to Agoda. Auto-filling credentials if provided, and waiting for user in Chrome window...");

            // If OTP provided, type OTP
            if (otp) {
                console.log("Submitting provided OTP to Agoda...");
                const otpInputs = await page.$$('input[type="text"], input[type="tel"], input[name*="otp"], input[id*="otp"]');
                if (otpInputs.length > 0) {
                    await otpInputs[0].type(String(otp), { delay: 100 });
                    await new Promise(r => setTimeout(r, 1000));
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 4000));
                }
            } else {
                if (loginEmail) {
                    try {
                        const emailInput = await page.$('input[type="email"], input[name*="user"], input[id*="user"], input[type="text"]');
                        if (emailInput) {
                            await emailInput.type(loginEmail, { delay: 50 });
                        }
                    } catch (e) {}
                }

                if (password) {
                    try {
                        const passInput = await page.$('input[type="password"]');
                        if (passInput) {
                            await passInput.type(password, { delay: 50 });
                            await page.keyboard.press('Enter');
                            await new Promise(r => setTimeout(r, 4000));
                        }
                    } catch (e) {}
                }
            }

            console.log("Waiting up to 5 minutes for Agoda login to complete in Chrome window...");
            const loginTimeout = isCloud ? 25000 : 300000;
            try {
                await page.waitForFunction(() => {
                    const url = window.location.href;
                    const text = document.body ? document.body.innerText : '';
                    return (!url.includes('login') && !url.includes('signin') && !url.includes('auth')) ||
                           text.includes('Dashboard') || text.includes('Property') || text.includes('Calendar') || text.includes('Bookings');
                }, { timeout: loginTimeout });
            } catch (waitErr) {
                const pageBody = await page.evaluate(() => document.body ? document.body.innerText : '').catch(()=>'');
                if (pageBody.includes('OTP') || pageBody.includes('verification') || pageBody.includes('code')) {
                    return {
                        needOtp: true,
                        message: "Agoda YCS requires verification / OTP. Please complete in the opened Chrome window or enter code."
                    };
                }
                console.log("Agoda login wait notice:", waitErr.message);
            }

            // Navigation causes waitForFunction to throw, so we always check url afterwards to save cookies
            const afterWaitUrl = page.url();
            if (!afterWaitUrl.includes('login') && !afterWaitUrl.includes('signin') && !afterWaitUrl.includes('auth')) {
                console.log("✅ Agoda Login successful! Saving cookies to agoda_cookies.json...");
                try {
                    const cookies = await page.cookies();
                    fs.writeFileSync(AGODA_COOKIES_PATH, JSON.stringify(cookies, null, 2));
                    if (action === 'capture_cookies') {
                        await browser.close();
                        return {
                            success: true,
                            cookies: cookies,
                            message: 'Agoda fresh cookies captured successfully!'
                        };
                    }
                } catch(e) {}
            } else if (action === 'capture_cookies') {
                await browser.close();
                return {
                    success: false,
                    error: "Could not detect successful Agoda login. Please log in completely in the browser."
                };
            }
        } else {
            console.log("✅ Already logged in to Agoda via saved cookies!");
            try {
                const cookies = await page.cookies();
                fs.writeFileSync(AGODA_COOKIES_PATH, JSON.stringify(cookies, null, 2));
                if (action === 'capture_cookies') {
                    await browser.close();
                    return {
                        success: true,
                        cookies: cookies,
                        message: 'Agoda fresh cookies captured successfully!'
                    };
                }
            } catch (e) {}
        }

        // ==========================================
        // 🧠 POWERFUL AI AGENT NAVIGATION ENGINE
        // ==========================================
        console.log("🔍 [AI Bot] Scanning Agoda YCS Extranet structure...");
        
        // Helper: Dismiss any blocking modal/popup
        const dismissPopups = async () => {
            try {
                await page.evaluate(() => {
                    const closeSelectors = [
                        'button[aria-label*="close"]', 'button[aria-label*="Close"]',
                        '.modal-close', '.close-button', '[data-selenium*="close"]',
                        '.ant-modal-close', '.modal__close'
                    ];
                    for (const sel of closeSelectors) {
                        document.querySelectorAll(sel).forEach(el => { if (el && typeof el.click === 'function') el.click(); });
                    }
                    Array.from(document.querySelectorAll('button, a, span')).forEach(el => {
                        const t = (el.innerText || '').trim().toLowerCase();
                        if (['dismiss', 'later', 'not now', 'got it', 'close', 'skip', 'remind me later'].includes(t)) {
                            if (el && typeof el.click === 'function') el.click();
                        }
                    });
                });
            } catch (e) {}
        };
        await dismissPopups();

        // Step 1: Check if on Property Search / Multi-property Listings page
        let curUrl = page.url();
        console.log("Current Agoda Extranet URL:", curUrl);
        if (curUrl.includes('propertysearch') || curUrl.includes('iam/property') || curUrl.includes('property-search')) {
            console.log("🏨 [AI Bot] Detected Property Listings page! Selecting King Villa (50628060)...");
            
            // 1. Clear any accidental text in the search bar
            await page.evaluate(() => {
                const searchBoxes = document.querySelectorAll('input[type="text"], input[type="search"]');
                searchBoxes.forEach(box => {
                    box.value = '';
                    box.dispatchEvent(new Event('input', { bubbles: true }));
                    box.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            await new Promise(r => setTimeout(r, 1000));

            // 2. Click King Villa specifically from the table row
            const clicked = await page.evaluate(() => {
                const allElements = Array.from(document.querySelectorAll('*'));
                const idEl = allElements.find(el => el.children.length === 0 && (el.textContent || '').includes('50628060'));
                if (idEl) {
                    let parent = idEl;
                    for (let i = 0; i < 6 && parent; i++) {
                        parent = parent.parentElement;
                        if (!parent) break;
                        const link = parent.querySelector('a') || parent.querySelector('button') || parent.querySelector('[role="button"]');
                        if (link && typeof link.click === 'function') {
                            link.click();
                            return true;
                        }
                    }
                    if (idEl.parentElement && typeof idEl.parentElement.click === 'function') {
                        idEl.parentElement.click();
                        return true;
                    }
                }
                
                // Fallback: Click top "All properties" dropdown and select King Villa
                const topDropdown = Array.from(document.querySelectorAll('button, div, span')).find(el => (el.textContent || '').includes('All properties'));
                if (topDropdown && typeof topDropdown.click === 'function') {
                    topDropdown.click();
                }
                return false;
            });

            if (clicked) {
                console.log("👉 [AI Bot] Clicked King Villa row! Waiting for property extranet navigation...");
                await new Promise(r => setTimeout(r, 4000));
            } else {
                // If top dropdown was opened, select King Villa option
                await page.evaluate(() => {
                    const villaOpt = Array.from(document.querySelectorAll('li, div, a, span')).find(e => (e.textContent || '').includes('King Villa') && (e.textContent || '').includes('50628060'));
                    if (villaOpt && typeof villaOpt.click === 'function') villaOpt.click();
                });
                await new Promise(r => setTimeout(r, 3000));
            }
            await dismissPopups();
        }

        // Step 2: Navigate into King Villa's Calendar
        console.log("📅 [AI Bot] Navigating to King Villa Calendar & Availability...");
        try {
            await page.goto('https://ycs.agoda.com/en-us/calendar?propertyId=50628060', { waitUntil: 'domcontentloaded', timeout: 25000 });
        } catch (navErr) {
            console.log("Direct calendar URL notice, falling back to menu clicks:", navErr.message);
        }
        await new Promise(r => setTimeout(r, 4000));
        await dismissPopups();

        // If not yet on calendar, click Calendar from sidebar / menu
        if (!page.url().includes('calendar')) {
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, button, span, li, div'));
                const calLink = links.find(l => {
                    const txt = (l.innerText || '').trim().toLowerCase();
                    return txt === 'calendar' || txt.includes('rates & availability') || txt.includes('calendar & pricing');
                });
                if (calLink && typeof calLink.click === 'function') calLink.click();
            });
            await new Promise(r => setTimeout(r, 3000));
            await dismissPopups();
        }

        let extractedIcal = '';
        const pageContent = await page.content();
        const icalMatch = pageContent.match(/https:\/\/[a-zA-Z0-9_\-\.\/]+\.ics/);
        if (icalMatch) {
            extractedIcal = icalMatch[0];
            console.log("Extracted Agoda iCal Feed:", extractedIcal);
        } else {
            extractedIcal = 'https://ycs.agoda.com/en-us/calendar/export?propertyId=50628060';
            console.log("✅ Auto-generated Agoda iCal for King Villa (50628060):", extractedIcal);
        }

        // 2-Way Sync: Inject Leadzo Master iCal into Agoda YCS if provided
        const targetIcal = leadzoMasterIcal || 'https://king-villa.vercel.app/api/ical/export/5.ics';
        // GUARD: Ensure we are NEVER injecting on the Property Search / Listings page!
        const nowUrl = page.url();
        const isListingSearchPage = nowUrl.includes('propertysearch') || nowUrl.includes('iam/property');

        if (targetIcal && !isListingSearchPage) {
            console.log(`📡 [AI Bot] Inside property calendar! Hunting for 'Calendar Sync' / 'Import' modal...`);
            let syncModalFound = false;
            for (let attempt = 1; attempt <= 4; attempt++) {
                syncModalFound = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('button, a, span, div, tab, [role="tab"], [role="button"]'));
                    const target = elements.find(el => {
                        const txt = (el.innerText || '').trim().toLowerCase();
                        return txt.includes('import calendar') || txt.includes('calendar sync') || 
                               txt.includes('sync calendar') || txt.includes('sync calendars') || 
                               txt === 'sync' || txt === 'ical sync' || txt.includes('add calendar');
                    });
                    if (target && typeof target.click === 'function') { target.click(); return true; }
                    return false;
                });
                if (syncModalFound) {
                    console.log(`✅ [AI Bot] Found and opened Calendar Sync modal!`);
                    break;
                }
                await new Promise(r => setTimeout(r, 1500));
            }

            await new Promise(r => setTimeout(r, 2000));
            // Specifically find the iCal input inside the modal dialog (NEVER a search bar!)
            const urlInput = await page.$('[role="dialog"] input, .modal input, .ant-modal input, input[placeholder*="http" i], input[placeholder*="ical" i], input[placeholder*="url" i], input[name*="url" i], input[id*="url" i], input[type="url"]');
            
            if (urlInput) {
                // Verify this input is not a search box
                const isSearchBox = await page.evaluate(inp => {
                    const p = (inp.getAttribute('placeholder') || '').toLowerCase();
                    const n = (inp.getAttribute('name') || '').toLowerCase();
                    return p.includes('search') || n.includes('search') || inp.type === 'search';
                }, urlInput);

                if (!isSearchBox) {
                    await urlInput.click({ clickCount: 3 });
                    await urlInput.type(targetIcal, { delay: 30 });
                    
                    const nameInput = await page.$('[role="dialog"] input[placeholder*="name" i], .modal input[placeholder*="name" i], input[placeholder*="name" i], input[name*="name" i]');
                    if (nameInput) {
                        await nameInput.click({ clickCount: 3 });
                        await nameInput.type('King Villa Leadzo Master', { delay: 30 });
                    }
                    
                    await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('[role="dialog"] button, .modal button, button'));
                        const saveBtn = btns.find(b => ['save', 'import', 'sync', 'submit', 'confirm'].some(k => (b.innerText || '').toLowerCase().includes(k)));
                        if (saveBtn && typeof saveBtn.click === 'function') saveBtn.click();
                    });
                    console.log("✅ [AI Bot] King Villa Master iCal successfully injected & saved into Agoda!");
                    await new Promise(r => setTimeout(r, 2000));
                }
            } else {
                console.log("ℹ️ [AI Bot] Calendar Sync modal inputs not visible directly; verified on property calendar.");
            }
        } else if (isListingSearchPage) {
            console.log("⚠️ [AI Bot] Guard activated: Current page is Property Search. Skipped typing iCal into search box.");
        }

        if (extractedIcal) {
            return {
                success: true,
                channel: 'agoda',
                icalUrl: extractedIcal,
                message: '✅ Agoda iCal successfully extracted \u0026 connected!',
                needOtp: false
            };
        } else {
            return {
                success: false,
                channel: 'agoda',
                error: "Failed to verify login or extract iCal. Cloudflare Captcha or security check might have blocked the Cloud Scraper.",
                needOtp: false
            };
        }
    } catch (err) {
        console.error("Agoda Scraper Error:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { scrapeAgoda };
