# LeBonCoin Scraper

A Node.js web scraper for LeBonCoin that allows you to automate browsing, searching, and interacting with listings.

# Notice
This does not integrate residential proxies but we can easily add it for a more resilient solution, neverthless the solution works without it for small scale scraping.

## Features

- Automated login to LeBonCoin
- Search for listings with custom queries
- Extract listing data (title, price, and link)
- Contact sellers automatically
- Human-like browsing behavior to avoid detection

## Installation

1. Clone this repository
```bash
git clone https://github.com/unixisking/leboncoin-scraper.git
cd leboncoin-scraper
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with your LeBonCoin credentials
```
LBC_USERNAME=your_email@example.com
LBC_PASSWORD=your_password
```
4. Run the project
```bash
npm run start
```

## Usage

```javascript
import LBScraper from './LBScraper.js';

async function run() {
  // Create a new instance
  const scraper = new LBScraper();
  
  try {
    // Launch a browser instance
    await scraper.launchBrowser();
    
    // Authenticate with LeBonCoin
    await scraper.auth();
    
    // Search for items (default limit is 10)
    const results = await scraper.getLatestAds(5, 'fléchettes avec les fléchettes.', 'fléchettes');
    
    // Print results
    console.log('Search results:');
    console.log(results);
    
    // Optional: Contact a seller
    // await scraper.sendMessage(results[0].link);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Always close the browser when done
    await scraper.closeBrowser();
  }
}

run();
```

## Configuration

The scraper uses a configuration object for selectors and timeouts. You can modify these in the `CONFIG` object at the top of the `LBScraper.js` file if LeBonCoin changes their website structure.

## Methods

- `launchBrowser()` - Launches a Chrome browser instance
- `auth()` - Authenticates with LeBonCoin using credentials from .env
- `getLatestAds(limit, searchQuery, keyword)` - Searches for ads and returns results
- `sendMessage(link)` - Opens the contact form for a specific ad
- `closeBrowser()` - Closes the browser instance
- `isAuthenticated()` - Returns authentication status
- `getData()` - Returns the most recently scraped data
- `getURL()` - Returns the base URL

## Human-like Browsing
To avoid detection, the scraper implements several human-like behaviors:
* Random delays between actions
* Natural typing speed with random pauses
* Waits for page elements to load naturally

## Future improvements
* Implementing IP rotation for large-scale scraping
* Adding support for more advanced search filters
* Integrating AI for better messages to seller
* Implementing data export to CSV/JSON

## Legal Notice

This tool is provided for educational purposes only. Web scraping may violate website terms of service. Always ensure you have permission to scrape a website and comply with their rules.

## License

MIT