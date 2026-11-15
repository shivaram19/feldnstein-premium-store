// End-to-end smoke test: serves the built app, loads it headless,
// captures console/page errors, and exercises the main interactions.
import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { extname, join } from 'path'
import { fileURLToPath } from 'url'

const DIST = fileURLToPath(new URL('./dist', import.meta.url))
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4',
}

const server = createServer(async (req, res) => {
  try {
    let path = req.url.split('?')[0]
    if (path === '/') path = '/index.html'
    const file = join(DIST, path)
    if (!existsSync(file)) {
      res.writeHead(404)
      res.end('nf')
      return
    }
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch (err) {
    res.writeHead(500)
    res.end(String(err))
  }
})

await new Promise(r => server.listen(4173, r))

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const errors = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
})
page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))

const results = []
const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} — ${name}`)

// The dev backend can take a few seconds on the first cart mutation (ORM/JIT warmup),
// so async assertions poll instead of relying on a fixed sleep.
async function waitFor(fn, timeoutMs = 8000, stepMs = 200) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true
    await new Promise(r => setTimeout(r, stepMs))
  }
  return false
}

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 1500))

// 1. Core sections rendered
check('header renders', await page.$('#siteHeader') !== null)
check('hero renders', await page.$('#hero') !== null)
check('process section renders', await page.$('#process') !== null)
check('matrix section renders', await page.$('#matrix') !== null)
check('collection section renders', await page.$('#collection') !== null)
check('subscription renders', await page.$('#subscription') !== null)
check('testimonials render', await page.$('#testimonials') !== null)
check('footer renders', await page.$('#siteFooter') !== null)
check('kinetic words split', (await page.$$('.k-word')).length > 0)
check('reveal applied', (await page.$$('[data-reveal]')).length > 5)

// 2. Scroll reveal activates
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5))
await new Promise(r => setTimeout(r, 1200))
const revealed = await page.$$eval('[data-reveal].is-revealed', els => els.length)
check('scroll reveal reveals elements', revealed > 3)

// 3. Product carousel + category pill (only "All Oils" remains, centered).
// The catalog comes from the API when reachable (3 seeded oils) and from static
// fallback data otherwise (4 oils) — assert the carousel renders either way.
const productCount = await page.$$eval('#productCarousel .product-item', els => els.length)
check('products rendered (API or static catalog)', productCount >= 3)
const pillInfo = await page.$$eval('.category-pill', pills =>
  pills.map(p => ({ label: p.textContent.trim(), pressed: p.getAttribute('aria-pressed') }))
)
check('only the All Oils pill renders, active', pillInfo.length === 1 && pillInfo[0].label.includes('All Oils') && pillInfo[0].pressed === 'true')
const centered = await page.$eval('.category-pill', pill => {
  const row = pill.parentElement.getBoundingClientRect()
  const r = pill.getBoundingClientRect()
  return Math.abs((r.left + r.width / 2) - (row.left + row.width / 2)) < 2
})
check('All Oils pill is centered', centered)

// 4. Quick add updates cart badge + toast (amount comes from the live catalog
// when the API is up, so assert the toast shape, not a hardcoded price)
await page.evaluate(() => document.querySelector('.quick-add').click())
const badgeOne = await waitFor(async () => {
  const b = await page.$eval('#cartCount', el => ({ text: el.textContent, hidden: el.classList.contains('hidden') }))
  return b.text === '1' && !b.hidden
})
check('cart badge shows 1 after quick add', badgeOne)
const toastShown = await waitFor(() =>
  page.$eval('#toast', el => el.classList.contains('show') && el.textContent.includes('Added to cart') && el.textContent.includes('₹')))
check('toast shows add confirmation with amount', toastShown)

// 5. Quick view modal
await page.evaluate(() => document.querySelector('.quick-view-btn').click())
await new Promise(r => setTimeout(r, 300))
check('quick view modal opens', await page.$eval('#quickViewModal', el => getComputedStyle(el).display === 'flex'))
check('modal shows product name', await page.$eval('#modalTitle', el => el.textContent.length > 0))
const modalAddBtn = await page.$('#quickViewModal button.btn-primary')
await modalAddBtn.click()
check('modal add closes modal', await waitFor(() =>
  page.$eval('#quickViewModal', el => el === null || getComputedStyle(el).display === 'none')))
const badgeAfterModal = await waitFor(() => page.$eval('#cartCount', el => el.textContent === '2'))
check('cart badge shows 2 after modal add', badgeAfterModal)

// 6. Scrollspy highlights nav
await page.evaluate(() => document.getElementById('matrix').scrollIntoView())
await new Promise(r => setTimeout(r, 800))
const spyActive = await page.$$eval('header nav .nav-link', links =>
  links.some(l => l.getAttribute('aria-current') === 'location')
)
check('scrollspy sets aria-current', spyActive)

// 7. Sticky header shrink
await page.evaluate(() => window.scrollTo(0, 600))
await new Promise(r => setTimeout(r, 600))
const headerH = await page.$eval('#headerInner', el => el.classList.contains('h-14'))
check('header shrinks on scroll', headerH)

// 8. Product detail page (ADR-0024) — card click opens the PDP for that product
await page.evaluate(() => document.querySelector('.product-card-link').click())
await new Promise(r => setTimeout(r, 500))
check('product detail renders', await page.$('#productDetail') !== null)
check('product hash is linkable', await page.evaluate(() => window.location.hash.startsWith('#product/')))
check('detail shows product name', (await page.$eval('#productDetail h1', el => el.textContent.trim())).length > 3)
const variantCount = (await page.$$('#variantGrid [role="option"]')).length
check('variant grid shows sizes', variantCount >= 3)
check('description paragraph renders', (await page.$eval('#productStory', el => el.textContent.trim())).length > 200)
check('nutrition table renders', (await page.$$('#nutritionTable tbody tr')).length >= 5)
check('trust badges render', (await page.$$('.trust-badge')).length === 4)

// Selecting a variant updates the headline price
const firstVariantPrice = await page.$eval('#variantGrid [role="option"] .font-serif', el => el.textContent.trim())
const headlinePrice = await page.$eval('#detailPrice', el => el.textContent.trim())
check('headline price matches first variant', headlinePrice === firstVariantPrice)
await page.evaluate(() => document.querySelectorAll('#variantGrid [role="option"]')[2].click())
await new Promise(r => setTimeout(r, 200))
const headlineAfterVariant = await page.$eval('#detailPrice', el => el.textContent.trim())
check('variant click updates headline price', headlineAfterVariant !== headlinePrice)

// Quantity stepper
await page.evaluate(() => document.querySelector('[aria-label="Increase quantity"]').click())
await new Promise(r => setTimeout(r, 100))
check('quantity stepper increments', (await page.$eval('#detailQty', el => el.textContent)) === '2')

// Add to cart from the PDP bumps the badge by the chosen qty
const badgeBeforeDetail = Number(await page.$eval('#cartCount', el => el.textContent))
await page.evaluate(() => document.querySelector('#detailAddBtn').click())
const badgeAfterDetail = await waitFor(async () =>
  Number(await page.$eval('#cartCount', el => el.textContent)) === badgeBeforeDetail + 2)
check('detail add-to-cart bumps badge', badgeAfterDetail)

// Back link returns to the collection on the home view
await page.evaluate(() => document.querySelector('#backToCollection').click())
await new Promise(r => setTimeout(r, 500))
check('back returns to home collection', await page.$('#collection') !== null && await page.$('#productDetail') === null)

console.log(results.join('\n'))
console.log(errors.length ? `\nERRORS:\n${errors.join('\n')}` : '\nNo console/page errors.')
const failed = results.filter(r => r.startsWith('FAIL'))
console.log(failed.length ? `\n${failed.length} FAILURES` : '\nALL CHECKS PASSED')

await browser.close()
server.close()
process.exit(failed.length || errors.length ? 1 : 0)
