const express = require('express');
const cors = require('cors');
const { scrapeGoibibo } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/scrape', async (req, res) => {
    try {
        console.log("Received request to scrape Goibibo...");
        const cookies = req.body.cookies;
        
        if (!cookies || !Array.isArray(cookies)) {
            return res.status(400).json({ success: false, error: "Missing or invalid cookies in request body. Please export your Goibibo cookies and pass them." });
        }

        const data = await scrapeGoibibo(cookies);
        
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Cloud Goibibo Scraper API running on port ${PORT}`);
});
