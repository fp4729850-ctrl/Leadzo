const express = require('express');
const cors = require('cors');
const { scrapeGoibibo } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Accept both GET and POST - no cookies needed anymore since we connect to real Chrome
app.all('/api/scrape', async (req, res) => {
    try {
        console.log("Received request to scrape Goibibo...");
        const data = await scrapeGoibibo();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Goibibo Scraper API running on port ${PORT}`);
    console.log(`\n⚠️  IMPORTANT: Make sure Chrome is running with remote debugging:`);
    console.log(`   Close ALL Chrome windows first, then run:`);
    console.log(`   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n`);
});
