const express = require('express');
const cors = require('cors');
const { scrapeGoibibo } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

app.all('/api/scrape', async (req, res) => {
    try {
        console.log("\n🚀 Received scrape request...");
        const data = await scrapeGoibibo(req.body || {});
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
