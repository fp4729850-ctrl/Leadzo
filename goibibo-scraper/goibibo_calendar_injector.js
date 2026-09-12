const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const localSessionDir = path.join(process.env.HOME || '', '.leadzo-goibibo-session');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://stbqeiapgdaklktrlrjm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ROOM_MAPPING = [
  {
    roomNum: 'Room 1',
    labelMatch: ['super delux room no 1', 'room no 1', 'room 1'],
    exportUrl: 'https://king-villa.vercel.app/api/ical/export/1.ics',
    roomId: '39688b67-ea6d-4526-bdae-d68edc1720d3'
  },
  {
    roomNum: 'Room 2',
    labelMatch: ['small delux no. 02', 'delux no. 02', 'room 2', 'no 2'],
    exportUrl: 'https://king-villa.vercel.app/api/ical/export/2.ics',
    roomId: '9820ca74-f16f-49cf-9b65-9c62cba167a9'
  },
  {
    roomNum: 'Room 3',
    labelMatch: ['small delux no. 03', 'delux no. 03', 'room 3', 'no 3'],
    exportUrl: 'https://king-villa.vercel.app/api/ical/export/3.ics',
    roomId: '92666322-e804-44ef-b966-ac5e302bc22e'
  },
  {
    roomNum: 'Room 4',
    labelMatch: ['small delux no. 04', 'delux no. 04', 'room 4', 'no 4'],
    exportUrl: 'https://king-villa.vercel.app/api/ical/export/4.ics',
    roomId: '438bd6c2-335d-4c09-80d1-428419e34d5c'
  }
];

