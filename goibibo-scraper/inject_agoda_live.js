const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AGODA_COOKIES_PATH = path.join(__dirname, 'agoda_cookies.json');
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_ICAL_URL = 'https://www.airbnb.co.in/calendar/ical/1428110151030219910.ics?t=3dce546eb46141e7b38ad1a36e35a5d4';

async function runAgodaInjection() {
  console.log("🚀 [Agoda Live Injector] Starting Agoda YCS Extranet Injection...");
  
  if (!fs.existsSync(AGODA_COOKIES_PATH)) {
    console.error("❌ No saved agoda_cookies.json found!");
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync(AGODA_COOKIES_PATH, 'utf8'));
  console.log(`Loaded ${cookies.length} cookies from agoda_cookies.json`);

  let chromePath = process.env.CHROME_PATH;
  if (!chromePath && fs.existsSync(macChrome)) chromePath = macChrome;

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath || undefined,
    defaultViewport: { width: 1440, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setCookie(...cookies);

    console.log("Navigating to Agoda King Villa Calendar Sync page (/app/ari/calendarsync/50628060)...");
    await page.goto('https://portal.agoda.com/en-us/app/ari/calendarsync/50628060', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    await new Promise(r => setTimeout(r, 4000));

    console.log("Current URL:", page.url());

    // Dismiss any popups
    await page.evaluate(() => {
      const closeSelectors = ['button[aria-label*="close"]', '.modal-close', '.close-button', '[data-selenium*="close"]'];
      closeSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => { if (el && typeof el.click === 'function') el.click(); });
      });
    });

    // Check if on calendar page and needs clicking "Connect calendars" or settings
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, span'));
      const connectBtn = btns.find(b => (b.innerText || '').toLowerCase().includes('connect calendar') || (b.innerText || '').toLowerCase().includes('import calendar'));
      if (connectBtn && typeof connectBtn.click === 'function') connectBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const modalPath = path.join(__dirname, 'agoda_live_modal_opened.png');
    await page.screenshot({ path: modalPath, fullPage: true });
    console.log(`📸 Saved screenshot to: ${modalPath}`);

    // Fill inputs with React setter
    console.log(`Injecting Target iCal: ${TARGET_ICAL_URL}...`);
    const injected = await page.evaluate((targetUrl) => {
      const allInputs = Array.from(document.querySelectorAll('input'));
      
      // Look for the "Other website link" input
      let urlInput = allInputs.find(inp => {
        const parent = inp.closest('div');
        const txt = (parent?.innerText || '').toLowerCase();
        const ph = (inp.placeholder || '').toLowerCase();
        return (txt.includes('other website') || txt.includes('calendar link') || ph.includes('http') || ph.includes('link')) && !inp.readOnly && !txt.includes('export your agoda');
      });

      if (!urlInput && allInputs.length >= 2) {
        urlInput = allInputs[1];
      }

      // Look for the "Calendar name" input
      let nameInput = allInputs.find(inp => {
        const parent = inp.closest('div');
        const txt = (parent?.innerText || '').toLowerCase();
        const ph = (inp.placeholder || '').toLowerCase();
        return (txt.includes('calendar name') || ph.includes('calendar name') || ph.includes('name')) && inp !== urlInput;
      });

      if (!nameInput && allInputs.length >= 3) {
        nameInput = allInputs[2];
      }

      if (!urlInput) return { success: false, reason: 'URL input not found' };

      const setReactValue = (el, val) => {
        el.focus();
        const proto = Object.getPrototypeOf(el);
        const set = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (set) set.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      setReactValue(urlInput, targetUrl);
      if (nameInput) setReactValue(nameInput, 'Airbnb King Villa');

      return {
        success: true,
        urlValue: urlInput.value,
        nameValue: nameInput?.value
      };
    }, TARGET_ICAL_URL);

    console.log("Input injection result:", injected);

    const typedScreenshot = path.join(__dirname, 'agoda_live_typed.png');
    await page.screenshot({ path: typedScreenshot, fullPage: true });
    console.log(`📸 Saved screenshot to: ${typedScreenshot}`);

    // Click Import / Save
    console.log("Clicking Import button...");
    const clickedImport = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const importBtn = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'import');
      if (importBtn && typeof importBtn.click === 'function') {
        importBtn.click();
        return true;
      }
      return false;
    });

    console.log("Clicked Import button:", clickedImport);
    await new Promise(r => setTimeout(r, 4000));

    const finalScreenshot = path.join(__dirname, 'agoda_live_final.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    console.log(`📸 Saved final screenshot to: ${finalScreenshot}`);

    await browser.close();
    console.log("✅ Agoda injection run completed!");
  } catch (err) {
    console.error("❌ Agoda injection error:", err);
    await browser.close();
  }
}

runAgodaInjection();
