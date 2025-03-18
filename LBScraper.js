import puppeteer from 'puppeteer'
import Utils from './utils.js'

// Selectors usually changes often by site owners so it's best to keep it here centralized
const CONFIG = {
  URLS: {
    BASE: 'https://leboncoin.fr/',
    /**
     * 41: category of Jouets
     * sort=time sort by latest ads
     */
    SEARCH: 'recherche?category=41&sort=time',
  },
  SELECTORS: {
    COOKIE_ACCEPT: '#didomi-notice-agree-button',
    LOGIN_BUTTON: '[aria-label="Se connecter"]',
    EMAIL_INPUT: '#email',
    CONTINUE_BUTTON: '[data-testid="login-continue-button"]',
    PASSWORD_INPUT: '#password',
    SUBMIT_BUTTON: '[data-testid="submitButton"]',
    ACCOUNT_ICON: '[aria-label="Mon compte"]',
    SEARCH_INPUT: '[data-test-id="extendable-input"]',
    AD_ITEM: '[data-test-id="ad"]',
    AD_TITLE: '[data-test-id="adcard-title"]',
    AD_PRICE: '[data-test-id="price"] > span',
    CONTACT_BUTTON: '[data-pub-id="adview_button_contact_contact"]',
  },
  TIMEOUTS: {
    NAVIGATION: 10000,
    ELEMENT: 5000,
    ACCOUNT_VERIFICATION: 10000,
    SEARCH_RESULTS: 10000,
  },
  TYPING_DELAYS: {
    EMAIL: { min: 30, max: 60 },
    PASSWORD: { min: 40, max: 80 },
    SEARCH: { min: 20, max: 90 },
  },
}

/**
 * LeBonCoin Scraper class
 * Handles authentication, searching, and data extraction from LeBonCoin
 */
export default class LBScraper {
  #browser = null
  #isAuthenticated = false
  #data = []
  #credentials = null
  #logger = console

  /**
   * Create a new LBScraper instance
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance (defaults to console)
   */
  constructor(options = {}) {
    this.#logger = options.logger || console
    this.#validateEnvironment()
  }

  /**
   * Validate required environment variables
   * @private
   */
  #validateEnvironment() {
    const username = process.env.LBC_USERNAME
    const password = process.env.LBC_PASSWORD

    if (!username || !password) {
      throw new Error('LBC_USERNAME and LBC_PASSWORD need to be in .env file')
    }

