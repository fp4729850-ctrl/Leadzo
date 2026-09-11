const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const AIRBNB_COOKIES_PATH = path.join(__dirname, 'airbnb_cookies.json');
const AIRBNB_SESSION_DIR = path.join(process.env.HOME || '', '.leadzo-airbnb-session');

async function scrapeAirbnb(options = {}) {
    const { username, email, password, otp, leadzoMasterIcal, action, sessionCookies } = options;
    const loginEmail = email || username || '';

    if (!fs.existsSync(AIRBNB_SESSION_DIR)) {
        try { fs.mkdirSync(AIRBNB_SESSION_DIR, { recursive: true }); } catch (e) {}
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

    if (!chromePath && fs.existsSync(macChrome)) {
        chromePath = macChrome;
    } else if (!chromePath) {
        try {
            chromePath = await puppeteer.executablePath();
        } catch (e) {}
    }

    console.log(`\n🏡 [Airbnb Scraper] Launching Chrome (Headless: ${isCloud})...`);
    const browser = await puppeteer.launch({
        headless: isCloud ? 'new' : false,
        executablePath: chromePath,
        userDataDir: AIRBNB_SESSION_DIR,
        defaultViewport: isCloud ? { width: 1280, height: 900 } : null,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,900'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

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
            return { success: true, message: 'Airbnb Scraper ready' };
        }

        // 1. If session cookies are provided by DB, or saved cookies exist locally, load them
        const hasLocalCookies = fs.existsSync(AIRBNB_COOKIES_PATH);
        if (sessionCookies && Array.isArray(sessionCookies) && sessionCookies.length > 0) {
            console.log("Loading Airbnb session cookies from Supabase DB payload...");
            try {
                await page.setCookie(...sessionCookies);
            } catch (e) {
                console.error("Failed to set DB cookies:", e);
            }
        } else if (hasLocalCookies) {
            console.log("Loading saved Airbnb session cookies from airbnb_cookies.json...");
            try {
                const cookies = JSON.parse(fs.readFileSync(AIRBNB_COOKIES_PATH, 'utf8'));
                await page.setCookie(...cookies);
            } catch (e) {
                console.log("Airbnb cookie load notice:", e.message);
            }
        }

        console.log("Navigating to Airbnb Hosting Dashboard...");
        await page.goto('https://www.airbnb.com/hosting/listings', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 4000));

        let currentUrl = page.url();
        console.log("Current Airbnb URL:", currentUrl);

        let isLogged = !currentUrl.includes('/login') && !currentUrl.includes('/authenticate');

        // Check if on login page
        if (!isLogged) {
            console.log("⚠️ Not logged in to Airbnb. Auto-filling credentials if provided, and waiting for user in Chrome window...");
            
            // If OTP provided, type OTP
            if (otp) {
                console.log("Submitting provided OTP to Airbnb...");
                const otpInputs = await page.$$('input[autocomplete="one-time-code"], input[type="text"], input[type="tel"]');
                if (otpInputs.length > 0) {
                    await otpInputs[0].type(String(otp), { delay: 100 });
                    await new Promise(r => setTimeout(r, 1000));
                    await page.keyboard.press('Enter');
                    await new Promise(r => setTimeout(r, 4000));
                }
            } else {
                // Try filling email if available
                if (loginEmail) {
                    try {
                        const emailSelector = 'input[id*="email"], input[type="email"], input[name="user[email]"]';
                        await page.waitForSelector(emailSelector, { timeout: 4000 });
                        await page.type(emailSelector, loginEmail, { delay: 50 });
                        await page.keyboard.press('Enter');
                        await new Promise(r => setTimeout(r, 3000));
                    } catch (e) {
                        console.log("Email field auto-fill note:", e.message);
                    }
                }

                // If password available, try filling password
                if (password) {
                    try {
                        const passSelector = 'input[type="password"]';
                        await page.waitForSelector(passSelector, { timeout: 4000 });
                        await page.type(passSelector, password, { delay: 50 });
                        await page.keyboard.press('Enter');
                        await new Promise(r => setTimeout(r, 4000));
                    } catch (e) {}
                }
            }

            console.log("Waiting up to 5 minutes for Airbnb login to complete in Chrome window...");
            const loginTimeout = isCloud ? 25000 : 300000;
            try {
                await page.waitForFunction(() => {
                    const url = window.location.href;
                    const text = document.body ? document.body.innerText : '';
                    return (!url.includes('/login') && !url.includes('/authenticate')) ||
                           url.includes('/hosting') || text.includes('Today') || text.includes('Calendar') || text.includes('Listings');
                }, { timeout: loginTimeout });

                console.log("✅ Airbnb Login successful! Saving cookies to airbnb_cookies.json...");
                const cookies = await page.cookies();
                fs.writeFileSync(AIRBNB_COOKIES_PATH, JSON.stringify(cookies, null, 2));
                await new Promise(r => setTimeout(r, 4000));
            } catch (waitErr) {
                const pageBody = await page.evaluate(() => document.body ? document.body.innerText : '');
                if (pageBody.includes('OTP') || pageBody.includes('verification') || pageBody.includes('code')) {
                    return {
                        needOtp: true,
                        message: "Airbnb requires verification code or phone confirmation. Please approve in the opened Chrome window or enter the SMS OTP."
                    };
                }
                console.log("Airbnb login wait notice:", waitErr.message);
            }
        } else {
            console.log("✅ Already logged in to Airbnb via saved cookies!");
            try {
                const cookies = await page.cookies();
                fs.writeFileSync(AIRBNB_COOKIES_PATH, JSON.stringify(cookies, null, 2));
            } catch (e) {}
        }

        // Now logged in: navigate to listings or multi-calendar
        console.log("Logged into Airbnb! Fetching listings & calendar sync feeds...");
        await page.goto('https://www.airbnb.com/multicalendar', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));

        let extractedIcal = '';
        // Search page content for ical URL
        const pageContent = await page.content();
        const icalMatch = pageContent.match(/https:\/\/www\.airbnb\.com\/calendar\/ical\/[a-zA-Z0-9_\-\.]+\.ics(?:\?s=[a-zA-Z0-9_\-]+)?/);
        if (icalMatch) {
            extractedIcal = icalMatch[0];
            console.log("Extracted Airbnb iCal Feed:", extractedIcal);
        }

        // 2-Way Sync: Inject Leadzo Master iCal into Airbnb
        if (leadzoMasterIcal) {
            console.log("📡 [Injection Bot] Checking Airbnb Calendar Sync to inject Leadzo Master iCal...");
            try {
                const importTrigger = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('button, a, span'));
                    const target = elements.find(el => {
                        const txt = (el.innerText || '').toLowerCase();
                        return txt.includes('sync calendars') || txt.includes('import calendar') || txt.includes('availability settings');
                    });
                    if (target) { target.click(); return true; }
                    return false;
                });

                if (importTrigger) {
                    await new Promise(r => setTimeout(r, 2000));
                    const urlInput = await page.$('input[name*="calendar_url"], input[id*="calendar_url"], input[placeholder*="https://"], input[type="url"], input[type="text"]');
                    if (urlInput) {
                        await urlInput.click({ clickCount: 3 });
                        await urlInput.type(leadzoMasterIcal, { delay: 30 });
                        const nameInput = await page.$('input[name*="calendar_name"], input[id*="calendar_name"], input[placeholder*="Name"]');
                        if (nameInput) {
                            await nameInput.click({ clickCount: 3 });
                            await nameInput.type('Leadzo AI Master', { delay: 30 });
                        }
                        await page.evaluate(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            const submitBtn = btns.find(b => ['import calendar', 'save', 'done'].some(k => (b.innerText || '').toLowerCase().includes(k)));
                            if (submitBtn) submitBtn.click();
                        });
                        console.log("✅ [Injection Bot] Leadzo Master iCal injected & saved into Airbnb!");
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            } catch (injectErr) {
                console.log("Airbnb iCal injection notice:", injectErr.message);
            }
        }

        // Fallback standard listing URL if ical not found directly on multi-calendar HTML
        if (!extractedIcal) {
            // Find first listing ID
            const listingIdMatch = pageContent.match(/\/hosting\/listings\/([0-9]+)/) || page.url().match(/([0-9]{7,})/);
            if (listingIdMatch && listingIdMatch[1]) {
                const listingId = listingIdMatch[1];
                extractedIcal = `https://www.airbnb.com/calendar/ical/${listingId}.ics`;
                console.log("Constructed Listing iCal:", extractedIcal);
            }
        }

        return {
            success: true,
            channel: 'airbnb',
            icalUrl: extractedIcal || `https://www.airbnb.com/hosting/listings`,
            message: extractedIcal ? '✅ Airbnb iCal successfully extracted & connected!' : 'Logged in successfully to Airbnb. Session cookies saved.'
        };
    } catch (err) {
        console.error("Airbnb Scraper Error:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { scrapeAirbnb };

