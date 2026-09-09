const express = require('express');
const cors = require('cors');
const { scrapeGoibibo } = require('./scraper');

const app = express();
app.use(cors());

app.get('/api/scrape', async (req, res) => {
    try {
        console.log("Received request to scrape Goibibo...");
        const data = await scrapeGoibibo();
        
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Goibibo Scraper API running on http://localhost:${PORT}`);
});
