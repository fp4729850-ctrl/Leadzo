const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'cookies.json');

let globalBrowser = null;
let globalPage = null;

async function scrapeGoibibo() {
    try {
        const hasCookies = fs.existsSync(COOKIES_PATH);
        
        // If browser isn't open yet, or if it was closed manually, launch it
        if (!globalBrowser || !globalBrowser.isConnected()) {
            console.log("Launching new browser instance...");
            globalBrowser = await puppeteer.launch({
                headless: false, // Keeping it visible so user can login
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
            globalPage = await globalBrowser.newPage();
            
            if (hasCookies) {
                console.log("Loading saved session cookies...");
                const cookiesString = fs.readFileSync(COOKIES_PATH);
                const cookies = JSON.parse(cookiesString);
                await globalPage.setCookie(...cookies);
            }
        } else {
            console.log("Reusing already open browser instance...");
        }

        console.log("Navigating to Goibibo Extranet...");
        await globalPage.goto('https://in.goibibo.com/newextranet/bookings/bookingslist', { waitUntil: 'networkidle2' });

        if (!hasCookies) {
            console.log("Waiting for user to manually log in...");
            // We wait up to 2 minutes. If user takes longer, the request times out,
            // but the browser STAYS OPEN. They can just click "Sync" again later.
            await globalPage.waitForFunction(() => {
                return document.body.innerText.includes('Check-in') || document.body.innerText.includes('Bookings');
            }, { timeout: 120000 }).catch(() => {
                throw new Error("Login wait timed out. Keep the browser open, finish logging in, and then click Sync again.");
            });
            
            console.log("Login detected! Saving session cookies...");
            const cookies = await globalPage.cookies();
            fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
        }

        // Wait a moment for data to render
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("Extracting booking details from the DOM...");
        
        const bookings = await globalPage.evaluate(() => {
            const results = [];
            // Generic placeholder for actual DOM parsing logic
            return results;
        });
        
        return bookings;

    } catch (error) {
        console.error("Scraping failed:", error);
        throw error;
    }
    // We intentionally DO NOT close the browser here.
    // This allows the user to stay logged in and visually see the agent working.
}

module.exports = { scrapeGoibibo };
