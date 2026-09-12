const express = require('express');
const cors = require('cors');
const { scrapeGoibibo } = require('./scraper');
const { scrapeAirbnb } = require('./airbnb_scraper');
const { scrapeAgoda } = require('./agoda_scraper');

const app = express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Access-Control-Request-Private-Network, *');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.all('/api/scrape', async (req, res) => {
    try {
        const channel = (req.body && req.body.channel) ? req.body.channel.toLowerCase() : 'goibibo';
        console.log(`\n🚀 Received scrape request for channel: ${channel}...`);
        
        let data;
        if (channel === 'airbnb') {
            data = await scrapeAirbnb(req.body || {});
        } else if (channel === 'agoda') {
            data = await scrapeAgoda(req.body || {});
        } else {
            data = await scrapeGoibibo(req.body || {});
        }

        // Directly forward the scraper response (ensuring array data is wrapped in { success: true, data })
        if (Array.isArray(data)) {
            res.json({ success: true, data: data });
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error("Scrape error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const { injectAllRoomsToGoibibo } = require('./goibibo_calendar_injector');

app.all('/api/goibibo/inject-calendar', async (req, res) => {
    try {
        console.log("\n⚡ [API] Triggering Goibibo Extranet iCal Auto-Injection...");
        const result = await injectAllRoomsToGoibibo(req.body || {});
        res.json(result);
    } catch (err) {
        console.error("Injection API Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n🟢 Goibibo Scraper API running on port ${PORT}`);
    console.log(`\nHow it works:`);
    console.log(`  1. Click "Sync Real Data" in Leadzo`);
    console.log(`  2. A Chrome window will open`);
    console.log(`  3. First time: Login via PHONE NUMBER (not Google)`);
    console.log(`  4. After login, cookies are saved automatically`);
    console.log(`  5. Next time: No login needed!\n`);
});
