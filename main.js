import dotenv from 'dotenv'
import LBScraper from './LBScraper.js'
;(async () => {
  dotenv.config()
  const scraper = new LBScraper()
  try {
    await scraper.launchBrowser()
    await scraper.auth()
    const ads = await scraper.getLatestAds()
    for (const ad of ads) {
      console.log(ad)
      await scraper.sendMessage(ad.link)
    }
  } catch (error) {
    console.error('Error during scraping:', error)
  } finally {
    await scraper.closeBrowser()
  }
})()
