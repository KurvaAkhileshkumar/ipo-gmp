import axiosInstance from '../../interceptor';

const scrappingurls = [
    // 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    'https://groww.in/ipo',
    'https://groww.in/ipo/mainboard',
    'https://groww.in/ipo/sme',
    'https://zerodha.com/ipo/',
    'https://www.kotaksecurities.com/ipo/',
    'https://simplehai.axisdirect.in/offerings/products/ipo',
    'https://www.hdfcsec.com/offering/ipo-product',
    'https://www.sbisecurities.in/products/ipo-initial-public-offerings',
    'https://www.sharescart.com/ipo/',
    'https://www.motilaloswal.com/ipos',
    'https://www.screener.in/ipo/',
    'https://www.screener.in/ipo/recent/',
    'https://www.screener.in/ipo/below-price/',
    'https://www.screener.in/ipo/rights/',
    'https://www.moneycontrol.com/ipo/',
    'https://www.moneycontrol.com/ipo/open-ipos/',
    'https://www.moneycontrol.com/ipo/upcoming-ipos/',
    'https://www.moneycontrol.com/ipo/closed-ipos/',
    'https://www.moneycontrol.com/ipo/listed-ipos/',
    'https://economictimes.indiatimes.com/markets/ipo',
    'https://www.business-standard.com/markets/ipo',
    'https://www.chittorgarh.com/ipo/ipo_dashboard.asp',
    'https://www.chittorgarh.com/ipo/ipo_dashboard.asp?a=sme',
];

// Check if a name is a valid company name (not UI text)
const isValidCompanyName = (name) => {
    if (!name || name.length < 3) return false;
    
    const lowerName = name.toLowerCase().trim();
    
    // Common UI elements and buttons to exclude
    const invalidPatterns = [
        'apply now', 'view all', 'check', 'click here', 'read more',
        'subscribe', 'details', 'more info', 'learn more', 'get started',
        'sign up', 'login', 'register', 'submit', 'continue', 'next',
        'previous', 'back', 'home', 'menu', 'close', 'open', 'cancel',
        'search', 'filter', 'sort', 'download', 'share', 'print',
        'company name', 'ipo name', 'name', 'issue', 'status', 'date',
        'view details', 'bid now', 'know more', 'explore', 'see all',
        'show more', 'load more', 'expand', 'collapse', 'toggle'
    ];
    
    // Check if name matches any invalid pattern
    if (invalidPatterns.some(pattern => lowerName === pattern || lowerName.includes(pattern))) {
        return false;
    }
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    
    // Should not be all numbers
    if (/^\d+$/.test(name)) return false;
    
    // Should not be just special characters
    if (!/[a-zA-Z0-9]/.test(name)) return false;
    
    // Too short after removing spaces
    if (name.replace(/\s/g, '').length < 3) return false;
    
    return true;
};

