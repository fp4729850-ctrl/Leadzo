document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('account-status');
  const instructionsEl = document.getElementById('instructions');

  chrome.storage.local.get(['authToken', 'userDetails'], (res) => {
    if (res.authToken && res.userDetails) {
      const email = res.userDetails.email || 'Linked Account';
      statusEl.innerHTML = `<div class="dot green"></div> ${email}`;
      instructionsEl.innerHTML = `
        <div style="color: #10b981; margin-bottom: 8px;">✅ Extension is linked securely.</div>
        To connect an OTA to Leadzo AI, simply log into the platform in this browser. We will automatically sync your session cookies in the background.<br><br>
        Supported platforms:<br>
        • agoda.com<br>
        • airbnb.com<br>
        • goibibo.com
      `;
    }
  });
});
