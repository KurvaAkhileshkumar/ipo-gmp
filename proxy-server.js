// Puppeteer-based scraping proxy - Run this separately: node proxy-server.js
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
app.use(cors());
app.use(express.json());

let browser = null;

// Initialize browser on startup
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });
        console.log('🚀 Browser launched successfully');
    }
    return browser;
}

// Scrape IPO data using Puppeteer
async function scrapeWithPuppeteer(url, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let page = null;
        try {
            const browserInstance = await initBrowser();
            page = await browserInstance.newPage();
            
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Navigate to URL
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            // Wait for content to load using Promise-based delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Extract IPO data based on the website
            let ipos = [];
            
            if (url.includes('groww.in')) {
                ipos = await scrapeGroww(page);
            } else if (url.includes('zerodha.com')) {
                ipos = await scrapeZerodha(page);
            } else if (url.includes('kotaksecurities.com')) {
                ipos = await scrapeKotak(page);
            } else if (url.includes('axisdirect.in')) {
                ipos = await scrapeAxis(page);
            } else if (url.includes('hdfcsec.com')) {
                ipos = await scrapeHDFC(page);
            } else if (url.includes('sbisecurities.in')) {
                ipos = await scrapeSBI(page);
            } else if (url.includes('sharescart.com')) {
                ipos = await scrapeSharesCart(page);
            } else if (url.includes('motilaloswal.com')) {
                ipos = await scrapeMotilalOswal(page);
            } else if (url.includes('screener.in')) {
                ipos = await scrapeScreener(page);
            } else if (url.includes('moneycontrol.com')) {
                ipos = await scrapeMoneyControl(page);
            } else if (url.includes('economictimes.indiatimes.com')) {
                ipos = await scrapeEconomicTimes(page);
            } else if (url.includes('business-standard.com')) {
                ipos = await scrapeBusinessStandard(page);
            } else if (url.includes('chittorgarh.com')) {
                ipos = await scrapeChittorgarh(page);
            } else {
                // Generic scraping
                ipos = await scrapeGeneric(page);
            }
            
            await page.close();
            return { success: true, ipos, url };
            
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed for ${url}:`, error.message);
            
            if (page) {
                await page.close().catch(() => {});
            }
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
    }
}

// Validate if text is a valid company name
function isValidCompanyName(name) {
    if (!name || name.length < 3) return false;
    const lowerName = name.toLowerCase().trim();
    const invalidWords = ['apply now', 'view all', 'check', 'click here', 'read more', 'subscribe', 
        'details', 'more info', 'learn more', 'bid now', 'know more', 'company name', 'ipo name',
        'view details', 'see all', 'show more', 'load more'];
    if (invalidWords.some(word => lowerName === word || lowerName.includes(word))) return false;
    if (!/[a-zA-Z]/.test(name)) return false;
    if (/^\d+$/.test(name)) return false;
    return true;
}

// MoneyControl scraper
async function scrapeMoneyControl(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const tables = document.querySelectorAll('table, .ipo_box, .table-responsive');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr, .ipo-item');
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td, th, .ipo-detail'));
                if (cells.length >= 3) {
                    const text = cells.map(c => c.textContent.trim()).join(' | ');
                    
                    // Try to extract structured data
                    const companyElement = row.querySelector('.company_name, .ipo-name, a[href*="ipo"]');
                    const companyName = companyElement ? companyElement.textContent.trim() : '';
                    
                    if (companyName && isValid(companyName) && !text.match(/^(Company|Name|IPO|Sr)/i)) {
                        const isSME = text.toLowerCase().includes('sme') || 
                                     text.toLowerCase().includes('emerge') ||
                                     row.classList.contains('sme') ||
                                     row.querySelector('.sme, [class*="sme"]');
                        ipos.push({
                            companyName,
                            rawText: text,
                            cells: cells.map(c => c.textContent.trim()),
                            isSME: isSME
                        });
                    }
                }
            });
        });
        
        return ipos;
    });
}

// Economic Times scraper
async function scrapeEconomicTimes(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const selectors = ['table tr', '.ipo-card', '.artData', '.dataTable tbody tr'];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent.trim();
                const link = el.querySelector('a');
                const companyName = link ? link.textContent.trim() : '';
                
                if (companyName && isValid(companyName) && text.length > 20) {
                    const cells = Array.from(el.querySelectorAll('td, th'));
                    const isSME = text.toLowerCase().includes('sme') || 
                                 text.toLowerCase().includes('emerge') ||
                                 el.classList.contains('sme');
                    ipos.push({
                        companyName,
                        rawText: text,
                        cells: cells.map(c => c.textContent.trim()),
                        isSME: isSME
                    });
                }
            });
        });
        
        return ipos;
    });
}

// Business Standard scraper
async function scrapeBusinessStandard(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const rows = document.querySelectorAll('table tr, .card-ipo');
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length >= 3) {
                const text = cells.map(c => c.textContent.trim()).join(' | ');
                const link = row.querySelector('a');
                const companyName = link ? link.textContent.trim() : cells[0]?.textContent.trim();
                
                if (companyName && isValid(companyName) && !text.match(/^(Company|Name|IPO|Sr)/i)) {
                    const isSME = text.toLowerCase().includes('sme') || 
                                 text.toLowerCase().includes('emerge') ||
                                 row.classList.contains('sme');
                    ipos.push({
                        companyName,
                        rawText: text,
                        cells: cells.map(c => c.textContent.trim()),
                        isSME: isSME
                    });
                }
            }
        });
        
        return ipos;
    });
}

// Chittorgarh scraper
async function scrapeChittorgarh(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const tables = document.querySelectorAll('table.table');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length >= 4) {
                    const companyName = cells[0]?.textContent.trim() || cells[1]?.textContent.trim();
                    const text = cells.map(c => c.textContent.trim()).join(' | ');
                    
                    if (companyName && isValid(companyName) && companyName.length > 2) {
                        const isSME = text.toLowerCase().includes('sme') || 
                                     text.toLowerCase().includes('emerge') ||
                                     row.classList.contains('sme');
                        ipos.push({
                            companyName,
                            rawText: text,
                            cells: cells.map(c => c.textContent.trim()),
                            isSME: isSME
                        });
                    }
                }
            });
        });
        
        return ipos;
    });
}

// Groww scraper
async function scrapeGroww(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const cards = document.querySelectorAll('.ipo-card, [class*="ipoCard"], .bodyCard87, div[class*="card"]');
        
        cards.forEach(card => {
            const nameEl = card.querySelector('h3, h4, .ipo-name, [class*="name"], a');
            const companyName = nameEl ? nameEl.textContent.trim() : '';
            const text = card.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const cells = Array.from(card.querySelectorAll('div, span, p'));
                const isSME = text.toLowerCase().includes('sme') || window.location.href.includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// Zerodha scraper
async function scrapeZerodha(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const selectors = ['table tr', '.ipo-item', 'article', '[class*="ipo"]'];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const nameEl = el.querySelector('h2, h3, strong, .company-name, a');
                const companyName = nameEl ? nameEl.textContent.trim() : '';
                const text = el.textContent.trim();
                
                if (companyName && isValid(companyName) && text.length > 20) {
                    const cells = Array.from(el.querySelectorAll('td, div, span'));
                    const isSME = text.toLowerCase().includes('sme');
                    ipos.push({
                        companyName,
                        rawText: text,
                        cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                        isSME: isSME
                    });
                }
            });
        });
        
        return ipos;
    });
}

// Kotak Securities scraper
async function scrapeKotak(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const rows = document.querySelectorAll('table tr, .ipo-list-item, [class*="ipoCard"]');
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, div'));
            const nameEl = row.querySelector('a, strong, .name, h3, h4');
            const companyName = nameEl ? nameEl.textContent.trim() : cells[0]?.textContent.trim();
            const text = row.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// Axis Direct scraper
async function scrapeAxis(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const items = document.querySelectorAll('table tr, .offering-card, [class*="ipo"]');
        
        items.forEach(item => {
            const nameEl = item.querySelector('h3, h4, strong, a, .title');
            const companyName = nameEl ? nameEl.textContent.trim() : '';
            const text = item.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const cells = Array.from(item.querySelectorAll('td, div, span'));
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// HDFC Securities scraper
async function scrapeHDFC(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const cards = document.querySelectorAll('table tr, .ipo-box, .product-card, [class*="ipo"]');
        
        cards.forEach(card => {
            const nameEl = card.querySelector('h3, h4, a, strong, .name');
            const companyName = nameEl ? nameEl.textContent.trim() : '';
            const text = card.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const cells = Array.from(card.querySelectorAll('td, div, span'));
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// SBI Securities scraper
async function scrapeSBI(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const items = document.querySelectorAll('table tr, .ipo-card, [class*="ipo"]');
        
        items.forEach(item => {
            const nameEl = item.querySelector('a, h3, h4, strong, .company');
            const companyName = nameEl ? nameEl.textContent.trim() : '';
            const text = item.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const cells = Array.from(item.querySelectorAll('td, div'));
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// SharesCart scraper
async function scrapeSharesCart(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const rows = document.querySelectorAll('table tr, .ipo-item, [class*="ipo"]');
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const nameEl = row.querySelector('a, strong, .name');
            const companyName = nameEl ? nameEl.textContent.trim() : cells[0]?.textContent.trim();
            const text = row.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// Motilal Oswal scraper
async function scrapeMotilalOswal(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const items = document.querySelectorAll('table tr, .ipo-card, [class*="ipo"]');
        
        items.forEach(item => {
            const nameEl = item.querySelector('a, h3, h4, strong');
            const companyName = nameEl ? nameEl.textContent.trim() : '';
            const text = item.textContent.trim();
            
            if (companyName && isValid(companyName)) {
                const cells = Array.from(item.querySelectorAll('td, div'));
                const isSME = text.toLowerCase().includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// Screener.in scraper
async function scrapeScreener(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const rows = document.querySelectorAll('table tbody tr, .ipo-row');
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const nameEl = row.querySelector('a, .name');
            const companyName = nameEl ? nameEl.textContent.trim() : cells[0]?.textContent.trim();
            const text = row.textContent.trim();
            
            if (companyName && isValid(companyName) && cells.length >= 2) {
                const isSME = text.toLowerCase().includes('sme') || window.location.href.includes('sme');
                ipos.push({
                    companyName,
                    rawText: text,
                    cells: cells.map(c => c.textContent.trim()),
                    isSME: isSME
                });
            }
        });
        
        return ipos;
    });
}

// Generic scraper for unknown sites
async function scrapeGeneric(page) {
    return await page.evaluate(() => {
        const isValid = (name) => {
            if (!name || name.length < 3) return false;
            const lower = name.toLowerCase().trim();
            const invalid = ['apply now', 'view all', 'check', 'click', 'read more', 'subscribe', 'details', 'bid now'];
            return !invalid.some(word => lower === word || lower.includes(word)) && /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        };
        
        const ipos = [];
        const selectors = [
            'table tr',
            '.ipo-card',
            '.ipo_box',
            '[class*="ipo"]',
            'article'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 50 && text.length < 2000) {
                    const cells = Array.from(el.querySelectorAll('td, th, div'));
                    const link = el.querySelector('a');
                    const companyName = link ? link.textContent.trim() : cells[0]?.textContent.trim();
                    
                    if (companyName && isValid(companyName)) {
                        const isSME = text.toLowerCase().includes('sme') || 
                                     text.toLowerCase().includes('emerge') ||
                                     el.classList.contains('sme');
                        ipos.push({
                            companyName,
                            rawText: text.substring(0, 300),
                            cells: cells.slice(0, 10).map(c => c.textContent.trim()),
                            isSME: isSME
                        });
                    }
                }
            });
        });
        
        return ipos;
    });
}

app.get('/proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`📥 Scraping with Puppeteer: ${url}`);

    try {
        const result = await scrapeWithPuppeteer(url);
        
        console.log(`✅ Successfully scraped ${url} - Found ${result.ipos.length} IPOs`);
        res.json(result);
        
    } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error.message);
        
        let errorMessage = error.message;
        if (error.message.includes('timeout')) {
            errorMessage = 'Request timeout - website took too long to load';
        } else if (error.message.includes('net::ERR')) {
            errorMessage = 'Connection error - website may be down or blocking requests';
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            url
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
    console.log(`✅ Proxy server running on http://localhost:${PORT}`);
    console.log(`📝 Usage: http://localhost:${PORT}/proxy?url=YOUR_URL`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log(`🌐 Initializing browser...`);
    try {
        await initBrowser();
    } catch (error) {
        console.error('❌ Failed to initialize browser:', error.message);
        process.exit(1);
    }
});

// Graceful shutdown handler
async function shutdown() {
    console.log('\n🛑 Shutting down gracefully...');
    
    if (browser) {
        try {
            await browser.close();
            console.log('✅ Browser closed');
        } catch (error) {
            console.error('Error closing browser:', error.message);
        }
    }
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('❌ Forced shutdown');
        process.exit(1);
    }, 10000);
}

// Handle different termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
