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
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
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

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 60000 })
await new Promise(r => setTimeout(r, 1500))

// 1. Core sections rendered
check('header renders', await page.$('#siteHeader') !== null)
check('hero renders', await page.$('#hero') !== null)
check('process section renders', await page.$('#process') !== null)
check('bull orbit SVG present', await page.$('#bull-orbit') !== null)
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

// 3. Product carousel + filter
const productCount = await page.$$eval('#productCarousel .product-item', els => els.length)
check('4 products rendered', productCount === 4)
await page.evaluate(() => {
  const pills = [...document.querySelectorAll('.category-pill')]
  pills.find(p => p.textContent.includes('Therapeutic')).click()
})
await new Promise(r => setTimeout(r, 300))
const visibleAfterFilter = await page.$$eval(
  '#productCarousel .product-item',
  els => els.filter(e => e.style.display !== 'none').length
)
check('therapeutic filter shows 2 products', visibleAfterFilter === 2)
await page.evaluate(() => {
  const pills = [...document.querySelectorAll('.category-pill')]
  pills.find(p => p.textContent.includes('Kitchen Value')).click()
})
await new Promise(r => setTimeout(r, 300))
const emptyShown = await page.$eval('#filterEmpty', el => !el.classList.contains('hidden'))
check('empty state shows for value filter', emptyShown)

// 4. Quick add updates cart badge + toast
await page.evaluate(() => {
  const pills = [...document.querySelectorAll('.category-pill')]
  pills.find(p => p.textContent.includes('All Oils')).click()
})
await new Promise(r => setTimeout(r, 200))
await page.evaluate(() => document.querySelector('.quick-add').click())
await new Promise(r => setTimeout(r, 300))
const cartBadge = await page.$eval('#cartCount', el => ({ text: el.textContent, hidden: el.classList.contains('hidden') }))
check('cart badge shows 1 after quick add', cartBadge.text === '1' && !cartBadge.hidden)
const toastShown = await page.$eval('#toast', el => el.classList.contains('show') && el.textContent.includes('₹625'))
check('toast shows with running total', toastShown)

// 5. Quick view modal
await page.evaluate(() => document.querySelector('.quick-view-btn').click())
await new Promise(r => setTimeout(r, 300))
check('quick view modal opens', await page.$eval('#quickViewModal', el => getComputedStyle(el).display === 'flex'))
check('modal shows product name', await page.$eval('#modalTitle', el => el.textContent.length > 0))
const modalAddBtn = await page.$('#quickViewModal button.btn-primary')
await modalAddBtn.click()
await new Promise(r => setTimeout(r, 300))
check('modal add closes modal', await page.$eval('#quickViewModal', el => el === null || getComputedStyle(el).display === 'none'))
const badgeAfterModal = await page.$eval('#cartCount', el => el.textContent)
check('cart badge shows 2 after modal add', badgeAfterModal === '2')

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

// 8. Bull animation running (orbit transform changes)
const t1 = await page.$eval('#bull-orbit', el => el.getAttribute('transform'))
await new Promise(r => setTimeout(r, 400))
const t2 = await page.$eval('#bull-orbit', el => el.getAttribute('transform'))
check('bull orbit animating', t1 !== t2)

console.log(results.join('\n'))
console.log(errors.length ? `\nERRORS:\n${errors.join('\n')}` : '\nNo console/page errors.')
const failed = results.filter(r => r.startsWith('FAIL'))
console.log(failed.length ? `\n${failed.length} FAILURES` : '\nALL CHECKS PASSED')

await browser.close()
server.close()
process.exit(failed.length || errors.length ? 1 : 0)
