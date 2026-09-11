const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
    const extensionPath = path.resolve(__dirname, 'leadzo-extension');
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    console.log("Launching Chrome with Leadzo Extension...");
    
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: fs.existsSync(macChrome) ? macChrome : undefined,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--window-size=1280,800'
        ]
    });

    const page = await browser.newPage();
    
    console.log("Navigating to Leadzo AI live dashboard to sync Auth Token...");
    await page.goto('https://leadzoai.com/hotel-management', { waitUntil: 'domcontentloaded' });
    
    console.log("Token should be synced by the extension!");
    console.log("Now navigating to Agoda YCS...");
    
    await new Promise(r => setTimeout(r, 2000));
    await page.goto('https://ycs.agoda.com/', { waitUntil: 'domcontentloaded' });
    
    console.log("\n=======================================================");
    console.log("👉 ACTION REQUIRED: Please log into Agoda in the opened Chrome window!");
    console.log("Once you log in, the Leadzo Extension will automatically sync your cookies to Supabase.");
    console.log("After logging in, you can close the browser and test 'Auto-Connect' on Leadzo.");
    console.log("=======================================================\n");

    // Keep browser open for 10 minutes for user to login
    await new Promise(r => setTimeout(r, 600000));

})();
