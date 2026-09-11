const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const AGODA_COOKIES_PATH = path.join(__dirname, 'agoda_cookies.json');

async function checkAgodaCalendar() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    if (fs.existsSync(AGODA_COOKIES_PATH)) {
        const cookies = JSON.parse(fs.readFileSync(AGODA_COOKIES_PATH, 'utf8'));
        await page.setCookie(...cookies);
    } else {
        console.log("No cookies found!");
        await browser.close();
        return;
    }

    console.log("Navigating to Calendar Sync...");
    await page.goto('https://ycs.agoda.com/en-us/calendar', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ path: 'agoda_calendar_debug.png' });
    console.log("Saved screenshot to agoda_calendar_debug.png");

    // Dump HTML
    const html = await page.content();
    fs.writeFileSync('agoda_calendar_debug.html', html);
    console.log("Saved HTML to agoda_calendar_debug.html");

    // Try finding any .ics links
    const icalMatch = html.match(/https:\/\/[a-zA-Z0-9_\-\.\/]+\.ics/g);
    console.log("Found .ics matches:", icalMatch);

    await browser.close();
}

checkAgodaCalendar().catch(console.error);
