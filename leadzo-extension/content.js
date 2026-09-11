function extractToken() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            chrome.runtime.sendMessage({
              type: 'LEADZO_AUTH_TOKEN',
              token: parsed.access_token,
              user: parsed.user
            });
            return true;
          }
        } catch (e) {}
      }
    }
  }
  return false;
}

// Extract on load
let found = extractToken();

// Listen to storage changes in case they log in later
window.addEventListener('storage', () => {
  extractToken();
});

// Also poll for a few seconds just in case it's set immediately after load
if (!found) {
  let attempts = 0;
  const interval = setInterval(() => {
    if (extractToken() || attempts > 10) {
      clearInterval(interval);
    }
    attempts++;
  }, 1000);
}