    this.#credentials = { username, password }
  }

  async #setUserAgent(page) {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    )
  }

  /**
   * Launch the browser with anti-detection measures
   */
  async launchBrowser() {
    try {
      this.#browser = await puppeteer.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
        ],
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        defaultViewport: {
          width: 1400,
          height: 900,
        },
      })

      this.#logger.log('Browser launched successfully')
    } catch (error) {
      this.#logger.error('Failed to launch browser:', error.message)
      throw new Error(
        `Erreur lors du lancement du navigateur: ${error.message}`
      )
    }
  }

  /**
   * Add a randomized delay to simulate human behavior
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   * @private
   */
  async #humanDelay(min = 500, max = 1500) {
    const delay = Math.floor(Math.random() * (max - min)) + min
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  /**
   * Type text with human-like delays
   * @param {Object} page - Puppeteer page object
   * @param {string} selector - Element selector
   * @param {string} text - Text to type
   * @param {Object} delays - Min and max typing delays
   * @private
   */
  async #humanType(page, selector, text, delays = { min: 30, max: 70 }) {
    await page.waitForSelector(selector, {
      visible: true,
      timeout: CONFIG.TIMEOUTS.ELEMENT,
    })

    for (const char of text) {
      await page.type(selector, char, {
        delay:
          Math.floor(Math.random() * (delays.max - delays.min)) + delays.min,
      })
    }
  }

  /**
   * Handle cookie consent dialog if present
   * @param {Object} page - Puppeteer page object
   * @private
   */
  async #handleCookieConsent(page) {
    try {
      await page.waitForSelector(CONFIG.SELECTORS.COOKIE_ACCEPT, {
        timeout: CONFIG.TIMEOUTS.ELEMENT,
      })
      await page.click(CONFIG.SELECTORS.COOKIE_ACCEPT)
      await this.#humanDelay(800, 1200)
      this.#logger.log('Cookie consent handled')
    } catch (e) {
      this.#logger.log('Cookie notice not found or already accepted')
    }
  }

  /**
   * Perform login sequence
   * @param {Object} page - Puppeteer page object
   * @private
   */
  async #performLoginSequence(page) {
    // Click login button and wait for navigation
    await page.waitForSelector(CONFIG.SELECTORS.LOGIN_BUTTON, {
      visible: true,
      timeout: CONFIG.TIMEOUTS.ELEMENT,
    })

    await page.click(CONFIG.SELECTORS.LOGIN_BUTTON)
    await this.#humanDelay(1000, 2000)

    // Verify we're on the login page
    try {
      await page.waitForSelector(CONFIG.SELECTORS.EMAIL_INPUT, {
        visible: true,
        timeout: CONFIG.TIMEOUTS.ELEMENT,
      })
    } catch (error) {
      this.#logger.log('Email field not found, retrying login button...')
      // Try again
      await this.#humanDelay(1000, 2000)
      await page.waitForSelector(CONFIG.SELECTORS.EMAIL_INPUT, {
        visible: true,
        timeout: CONFIG.TIMEOUTS.ELEMENT,
      })
    }

    // Enter email
    await this.#humanType(
      page,
      CONFIG.SELECTORS.EMAIL_INPUT,
      this.#credentials.username,
      CONFIG.TYPING_DELAYS.EMAIL
    )

    // Click continue
    await page.waitForSelector(CONFIG.SELECTORS.CONTINUE_BUTTON, {
      visible: true,
      timeout: CONFIG.TIMEOUTS.ELEMENT,
    })
    await page.click(CONFIG.SELECTORS.CONTINUE_BUTTON)

    // Wait for password field and enter password
    await page.waitForSelector(CONFIG.SELECTORS.PASSWORD_INPUT, {
      visible: true,
      timeout: CONFIG.TIMEOUTS.ELEMENT,
    })

    await this.#humanType(
      page,
      CONFIG.SELECTORS.PASSWORD_INPUT,
      this.#credentials.password,
      CONFIG.TYPING_DELAYS.PASSWORD
    )

    // Submit form
    await page.waitForSelector(CONFIG.SELECTORS.SUBMIT_BUTTON, {
      visible: true,
      timeout: CONFIG.TIMEOUTS.ELEMENT,
    })
    await page.click(CONFIG.SELECTORS.SUBMIT_BUTTON)

    // Verify login success
    try {
      await page.waitForNavigation({
        waitUntil: 'networkIdle0',
        timeout: CONFIG.TIMEOUTS.ACCOUNT_VERIFICATION,
      })
      await page.waitForSelector(CONFIG.SELECTORS.ACCOUNT_ICON, {
        visible: true,
        timeout: CONFIG.TIMEOUTS.ACCOUNT_VERIFICATION,
      })
    } catch (error) {
      this.#logger.log('Timer for login success verification exceeded !')
    }
  }

  /**
   * Authenticate with LeBonCoin
   */
  async auth() {
    if (!this.#browser) {
      throw new Error(
        'Browser was not started. Please call launchBrowser() first.'
      )
    }

    const page = await this.#browser.newPage()

    this.#setUserAgent(page)

    try {
      await page.goto(CONFIG.URLS.BASE, { waitUntil: 'networkidle2' })

      await this.#handleCookieConsent(page)
      await this.#performLoginSequence(page)

      this.#isAuthenticated = true
      this.#logger.log('Successfully authenticated !')
    } catch (error) {
      this.#logger.error('Login error:', error.message)
      throw new Error(`⚠️ Login error: ${error.message}`)
    }
  }

  /**
   * Get latest ads matching search criteria
   * @param {number} limit - Maximum number of ads to retrieve
   * @param {string} searchQuery - Search query text
   * @param {string} keyword - Enforce specific keyword in the title
   * @returns {Array} - Array of ad objects
   */
  async getLatestAds(
    limit = 10,
    searchQuery = 'fléchettes avec les fléchettes.',
    keyword = 'fléchettes'
  ) {
    if (!this.#isAuthenticated) {
      throw new Error('Please authenticate first using auth()')
    }

    const page = await this.#browser.newPage()

    this.#setUserAgent(page)

    this.#data = [] // Reset data array

    try {
      // Navigate to search page
      await page.goto(`${CONFIG.URLS.BASE}${CONFIG.URLS.SEARCH}`, {
        waitUntil: 'networkidle2',
        timeout: 0,
      })

      // Search for query
      await this.#humanType(
        page,
        CONFIG.SELECTORS.SEARCH_INPUT,
        searchQuery,
        CONFIG.TYPING_DELAYS.SEARCH
      )

      await this.#humanDelay(1000, 2000)
      await page.keyboard.press('Enter')

      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: CONFIG.TIMEOUTS.NAVIGATION,
        })
      } catch (navError) {
        this.#logger.log(
          'Search navigation completed or timed out, continuing...',
          navError
        )
      }

      // Wait for search results
      await page.waitForSelector(CONFIG.SELECTORS.AD_ITEM, {
        visible: true,
        timeout: CONFIG.TIMEOUTS.SEARCH_RESULTS,
      })

      // Get all ad elements
      const ads = await page.$$(CONFIG.SELECTORS.AD_ITEM)

      const adPromises = await Promise.all(
        ads.map(async (ad) => {
          const descriptionHandle = await ad.$(CONFIG.SELECTORS.AD_TITLE)
          if (!descriptionHandle) return null
          const text = await page.evaluate(
            (el) => el.textContent.toLowerCase(),
            descriptionHandle
          )
          return text.includes(keyword.toLowerCase()) ? ad : null
        })
      )

      const filteredAds = adPromises.filter((ad) => ad !== null)

      this.#logger.log(
        `Found ${ads.length} ads, processing ${Math.min(ads.length, limit)}...`
      )

      // Extract data from each ad
      for (let i = 0; i < Math.min(filteredAds.length, limit); i++) {
        try {
          const ad = filteredAds[i]

          const title = await ad.$eval(
            CONFIG.SELECTORS.AD_TITLE,
            (el) => el.innerText
          )

          const price = await ad
            .$eval(CONFIG.SELECTORS.AD_PRICE, (el) => el.innerText)
            .catch(() => 'Price not found')

          const link = await ad.$eval('a', (el) => el.href)

          // Add human-like delay between processing ads
          await this.#humanDelay(200, 500)

          this.#data.push({
            title,
            price: Utils.cleanPrice(price),
            link,
            scrapedAt: new Date().toISOString(),
          })
        } catch (error) {
          this.#logger.log(
            `Error extracting data from ad #${i + 1}: ${error.message}`
          )
        }
      }

      this.#logger.log(`Successfully extracted ${this.#data.length} ads`)
      return this.#data
    } catch (error) {
      this.#logger.error(`Error in getLatestAds: ${error.message}`)
      throw error
    } finally {
      await page.close()
    }
  }

  /**
   * Send a message to an ad
   * This is just a demo, func does not outwright send a message
   * To send a message, we can target the send button
   * @param {string} link - Ad URL
   */
  async sendMessage(link) {
    if (!this.#isAuthenticated) {
      throw new Error('Please authenticate first using auth()')
    }

    const page = await this.#browser.newPage()

    this.#setUserAgent(page)

    try {
      await page.goto(link, {
        waitUntil: 'networkidle2',
      })

      await page.waitForSelector(CONFIG.SELECTORS.CONTACT_BUTTON, {
        visible: true,
        timeout: CONFIG.TIMEOUTS.ELEMENT,
      })

      try {
        await page.click(CONFIG.SELECTORS.CONTACT_BUTTON)
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: CONFIG.TIMEOUTS.NAVIGATION,
        })
      } catch (navError) {
        this.#logger.log(
          'Contact navigation completed or timed out, continuing...'
        )
      }

      /**
       * Actual message sending implementation would go here
       * For demo purposes, we just log the action
       */
      this.#logger.log(`Message ready to be sent to: ${link}`)

      // Rate limiting to avoid detection
      await this.#humanDelay(3000, 5000)

      return true
    } catch (error) {
      this.#logger.error(`Error in sendMessage: ${error.message}`)
    } finally {
      await page.close()
    }
  }

  /**
   * Close the browser instance
   */
  async closeBrowser() {
    if (this.#browser) {
      await this.#browser.close()
      this.#browser = null
      this.#isAuthenticated = false
      this.#logger.log('Browser closed')
    }
  }

  /**
   * Check if authenticated
   * @returns {boolean} - Authentication status
   */
  isAuthenticated() {
    return this.#isAuthenticated
  }

  /**
   * Get base URL
   * @returns {string} - Base URL
   */
  getURL() {
    return CONFIG.URLS.BASE
  }

  /**
   * Get scraped data
   * @returns {Array} - Array of ad objects
   */
  getData() {
    if (this.#data.length === 0) {
      throw Error(
        'Please run getLatestAds to scrape data first, this function returns already scraped data'
      )
    }
    return this.#data
  }
}
