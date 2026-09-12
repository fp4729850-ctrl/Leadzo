const SUPABASE_URL = 'https://stbqeiapgdaklktrlrjm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTYxODgsImV4cCI6MjA5OTI5MjE4OH0.dobxKtLAQ9iG82IpwBqjE_QVw0hqU1Jq28VblFet78g';

let authToken = null;
let userDetails = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LEADZO_AUTH_TOKEN') {
    authToken = message.token;
    userDetails = message.user;
    chrome.storage.local.set({ authToken, userDetails });
    console.log("Token securely saved from Leadzo!");
  }
});

chrome.storage.local.get(['authToken', 'userDetails'], (res) => {
  if (res.authToken) authToken = res.authToken;
  if (res.userDetails) userDetails = res.userDetails;
});

// Domain configurations
const SYNC_CONFIGS = [
  { domain: 'agoda.com', channelId: 'agoda' },
  { domain: 'airbnb.com', channelId: 'airbnb' },
  { domain: 'airbnb.co.in', channelId: 'airbnb' },
  { domain: 'goibibo.com', channelId: 'goibibo' },
  { domain: 'makemytrip.com', channelId: 'goibibo' } // MMT is grouped with Goibibo
];

// We don't want to spam the database, so we debounce the syncs
let syncTimeouts = {};

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (!authToken) return;

  const cookieDomain = changeInfo.cookie.domain;
  const config = SYNC_CONFIGS.find(c => cookieDomain.includes(c.domain));
  if (!config) return;

  const channelId = config.channelId;

  // Clear previous timeout
  if (syncTimeouts[channelId]) {
    clearTimeout(syncTimeouts[channelId]);
  }

  // Sync after 3 seconds of inactivity to batch changes
  syncTimeouts[channelId] = setTimeout(async () => {
    try {
      await syncCookiesToSupabase(config);
    } catch (err) {
      console.error("Failed to sync cookies for", channelId, err);
    }
  }, 3000);
});

async function syncCookiesToSupabase(config) {
  if (!authToken) return;
  const url = `https://.${config.domain}/`; // Get all cookies for the domain
  
  chrome.cookies.getAll({ domain: config.domain }, async (cookies) => {
    if (cookies.length === 0) return;
    
    // Convert Chrome cookies to Puppeteer cookie format
    const puppeteerCookies = cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expirationDate || -1,
      size: c.name.length + c.value.length,
      httpOnly: c.httpOnly,
      secure: c.secure,
      session: !c.expirationDate,
      sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite === 'unspecified' ? 'Lax' : c.sameSite)
    }));

    // Update in Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/hotel_channels?channel_id=eq.${config.channelId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        session_cookies: puppeteerCookies,
        status: 'connected',
        last_sync: 'Just now (Extension Synced ✅)'
      })
    });

    if (response.ok) {
      console.log(`✅ ${config.channelId} cookies synced to Supabase!`);
    } else {
      console.error(`❌ Failed to sync ${config.channelId} cookies:`, await response.text());
    }
  });
}