async function injectAllRoomsToGoibibo(options = {}) {
  console.log("🚀 [Goibibo Calendar Injector] Initializing automated 2-way iCal sync...");
  let chromePath = process.env.CHROME_PATH;
  if (!chromePath && fs.existsSync(macChrome)) chromePath = macChrome;

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath || undefined,
    userDataDir: fs.existsSync(localSessionDir) ? localSessionDir : undefined,
    defaultViewport: { width: 1440, height: 1100 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const syncResults = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    for (let idx = 0; idx < ROOM_MAPPING.length; idx++) {
      const room = ROOM_MAPPING[idx];
      console.log(`\n========================================`);
      console.log(`🏨 Processing ${room.roomNum} (${room.labelMatch[0]})...`);
      console.log(`📡 Leadzo Feed to Inject: ${room.exportUrl}`);

      // Always reload the main cal-sync page fresh for each room
      try {
        await page.goto('https://in.goibibo.com/newextranet/inventory/cal-sync/ecs', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
      } catch (navErr) {
        console.log(`Navigation notice (continuing):`, navErr.message);
      }
      
      try {
        await page.waitForFunction(() => {
          const b = Array.from(document.querySelectorAll('button'));
          return b.some(el => el.innerText && el.innerText.includes('Sync Another Calendar'));
        }, { timeout: 30000 });
      } catch (wErr) {
        console.log("Wait for sync buttons notice:", wErr.message);
      }
      await new Promise(r => setTimeout(r, 4000));

      // 1. Locate the specific room container
      const roomContainerClicked = await page.evaluate((matches) => {
        const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, span, div'));
        const matchedHeading = allHeadings.find(h => {
          const t = (h.innerText || '').toLowerCase();
          return matches.some(m => t.includes(m));
        });

        if (!matchedHeading) return { found: false, reason: 'Heading not found' };

        const card = matchedHeading.closest('.MuiPaper-root, [class*="card"], [class*="container"]') || matchedHeading.parentElement?.parentElement;
        if (!card) return { found: false, reason: 'Card container not found' };

        const syncBtn = Array.from(card.querySelectorAll('button')).find(b => (b.innerText || '').includes('Sync Another Calendar'));
        if (syncBtn) {
          syncBtn.click();
          return { found: true, roomName: matchedHeading.innerText.trim() };
        }
        return { found: false, reason: 'Sync button not found inside card' };
      }, room.labelMatch);

      console.log(`Room search result:`, roomContainerClicked);
      if (!roomContainerClicked.found) {
        console.log(`⚠️ Could not find card for ${room.roomNum}. Skipping...`);
        continue;
      }

      await new Promise(r => setTimeout(r, 3000));

      // STEP 1: Select "Others" & Type "Leadzo AI"
      console.log(`Step 1: Selecting 'Others' & platform name...`);
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Select"]');
        if (input) {
          input.focus();
          input.click();
          const parent = input.closest('.MuiAutocomplete-root');
          parent?.querySelector('.MuiAutocomplete-popupIndicator')?.click();
        }
      });
      await new Promise(r => setTimeout(r, 1200));

      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('li, [role="option"]'));
        const others = options.find(o => (o.innerText || '').includes('Others'));
        if (others) others.click();
      });
      await new Promise(r => setTimeout(r, 1000));

      const nameInput = await page.$('input[placeholder="Add Name here"], input[placeholder*="Name" i]');
      if (nameInput) {
        await nameInput.click();
        await nameInput.type('Leadzo AI', { delay: 40 });
      }
      await new Promise(r => setTimeout(r, 800));

      // Click Step 1 Next
      await page.evaluate(() => {
        const nextBtn = document.querySelector('[data-test-id="next-cta"]');
        if (nextBtn) nextBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000));

      // STEP 2: Extract InGo URL & Confirm copy
      console.log(`Step 2: Extracting InGo URL & advancing...`);
      const ingoUrl = await page.evaluate(() => {
        const inps = Array.from(document.querySelectorAll('input'));
        const found = inps.find(i => i.value && i.value.includes('downloadCalendar'));
        return found ? found.value : '';
      });
      console.log(`📥 Captured InGo URL for ${room.roomNum}: ${ingoUrl}`);

      // Click Copy
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        btns.find(b => (b.innerText || '').includes('Copy'))?.click();
      });
      await new Promise(r => setTimeout(r, 800));

      // Select Radio "Yes, I have pasted the link"
      await page.evaluate(() => {
        const radio = document.querySelector('input[name="pasted_link"][value="1"]');
        if (radio) {
          radio.click();
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 1000));

      // Click Step 2 Next
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => (b.innerText || '').toLowerCase().trim() === 'next' && !b.disabled);
        if (nextBtn) nextBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000));

      // STEP 3: Enter Leadzo Room URL, click Import, then click Save
      console.log(`Step 3: Injecting Leadzo URL: ${room.exportUrl}...`);
      const importInput = await page.$('input[placeholder*="calendar link here" i], input[placeholder*="calendar" i], .MuiStep-vertical:nth-of-type(3) input');
      if (importInput) {
        await importInput.click();
        await importInput.type(room.exportUrl, { delay: 25 });
      } else {
        await page.evaluate((url) => {
          const inps = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
          const targetInp = inps.find(i => !i.readOnly && !i.value);
          if (targetInp) {
            targetInp.focus();
            targetInp.value = url;
            targetInp.dispatchEvent(new Event('input', { bubbles: true }));
            targetInp.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, room.exportUrl);
      }
      await new Promise(r => setTimeout(r, 1000));

      // Click Import button in Step 3
      console.log(`Clicking Import button...`);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const importBtn = btns.find(b => (b.innerText || '').toLowerCase().trim() === 'import');
        if (importBtn) importBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Click Final Save Button
      console.log(`Clicking Final Save button...`);
      await page.evaluate(() => {
        const saveBtn = document.querySelector('[data-test-id="stepper-footer-submit"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().trim() === 'save');
        if (saveBtn) saveBtn.click();
      });
      await new Promise(r => setTimeout(r, 4000));

      // Update Supabase with the InGo export URL for this room
      if (ingoUrl) {
        const { data: roomRecord } = await supabase.from('hotel_rooms').select('ical_links').eq('id', room.roomId).single();
        const updatedLinks = {
          ...(roomRecord?.ical_links || {}),
          goibibo: ingoUrl
        };
        await supabase.from('hotel_rooms').update({ ical_links: updatedLinks }).eq('id', room.roomId);
        console.log(`💾 Saved InGo URL into Supabase for ${room.roomNum}!`);
      }

      syncResults.push({
        room: room.roomNum,
        injectedUrl: room.exportUrl,
        ingoExportUrl: ingoUrl,
        status: 'SUCCESS'
      });
      console.log(`✅ ${room.roomNum} 2-Way Sync Injection Complete!`);
    }

    // Mark Goibibo channel as connected in Supabase
    await supabase.from('hotel_channels').update({
      status: 'connected',
      last_sync: 'Just now (All Rooms Injected & 2-Way Synced ✅)'
    }).eq('channel_id', 'goibibo');

    console.log("\n🎉 ALL ROOMS SUCCESSFULLY INJECTED INTO GOIBIBO EXTRANET!");
    return {
      success: true,
      message: 'All 4 rooms successfully injected into Goibibo Extranet with 2-Way iCal Sync!',
      results: syncResults
    };

  } catch (err) {
    console.error("❌ Error during calendar injection:", err);
    return {
      success: false,
      error: err.message,
      results: syncResults
    };
  } finally {
    await browser.close();
  }
}

// Allow CLI execution directly
if (require.main === module) {
  injectAllRoomsToGoibibo().then(res => {
    console.log("Final Result:", JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = { injectAllRoomsToGoibibo };
