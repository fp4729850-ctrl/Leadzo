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
    const isHeadless = isCloud || hasCookies;
    console.log(`\n🏨 [Agoda Scraper] Running in Background (Headless: ${isHeadless})...`);
    const browser = await puppeteer.launch({
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
                } catch(e) {}
            }
        } else {
            console.log("✅ Already logged in to Agoda via saved cookies!");
            try {
                const cookies = await page.cookies();
                fs.writeFileSync(AGODA_COOKIES_PATH, JSON.stringify(cookies, null, 2));
            } catch (e) {}
        }

        // Navigate to calendar sync page
        console.log("Logged into Agoda! Navigating to Calendar Sync...");
        await page.goto('https://ycs.agoda.com/en-us/calendar', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));

        let extractedIcal = '';
        const pageContent = await page.content();
        const icalMatch = pageContent.match(/https:\/\/[a-zA-Z0-9_\-\.\/]+\.ics/);
        if (icalMatch) {
            extractedIcal = icalMatch[0];
            console.log("Extracted Agoda iCal Feed:", extractedIcal);
        } else {
            console.log("❌ Failed to extract iCal link.");
        }

        // 2-Way Sync: Inject Leadzo Master iCal into Agoda YCS if provided
        if (leadzoMasterIcal) {
            console.log("📡 [Injection Bot] Checking Agoda Calendar Sync to inject Leadzo Master iCal...");
            try {
                const importBtn = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('button, a, span, div'));
                    const target = elements.find(el => {
                        const txt = (el.innerText || '').toLowerCase();
                        return txt.includes('import calendar') || txt.includes('calendar sync') || txt.includes('sync calendar') || txt === 'sync';
                    });
                    if (target) { target.click(); return true; }
                    return false;
                });

                if (importBtn) {
                    await new Promise(r => setTimeout(r, 2000));
                    const urlInput = await page.$('input[placeholder*="http"], input[placeholder*="ical"], input[name*="url"], input[id*="url"], input[type="url"], input[type="text"]');
                    if (urlInput) {
                        await urlInput.click({ clickCount: 3 });
                        await urlInput.type(leadzoMasterIcal, { delay: 30 });
                        const nameInput = await page.$('input[placeholder*="name"], input[name*="name"], input[id*="name"]');
                        if (nameInput) {
                            await nameInput.click({ clickCount: 3 });
                            await nameInput.type('Leadzo AI Master', { delay: 30 });
                        }
                        await page.evaluate(() => {
                            const btns = Array.from(document.querySelectorAll('button'));
                            const saveBtn = btns.find(b => ['save', 'import', 'sync', 'submit'].some(k => (b.innerText || '').toLowerCase().includes(k)));
                            if (saveBtn) saveBtn.click();
                        });
                        console.log("✅ [Injection Bot] Leadzo Master iCal injected & saved into Agoda!");
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            } catch (injectErr) {
                console.log("Agoda iCal injection notice:", injectErr.message);
            }
        }

        if (extractedIcal) {
            return {
                success: true,
                channel: 'agoda',
                icalUrl: extractedIcal,
                message: '✅ Agoda iCal successfully extracted & connected!'
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
