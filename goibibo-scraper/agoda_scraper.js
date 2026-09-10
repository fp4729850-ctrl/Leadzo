const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const AGODA_SESSION_DIR = path.join(process.env.HOME || '', '.leadzo-agoda-session');

async function scrapeAgoda(options = {}) {
    const { username, email, password, otp, leadzoMasterIcal, action } = options;
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

    if (!chromePath && fs.existsSync(macChrome)) {
        chromePath = macChrome;
    } else if (!chromePath) {
        try {
            chromePath = await puppeteer.executablePath();
        } catch (e) {}
    }

    console.log(`\n🏨 [Agoda Scraper] Launching Chrome (Headless: ${isCloud})...`);
    const browser = await puppeteer.launch({
        headless: isCloud ? 'new' : false,
        executablePath: chromePath,
        userDataDir: AGODA_SESSION_DIR,
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
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Ping check
        if (action === 'ping') {
            await browser.close();
            return { success: true, message: 'Agoda Scraper ready' };
        }

        console.log("Navigating to Agoda YCS Extranet...");
        await page.goto('https://ycs.agoda.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 3000));

        let currentUrl = page.url();
        console.log("Current Agoda URL:", currentUrl);

        // Check if on login page
        if (currentUrl.includes('login') || currentUrl.includes('signin')) {
            console.log("Not logged in to Agoda YCS. Attempting login...");

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

                currentUrl = page.url();
                if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('verification') || currentUrl.includes('otp')) {
                    return {
                        success: true,
                        needOtp: true,
                        message: "Agoda YCS requires verification / OTP. Please complete or approve in the opened Chrome window or enter code."
                    };
                }
            }
        }

        // Navigate to calendar sync page
        console.log("Logged into Agoda! Navigating to Calendar Sync...");
        await page.goto('https://ycs.agoda.com/en-us/calendar', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));

        let extractedIcal = '';
        const pageContent = await page.content();
        const icalMatch = pageContent.match(/https:\/\/ycs\.agoda\.com\/[a-zA-Z0-9_\-\/]+\.ics/);
        if (icalMatch) {
            extractedIcal = icalMatch[0];
            console.log("Extracted Agoda iCal Feed:", extractedIcal);
        }

        return {
            success: true,
            channel: 'agoda',
            icalUrl: extractedIcal || `https://ycs.agoda.com/en-us/calendar`,
            message: extractedIcal ? '✅ Agoda iCal successfully extracted & connected!' : 'Logged in successfully to Agoda YCS. Session cookies saved.'
        };
    } catch (err) {
        console.error("Agoda Scraper Error:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { scrapeAgoda };
