const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeGoibibo() {
    let page;
    try {
        console.log("Connecting to your already-running Chrome browser...");
        
        // Connect to the user's REAL Chrome browser via remote debugging
        const browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });

        console.log("Connected! Opening new tab for Goibibo...");
        page = await browser.newPage();

        console.log("Navigating to Goibibo Extranet...");
        await page.goto('https://in.goibibo.com/newextranet/bookings/bookingslist', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        // Wait for data to render
        await new Promise(resolve => setTimeout(resolve, 5000));

        const currentUrl = page.url();
        console.log("Current URL:", currentUrl);

        if (currentUrl.includes('login') || currentUrl.includes('auth')) {
            await page.screenshot({ path: 'error.png', fullPage: true });
            throw new Error("Not logged in. Please login to Goibibo in your Chrome browser first, then try again.");
        }

        console.log("Login confirmed! Extracting booking details...");

        // Extract real booking data from the page
        const bookings = await page.evaluate(() => {
            const results = [];
            // Try to find booking rows in the Goibibo Extranet table
            const rows = document.querySelectorAll('tr, .booking-row, [class*="booking"], [class*="Booking"]');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, [class*="cell"], [class*="Cell"]');
                if (cells.length >= 3) {
                    const text = row.innerText;
                    // Only include rows that look like booking data
                    if (text.includes('Check-In') || text.includes('Check-Out') || text.includes('Guests') || text.includes('₹')) {
                        results.push({
                            raw_text: text.trim(),
                            guest_name: cells[0]?.innerText?.trim() || '',
                            stay_duration: cells[1]?.innerText?.trim() || '',
                            room_info: cells[2]?.innerText?.trim() || '',
                        });
                    }
                }
            });

            // Also capture the full page text for parsing
            return {
                bookings: results,
                pageText: document.body.innerText.substring(0, 5000),
                pageTitle: document.title
            };
        });

        console.log("Extracted data:", JSON.stringify(bookings, null, 2));

        // Close only the tab we opened, NOT the user's browser
        await page.close();
        
        // Disconnect from the browser (don't close it!)
        browser.disconnect();

        return bookings;

    } catch (error) {
        console.error("Scraping failed:", error.message);
        if (page) {
            try { await page.close(); } catch(e) {}
        }
        throw error;
    }
}

module.exports = { scrapeGoibibo };
