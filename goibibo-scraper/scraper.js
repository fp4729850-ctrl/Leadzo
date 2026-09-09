const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'cookies.json');

async function scrapeGoibibo() {
    let browser;
    try {
        const hasCookies = fs.existsSync(COOKIES_PATH);
        
        browser = await puppeteer.launch({
            headless: false, // Keeping it visible for debugging and Google Sign-in
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            defaultViewport: null,
            args: [
                '--start-maximized', 
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        });
        
        const page = await browser.newPage();
        
        if (hasCookies) {
            console.log("Loading saved session cookies...");
            const cookiesString = fs.readFileSync(COOKIES_PATH);
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
        }

        console.log("Navigating to Goibibo Extranet...");
        await page.goto('https://in.goibibo.com/newextranet/bookings/bookingslist', { waitUntil: 'networkidle2' });

        if (!hasCookies) {
            console.log("Waiting for user to manually log in...");
            // Wait indefinitely until the user logs in and the URL or page changes to the bookings dashboard
            await page.waitForFunction(() => {
                return document.body.innerText.includes('Check-in') || document.body.innerText.includes('Bookings');
            }, { timeout: 0 });
            
            console.log("Login detected! Saving session cookies...");
            const cookies = await page.cookies();
            fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
        }

        // Wait a moment for data to render
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("Extracting booking details from the DOM...");
        
        // This is a generic DOM parser. Since we don't have the exact HTML structure,
        // we'll attempt to extract it, but if it fails we return the parsed data.
        const bookings = await page.evaluate(() => {
            const results = [];
            
            // Logic to scrape real data from Goibibo table
            // As we don't have the exact HTML classes, this is a placeholder where the real DOM selectors will go
            // Ex: document.querySelectorAll('.booking-row')
            
            return results;
        });
        
        return bookings;

    } catch (error) {
        console.error("Scraping failed:", error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { scrapeGoibibo };
