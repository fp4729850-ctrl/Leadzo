const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let globalBrowser = null;

async function scrapeGoibibo(cookiesArray) {
    try {
        // In the cloud, we run headless and stateless
        if (!globalBrowser || !globalBrowser.connected) {
            console.log("Launching new headless cloud browser instance...");
            globalBrowser = await puppeteer.launch({
                headless: 'new', // Cloud servers must be headless
                // On cloud (like Railway), Puppeteer downloads its own Chromium so we don't strictly need executablePath,
                // but we can pass args for sandboxing.
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars'
                ],
                ignoreDefaultArgs: ['--enable-automation']
            });
        } else {
            console.log("Reusing cloud browser instance...");
        }

        const page = await globalBrowser.newPage();

        // Inject the passed cookies
        console.log("Injecting user session cookies...");
        await page.setCookie(...cookiesArray);

        console.log("Navigating to Goibibo Extranet...");
        await page.goto('https://in.goibibo.com/newextranet/bookings/bookingslist', { waitUntil: 'networkidle2' });

        // Wait a moment for data to render, checking if login was successful
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('auth')) {
            throw new Error("Cookies are expired or invalid. Goibibo redirected to the login page. Please update your cookies.");
        }

        console.log("Extracting booking details from the DOM...");
        
        const bookings = await page.evaluate(() => {
            const results = [];
            // Generic placeholder for actual DOM parsing logic
            return results;
        });
        
        // Clean up page to save memory on the cloud server
        await page.close();

        return bookings;

    } catch (error) {
        console.error("Scraping failed:", error);
        throw error;
    }
}

module.exports = { scrapeGoibibo };
