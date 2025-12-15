# Puppeteer-Based IPO Scraper

## What Changed

The scraper now uses **Puppeteer** instead of manual HTML parsing with regex. This provides several advantages:

### Benefits of Puppeteer:

1. **Real Browser Rendering**: Puppeteer uses a real Chrome browser, so it can handle JavaScript-rendered content
2. **Better Selectors**: Uses actual DOM queries instead of regex pattern matching
3. **More Accurate Data**: Website-specific scrapers for each source (MoneyControl, Economic Times, etc.)
4. **Dynamic Content**: Can wait for content to load and handle AJAX requests
5. **Less Brittle**: More reliable than regex-based text parsing

## How It Works

### Proxy Server (`proxy-server.js`)
- Launches a headless Chrome browser on startup
- For each URL, opens a new page in the browser
- Executes website-specific scraping logic using `page.evaluate()`
- Returns structured JSON data with company names, dates, and other IPO details

### Website-Specific Scrapers
- **MoneyControl**: Looks for tables and `.ipo_box` elements
- **Economic Times**: Searches for `.ipo-card` and data tables
- **Business Standard**: Targets table rows and card elements
- **Chittorgarh**: Focuses on `table.table` elements
- **Generic**: Fallback scraper for unknown sites

### Frontend Actions (`iposcrapper.actions.jsx`)
- Processes structured data from Puppeteer instead of raw HTML
- Extracts dates, prices, and status from cell arrays
- Deduplicates IPO entries by company name

## Running the Scraper

1. **Start the proxy server**:
   ```bash
   node proxy-server.js
   ```
   
   You should see:
   ```
   ✅ Proxy server running on http://localhost:3001
   🌐 Initializing browser...
   🚀 Browser launched successfully
   ```

2. **Start the dev server** (in another terminal):
   ```bash
   npm run dev
   ```

3. **Navigate to the IPO Scraper page** in your app

## Technical Details

### Response Format
The Puppeteer proxy returns JSON:
```json
{
  "success": true,
  "url": "https://example.com",
  "ipos": [
    {
      "companyName": "ABC Ltd",
      "rawText": "Company info...",
      "cells": ["ABC Ltd", "10-Dec-2025", "12-Dec-2025", "₹100 Cr"]
    }
  ]
}
```

### Data Extraction
The frontend processes this structured data to extract:
- Company name (from `companyName` field)
- Dates (from cells array and text patterns)
- Issue size (from cells with currency symbols)
- Price range (from cells with ranges)
- Status (from keywords like "open", "upcoming", "closed")

## Troubleshooting

### Browser Launch Issues
If you see errors about Chrome not found:
```bash
# Install Chromium for Puppeteer
npx puppeteer browsers install chrome
```

### Memory Issues
If the server crashes, you can limit browser instances:
- The server reuses a single browser instance
- Each page is closed after scraping
- Browser is properly cleaned up on exit (Ctrl+C)

### Timeout Errors
Increased timeout to 60 seconds for Puppeteer operations. If still timing out:
- Check your internet connection
- The website might be slow or blocking requests
- Try scraping fewer URLs at once

## Performance

- Browser initialization: ~2-3 seconds
- Per-page scraping: ~3-5 seconds
- Total time depends on number of URLs and website response times
- Delays between requests (1.5s) help avoid rate limiting
