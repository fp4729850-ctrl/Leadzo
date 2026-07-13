const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;
const SESSION_DIR = path.join(__dirname, '.ig_session');

let browser = null;
let page = null;

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  
  browser = await puppeteer.launch({
    headless: false,
    userDataDir: SESSION_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
  });
  
  const pages = await browser.pages();
  page = pages[0] || await browser.newPage();
  
  return browser;
}

app.get('/api/status', async (req, res) => {
  try {
    if (!browser || !browser.isConnected()) {
      return res.json({ status: 'disconnected', message: 'Browser not running' });
    }
    
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const isLoginForm = await page.$('input[name="username"]');
    if (isLoginForm) {
      return res.json({ status: 'disconnected', message: 'Needs manual login' });
    }
    
    return res.json({ status: 'connected', message: 'Logged in to Instagram' });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    await getBrowser();
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    
    // If username and password provided, attempt automated login
    if (username && password) {
      const isLoginForm = await page.$('input[name="username"]');
      if (isLoginForm) {
        await page.type('input[name="username"]', username, { delay: 100 });
        await page.type('input[name="password"]', password, { delay: 100 });
        
        await new Promise(r => setTimeout(r, 1000));
        
        const loginBtn = await page.$('button[type="submit"]');
        if (loginBtn) {
          await loginBtn.click();
          // Wait for navigation or error
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    
    return res.json({ success: true, message: 'Login process initiated. Check status.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scrape-followers', async (req, res) => {
  try {
    const { handle, maxCount = 50 } = req.body;
    if (!handle) return res.status(400).json({ error: 'Handle required' });
    
    await getBrowser();
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2' });
    
    const followersLinkSelector = `a[href="/${handle}/followers/"]`;
    await page.waitForSelector(followersLinkSelector, { timeout: 10000 });
    await page.click(followersLinkSelector);
    
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    
    let followers = new Set();
    
    while (followers.size < maxCount) {
      const newFollowers = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('div[role="dialog"] a'));
        return links
          .map(a => a.getAttribute('href'))
          .filter(href => href && href.startsWith('/') && href.split('/').length === 3)
          .map(href => href.replace(/\//g, ''));
      });
      
      newFollowers.forEach(f => {
        if (f !== handle) followers.add(f);
      });
      
      if (followers.size >= maxCount) break;
      
      const scrollResult = await page.evaluate(() => {
        const scrollableDiv = document.querySelector('div[role="dialog"] ._aano') || document.querySelector('div[role="dialog"] div[style*="overflow"]');
        if (scrollableDiv) {
          const oldScroll = scrollableDiv.scrollTop;
          scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
          return { scrolled: true, oldScroll, newScroll: scrollableDiv.scrollTop };
        }
        return { scrolled: false };
      });
      
      await new Promise(r => setTimeout(r, 1500));
      
      if (!scrollResult.scrolled || scrollResult.oldScroll === scrollResult.newScroll) {
        await new Promise(r => setTimeout(r, 2000));
        const checkScroll = await page.evaluate(() => {
          const div = document.querySelector('div[role="dialog"] ._aano') || document.querySelector('div[role="dialog"] div[style*="overflow"]');
          return div ? div.scrollTop : 0;
        });
        if (checkScroll === scrollResult.newScroll) break;
      }
    }
    
    await page.keyboard.press('Escape');
    const followerArray = Array.from(followers).slice(0, maxCount);
    
    return res.json({ success: true, count: followerArray.length, followers: followerArray });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-dm', async (req, res) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Username and message required' });
    
    await getBrowser();
    
    await page.goto(`https://www.instagram.com/direct/t/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Try to click "New Message" button (SVG with aria-label="New message")
    const newMsgBtn = await page.$('svg[aria-label="New message"]');
    if (newMsgBtn) {
      await newMsgBtn.click();
    } else {
      await page.goto('https://www.instagram.com/direct/new/', { waitUntil: 'networkidle2' });
    }
    
    await page.waitForSelector('input[name="queryBox"]', { timeout: 10000 });
    await page.type('input[name="queryBox"]', username, { delay: 100 });
    await new Promise(r => setTimeout(r, 3000));
    
    // We look for the first checkbox in the list and click it
    const firstCheckbox = await page.$('input[type="checkbox"]');
    if (firstCheckbox) {
      // Need to click the parent or label
      await page.evaluate(cb => cb.click(), firstCheckbox);
    } else {
      // Fallback: click the first matching username span
      const userEls = await page.$x(`//span[text()='${username}']`);
      if (userEls.length > 0) {
        await userEls[0].click();
      } else {
        throw new Error('User not found in search results');
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    const chatBtns = await page.$x(`//div[@role='button'][contains(., 'Chat')]`);
    if (chatBtns.length > 0) {
      await chatBtns[0].click();
    } else {
      const nextBtns = await page.$x(`//div[@role='button'][contains(., 'Next')]`);
      if (nextBtns.length > 0) await nextBtns[0].click();
    }
    
    await page.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });
    await page.type('div[contenteditable="true"]', message, { delay: 50 });
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    
    return res.json({ success: true, username });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Instagram Server running on http://localhost:${PORT}`);
});
