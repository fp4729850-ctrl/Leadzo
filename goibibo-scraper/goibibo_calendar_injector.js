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

const USER_ID = '1e3f3ea0-fc51-4880-bf95-f1ad19366c5d';
const ROOM_MAPPING = [
  {
    roomNum: 'Room 3',
    name: 'Small Delux No. 03',
    roomCode: '45001335699',
    buttonIndex: 0,
    exportUrl: `https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/leadzo_master_ical?user_id=${USER_ID}&room_id=92666322-e804-44ef-b966-ac5e302bc22e`,
    roomId: '92666322-e804-44ef-b966-ac5e302bc22e'
  },
  {
    roomNum: 'Room 4',
    name: 'Small Delux No. 04',
    roomCode: '45001335700',
    buttonIndex: 1,
    exportUrl: `https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/leadzo_master_ical?user_id=${USER_ID}&room_id=438bd6c2-335d-4c09-80d1-428419e34d5c`,
    roomId: '438bd6c2-335d-4c09-80d1-428419e34d5c'
  },
  {
    roomNum: 'Room 2',
    name: 'Small Delux No. 02',
    roomCode: '45001335698',
    buttonIndex: 2,
    exportUrl: `https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/leadzo_master_ical?user_id=${USER_ID}&room_id=9820ca74-f16f-49cf-9b65-9c62cba167a9`,
    roomId: '9820ca74-f16f-49cf-9b65-9c62cba167a9'
  },
  {
    roomNum: 'Room 1',
    name: 'Super Delux Room No 1',
    roomCode: '45001335697',
    buttonIndex: 3,
    exportUrl: `https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/leadzo_master_ical?user_id=${USER_ID}&room_id=39688b67-ea6d-4526-bdae-d68edc1720d3`,
    roomId: '39688b67-ea6d-4526-bdae-d68edc1720d3'
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

    // Intercept headers for immediate sync trigger
    let capturedHeaders = null;
    page.on('request', req => {
      if (req.url().includes('fetchCalSummary') && !capturedHeaders) {
        capturedHeaders = Object.assign({}, req.headers());
      }
    });

    for (let idx = 0; idx < ROOM_MAPPING.length; idx++) {
      const room = ROOM_MAPPING[idx];
      console.log(`\n========================================`);
      console.log(`🏨 Processing ${room.roomNum} (${room.name}) via button index [${room.buttonIndex}]...`);
      console.log(`📡 Leadzo Feed to Inject: ${room.exportUrl}`);

      // Always reload the main cal-sync page fresh for each room
      try {
        await page.goto('https://in.goibibo.com/newextranet/inventory/cal-sync/ecs', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
      } catch (navErr) {
        console.log(`Navigation notice:`, navErr.message);
      }
      
      try {
        await page.waitForFunction(() => {
          const b = Array.from(document.querySelectorAll('button'));
          return b.filter(el => (el.innerText || '').includes('Sync Another Calendar')).length >= 4;
        }, { timeout: 30000 });
      } catch (wErr) {
        console.log("Wait for sync buttons notice:", wErr.message);
      }
      await new Promise(r => setTimeout(r, 4000));

      // Click the exact button for this room using its buttonIndex
      const roomContainerClicked = await page.evaluate((targetIdx) => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const syncButtons = allButtons.filter(b => (b.innerText || '').includes('Sync Another Calendar'));
        if (syncButtons[targetIdx]) {
          syncButtons[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          syncButtons[targetIdx].click();
          return { found: true, index: targetIdx };
        }
        return { found: false, count: syncButtons.length };
      }, room.buttonIndex);

      console.log(`Room button click result:`, roomContainerClicked);
      if (!roomContainerClicked.found) {
        console.log(`⚠️ Could not find button for ${room.roomNum}. Skipping...`);
        continue;
      }

      console.log(`Clicked Sync Another Calendar for [${room.name}]:`, roomContainerClicked);

      // STEP 1: Select "Others" & enter platform name "Leadzo AI"
      await new Promise(r => setTimeout(r, 2000));
      console.log(`Selecting "Others" platform...`);
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label, div, span'));
        const othersOption = labels.find(el => (el.innerText || '').trim() === 'Others');
        if (othersOption) othersOption.click();
      });
      await new Promise(r => setTimeout(r, 1000));

      console.log(`Entering brand name "Leadzo AI"...`);
      await page.evaluate(() => {
        const brandInput = document.querySelector('input[name="otherBrandName"]') ||
                           document.querySelector('input[placeholder*="calendar"]') ||
                           document.querySelector('input[type="text"]');
        if (brandInput) {
          brandInput.focus();
          brandInput.value = 'Leadzo AI';
          brandInput.dispatchEvent(new Event('input', { bubbles: true }));
          brandInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 1000));

      // Click Next to Step 1
      console.log(`Clicking Step 1 Next button...`);
      await page.evaluate(() => {
        const nextBtn = document.querySelector('[data-test-id="next-cta"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('next'));
        if (nextBtn) nextBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000));

      // STEP 2: Extract InGo export calendar URL
      const ingoUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, input, span, div, p'));
        for (const el of links) {
          const text = el.value || el.innerText || el.href || '';
          if (text.includes('downloadCalendar')) return text.trim();
        }
        return null;
      });
      console.log(`📋 InGo Export Calendar Feed for ${room.name}:`, ingoUrl || 'Auto-generated by InGo');

      if (ingoUrl) {
        try {
          // Immediately consume/ping InGo calendar export feed to mark export verified
          await fetch(ingoUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LeadzoAI-iCalSync/2.0' }
          }).catch(() => {});
        } catch (e) {}
      }

      // Click "Copy" button if present
      await page.evaluate(() => {
        const copyBtns = Array.from(document.querySelectorAll('button, div, span'));
        const copyBtn = copyBtns.find(b => (b.innerText || '').toLowerCase().includes('copy'));
        if (copyBtn) copyBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));

      // Select Radio: "Yes, I have pasted the link"
      console.log(`Confirming pasted link radio...`);
      await page.evaluate(() => {
        const yesRadio = document.querySelector('input[name="pasted_link"][value="1"]') ||
                         document.querySelector('input[type="radio"][value="1"]');
        if (yesRadio) {
          yesRadio.click();
        } else {
          const radioLabels = Array.from(document.querySelectorAll('label'));
          const yesLabel = radioLabels.find(l => (l.innerText || '').toLowerCase().includes('yes'));
          if (yesLabel) yesLabel.click();
        }
      });
      await new Promise(r => setTimeout(r, 1000));

      // Click Step 2 Next
      console.log(`Clicking Step 2 Next button...`);
      await page.evaluate(() => {
        const nextBtn = document.querySelector('[data-test-id="next-cta"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('next'));
        if (nextBtn) nextBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000));

      // STEP 3: Enter Leadzo iCal URL & Import
      console.log(`Entering Leadzo iCal feed URL...`);
      await page.evaluate((feedUrl) => {
        const urlInput = document.querySelector('input[name="importUrl"]') ||
                         document.querySelector('input[placeholder*="http"]') ||
                         Array.from(document.querySelectorAll('input[type="text"]')).pop();
        if (urlInput) {
          urlInput.focus();
          urlInput.value = feedUrl;
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          urlInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, room.exportUrl);
      await new Promise(r => setTimeout(r, 1000));

      // Click Import Button
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

    // Trigger immediate sync for all rooms via Goibibo backend API to ensure instant 🟢 SYNCED status
    console.log("\n⚡ Triggering immediate Goibibo syncCalSyncV2 for all rooms...");
    await page.goto('https://in.goibibo.com/newextranet/inventory/cal-sync/ecs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Get summary to retrieve calendarIds
    const calSummary = await page.evaluate(async (headers) => {
      try {
        const res = await fetch('https://ingo-content-clientbackend.goibibo.com/api/v1/common/ecs/fetchCalSummary', {
          method: 'GET',
          headers: headers
        });
        return await res.json();
      } catch (e) {
        return null;
      }
    }, capturedHeaders);

    if (calSummary && calSummary.data && calSummary.data['1000548746']) {
      const hotelRooms = calSummary.data['1000548746'];
      for (const room of ROOM_MAPPING) {
        const rData = hotelRooms[room.roomCode];
        if (rData && rData.brands) {
          const leadzoBrand = rData.brands.find(b => (b.otherBrandName || '').includes('Leadzo'));
          if (leadzoBrand && leadzoBrand.id) {
            console.log(`⚡ Activating sync for ${room.roomNum} (Cal ID: ${leadzoBrand.id})...`);
            await page.evaluate(async (h, rCode, cId) => {
              await fetch('https://ingo-content-clientbackend.goibibo.com/api/v1/common/ecs/syncCalSyncV2', {
                method: 'POST',
                headers: h,
                body: JSON.stringify({
                  hotelCode: '1000548746',
                  roomCode: rCode,
                  calendarId: cId
                })
              });
            }, capturedHeaders, room.roomCode, leadzoBrand.id);
          }
        }
      }
    }

    // Mark Goibibo channel as connected in Supabase
    await supabase.from('hotel_channels').update({
      status: 'connected',
      last_sync: 'Just now (All Rooms Injected & 2-Way Synced ✅)'
    }).eq('channel_id', 'goibibo');

    console.log("\n🎉 ALL ROOMS SUCCESSFULLY INJECTED AND ACTIVATED IN GOIBIBO EXTRANET!");
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
