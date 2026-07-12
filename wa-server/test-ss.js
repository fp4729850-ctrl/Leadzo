const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/wa-sender', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/Users/mac/.gemini/antigravity-ide/brain/2c20fdd7-e75a-446a-b3d8-bb11414790c7/test-ss.png' });
  await browser.close();
  console.log('Screenshot saved!');
})();