// Extract IPO details from cells array and text
const extractIPOData = (rawData) => {
    const text = rawData.rawText || '';
    const cells = rawData.cells || [];
    const companyName = rawData.companyName || '';
    
    const data = {
        companyName,
        openDate: '',
        closeDate: '',
        listingDate: '',
        issueSize: '',
        priceRange: '',
        lotSize: '',
        status: ''
    };

    // Extract dates from cells or text
    const datePattern = /(\d{1,2}[\s/-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\s/-]\d{2,4})/i;
    
    cells.forEach((cell, idx) => {
        const cellText = cell.toLowerCase();
        const dateMatch = cell.match(datePattern);
        
        // Try to identify date types based on cell position or keywords
        if (dateMatch) {
            if (cellText.includes('open') || cellText.includes('from') || idx === 1) {
                if (!data.openDate) data.openDate = dateMatch[1];
            } else if (cellText.includes('close') || cellText.includes('to') || idx === 2) {
                if (!data.closeDate) data.closeDate = dateMatch[1];
            } else if (cellText.includes('list') || idx === 3) {
                if (!data.listingDate) data.listingDate = dateMatch[1];
            }
        }
        
        // Extract issue size
        const sizeMatch = cell.match(/(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?\s*(?:Cr|Crore|Lakh)?)/i);
        if (sizeMatch && !data.issueSize) {
            data.issueSize = sizeMatch[1];
        }
        
        // Extract price range
        const priceMatch = cell.match(/(?:Rs\.?|₹)?\s*([\d,]+\s*(?:-|to)\s*[\d,]+)/i);
        if (priceMatch && !data.priceRange) {
            data.priceRange = priceMatch[1];
        }
        
        // Extract lot size
        const lotMatch = cell.match(/(\d+)\s*(?:shares|lots|Shares)?$/i);
        if (lotMatch && parseInt(lotMatch[1]) > 10 && parseInt(lotMatch[1]) < 10000) {
            if (!data.lotSize) data.lotSize = lotMatch[1];
        }
    });
    
    // Fallback to text matching if cells didn't capture everything
    if (!data.openDate) {
        const openMatch = text.match(/(?:Open|Opening|Subscription|From).*?(\d{1,2}[\s/-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\s/-]\d{2,4})/i);
        if (openMatch) data.openDate = openMatch[1];
    }
    
    if (!data.closeDate) {
        const closeMatch = text.match(/(?:Close|Closing|To).*?(\d{1,2}[\s/-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[\s/-]\d{2,4})/i);
        if (closeMatch) data.closeDate = closeMatch[1];
    }

    // Determine status
    const lowerText = text.toLowerCase();
    if (lowerText.includes('upcoming') || lowerText.includes('forthcoming')) {
        data.status = 'Upcoming';
    } else if (lowerText.includes('open') || lowerText.includes('ongoing') || lowerText.includes('subscribe')) {
        data.status = 'Open';
    } else if (lowerText.includes('closed') || lowerText.includes('ended')) {
        data.status = 'Closed';
    } else if (lowerText.includes('listed')) {
        data.status = 'Listed';
    }
    
    // Detect SME IPOs
    data.isSME = lowerText.includes('sme') || 
                 lowerText.includes('emerge') || 
                 companyName.toLowerCase().includes('sme');

    return data;
};

// Process IPO data from Puppeteer response
const processIPOData = (ipos, url) => {
    const processedIpos = [];
    const seenNormalized = new Map();
    
    // Check if this URL is specifically for SME IPOs
    const isSMEUrl = url.toLowerCase().includes('sme') || 
                     url.toLowerCase().includes('emerge') ||
                     url.includes('?a=sme');

    try {
        ipos.forEach(ipo => {
            // Extract structured data from raw IPO data
            const ipoData = extractIPOData(ipo);
            
            // Validate company name before processing
            if (!isValidCompanyName(ipoData.companyName)) {
                return; // Skip invalid company names
            }
            
            // Mark as SME if from SME URL
            if (isSMEUrl) {
                ipoData.isSME = true;
            }
            
            if (ipoData.companyName && ipoData.companyName.length > 2) {
                const normalized = normalizeCompanyName(ipoData.companyName);
                
                // Within same URL, merge duplicates
                if (seenNormalized.has(normalized)) {
                    const existing = seenNormalized.get(normalized);
                    
                    // Merge data - prefer filled values
                    existing.openDate = existing.openDate || ipoData.openDate;
                    existing.closeDate = existing.closeDate || ipoData.closeDate;
                    existing.listingDate = existing.listingDate || ipoData.listingDate;
                    existing.issueSize = existing.issueSize || ipoData.issueSize;
                    existing.priceRange = existing.priceRange || ipoData.priceRange;
                    existing.lotSize = existing.lotSize || ipoData.lotSize;
                    
                    if (!existing.status || existing.status === 'Unknown') {
                        existing.status = ipoData.status;
                    }
                    
                    if (ipoData.companyName.length > existing.companyName.length) {
                        existing.companyName = ipoData.companyName;
                    }
                } else {
                    const fullData = {
                        ...ipoData,
                        source: url,
                        rawText: ipo.rawText?.substring(0, 200) || ''
                    };
                    seenNormalized.set(normalized, fullData);
                    processedIpos.push(fullData);
                }
            }
        });
    } catch (error) {
        console.error('Error processing IPO data:', error);
    }

    return processedIpos;
};

// Scrape a single URL using Puppeteer-based proxy
const scrapeSingleUrl = async (url) => {
    try {
        // Use Puppeteer proxy server (run: node proxy-server.js)
        const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(url)}`;
        
        console.log(`Scraping with Puppeteer: ${url}`);
        
        const response = await axiosInstance.get(proxyUrl, {
            timeout: 60000, // Increased timeout for Puppeteer
        });

        // Response from Puppeteer proxy is structured JSON
        if (response.data.success && response.data.ipos) {
            const processedIpos = processIPOData(response.data.ipos, url);
            return {
                success: true,
                url,
                ipos: processedIpos
            };
        } else {
            return {
                success: false,
                url,
                error: response.data.error || 'No IPO data found'
            };
        }

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        
        let errorNote = 'Failed to fetch data. ';
        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            errorNote += 'Make sure Puppeteer proxy server is running: node proxy-server.js';
        } else if (error.code === 'ETIMEDOUT') {
            errorNote += 'Request timed out. The website may be slow or blocking requests.';
        }
        
        return {
            success: false,
            url,
            error: error.message,
            note: errorNote
        };
    }
};

// Normalize company name for comparison (place before processIPOData)
const normalizeCompanyName = (name) => {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/\s+ltd\.?\s*$/gi, '')
        .replace(/\s+limited\s*$/gi, '')
        .replace(/\s+inc\.?\s*$/gi, '')
        .replace(/\s+corporation\s*$/gi, '')
        .replace(/\s+corp\.?\s*$/gi, '')
        .replace(/\s+pvt\.?\s*$/gi, '')
        .replace(/\s+private\s*$/gi, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Merge multiple IPO entries, keeping the best data
const mergeDuplicateIPOs = (ipos) => {
    const ipoMap = new Map();
    
    ipos.forEach(ipo => {
        const normalizedName = normalizeCompanyName(ipo.companyName);
        
        if (!normalizedName) return; // Skip if normalization results in empty string
        
        if (!ipoMap.has(normalizedName)) {
            // First occurrence - add it
            ipoMap.set(normalizedName, { 
                ...ipo, 
                sources: [ipo.source],
                dataQuality: calculateDataQuality(ipo)
            });
        } else {
            // Merge with existing entry
            const existing = ipoMap.get(normalizedName);
            const currentQuality = calculateDataQuality(ipo);
            
            // Keep the longer/more complete company name
            if (ipo.companyName.length > existing.companyName.length) {
                existing.companyName = ipo.companyName;
            }
            
            // Merge fields - prefer filled values, or keep existing if both filled
            existing.openDate = chooseBestValue(existing.openDate, ipo.openDate);
            existing.closeDate = chooseBestValue(existing.closeDate, ipo.closeDate);
            existing.listingDate = chooseBestValue(existing.listingDate, ipo.listingDate);
            existing.issueSize = chooseBestValue(existing.issueSize, ipo.issueSize);
            existing.priceRange = chooseBestValue(existing.priceRange, ipo.priceRange);
            existing.lotSize = chooseBestValue(existing.lotSize, ipo.lotSize);
            
            // Status priority: Open > Upcoming > Closed > Listed > Unknown
            existing.status = chooseBestStatus(existing.status, ipo.status);
            
            // If any source indicates SME, mark as SME
            if (ipo.isSME) {
                existing.isSME = true;
            }
            
            // Combine sources (unique only)
            if (ipo.source && !existing.sources.includes(ipo.source)) {
                existing.sources.push(ipo.source);
            }
            
            // Keep the longest rawText (more data)
            if (ipo.rawText && ipo.rawText.length > (existing.rawText?.length || 0)) {
                existing.rawText = ipo.rawText;
            }
            
            // Update data quality score
            existing.dataQuality = Math.max(existing.dataQuality, currentQuality);
        }
    });
    
    // Convert map back to array and format sources
    return Array.from(ipoMap.values())
        .map(ipo => ({
            ...ipo,
            source: ipo.sources.length > 1 ? `${ipo.sources.length} sources` : ipo.sources[0],
            sourceCount: ipo.sources.length
        }))
        .sort((a, b) => b.dataQuality - a.dataQuality); // Sort by data quality
};

// Calculate data quality score (higher is better)
const calculateDataQuality = (ipo) => {
    let score = 0;
    if (ipo.companyName) score += 1;
    if (ipo.openDate) score += 2;
    if (ipo.closeDate) score += 2;
    if (ipo.listingDate) score += 1;
    if (ipo.issueSize) score += 2;
    if (ipo.priceRange) score += 2;
    if (ipo.lotSize) score += 1;
    if (ipo.status && ipo.status !== 'Unknown') score += 1;
    return score;
};

// Choose the best value between two options
const chooseBestValue = (existing, newValue) => {
    if (!existing) return newValue;
    if (!newValue) return existing;
    // If both exist, prefer the longer/more detailed one
    return newValue.length > existing.length ? newValue : existing;
};

// Choose the best status with priority
const chooseBestStatus = (existing, newStatus) => {
    const priority = { 'Open': 5, 'Upcoming': 4, 'Closed': 3, 'Listed': 2, 'Unknown': 1, '': 0 };
    const existingPriority = priority[existing] || 0;
    const newPriority = priority[newStatus] || 0;
    return newPriority > existingPriority ? newStatus : existing;
};

// Scrape all URLs
const iposcrapper = async () => {
    const allIpos = [];
    const errors = [];
    
    for (const url of scrappingurls) {
        console.log(`Scraping: ${url}`);
        const result = await scrapeSingleUrl(url);
        
        if (result.success && result.ipos) {
            allIpos.push(...result.ipos);
        } else if (!result.success) {
            errors.push({ url, error: result.error });
        }
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Merge duplicates and keep best data
    const deduplicatedIpos = mergeDuplicateIPOs(allIpos);
    
    console.log(`📊 Scraped ${allIpos.length} total IPOs, deduplicated to ${deduplicatedIpos.length} unique companies`);
    
    return {
        ipos: deduplicatedIpos,
        totalIpos: deduplicatedIpos.length,
        totalRawIpos: allIpos.length,
        totalUrls: scrappingurls.length,
        errors,
        scrapedAt: new Date().toISOString()
    };
};

// Scrape specific URL
const scrapeUrl = async (url) => {
    return await scrapeSingleUrl(url);
};

export default {
    iposcrapper,
    scrapeUrl,
    scrappingurls
}