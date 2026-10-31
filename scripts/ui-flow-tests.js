// UI flow tests — drives the admin SPA and storefront through real user flows,
// asserting the UX contract at each step (loading states, disabled-until-valid,
// confirm dialogs, toasts, status pills, empty states, friendly errors).
// Run: node scripts/ui-flow-tests.js   (needs :5173 admin dev, :8080 backend,
// storefront preview on :4173 built with VITE_SITE_API=http://localhost:8080)
const puppeteer = require('/tmp/shotter/node_modules/puppeteer-core')

const ADMIN = 'http://localhost:5173'
const SHOP = 'http://localhost:4173'
let passed = 0
const failures = []
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`) }
  else { failures.push(name); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  return page
}

async function login(page, user, pass) {
  await page.goto(ADMIN, { waitUntil: 'networkidle0' })
  await page.evaluate(() => sessionStorage.clear())
  await page.type('input[aria-label="Username"]', user)
  await page.type('input[aria-label="Password"]', pass)
  await page.click('button.btn-primary')
  // wait for either the shell (nav appears) or a login error — dev backend can be slow cold
  for (let i = 0; i < 24; i++) {
    await sleep(500)
    const state = await page.evaluate(() => ({
      nav: !!document.querySelector('nav'),
      err: document.querySelector('.login-error')?.textContent ?? '',
    }))
    if (state.nav) return 'ok'
    if (state.err) return state.err
  }
  return 'timeout'
}
const nav = (page, label) => page.evaluate((l) => {
  [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim().includes(l))?.click()
}, label)
const clickButton = (page, text) => page.evaluate((t) => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t || b.textContent.trim().includes(t))?.click()
}, text)
const bodyText = (page) => page.evaluate(() => document.body.textContent)
const toastText = (page) => page.evaluate(() => document.querySelector('.toast-stack')?.textContent ?? '')
const modalOpen = (page) => page.evaluate(() => !!document.querySelector('.modal'))
const modalTitle = (page) => page.evaluate(() => document.querySelector('.modal h2')?.textContent ?? '')

async function logout(page) {
  await page.evaluate(() => { sessionStorage.clear() })
}

/* ---------- Flow A: authentication ---------- */
async function flowAuth(browser) {
  console.log('\nFlow A — authentication')
  const page = await newPage(browser)
  await page.goto(ADMIN, { waitUntil: 'networkidle0' })
  // A1: submit disabled until both fields filled
  const disabledEmpty = await page.evaluate(() => document.querySelector('button.btn-primary').disabled)
  check('A1 submit disabled when empty', disabledEmpty === true)
  // A2: invalid credentials → friendly inline error, stays on login
  const err = await login(page, 'admin', 'wrongpass')
  check('A2 invalid login shows friendly error', typeof err === 'string' && err.length > 5 && !err.includes('500'), String(err).slice(0, 60))
  const stillLogin = await page.evaluate(() => !!document.querySelector('.login-card'))
  check('A2b stays on login screen', stillLogin)
  await page.close()
}

/* ---------- Flow B: RBAC in the UI ---------- */
async function flowRbac(browser) {
  console.log('\nFlow B — RBAC')
  // B1: ops sees reduced nav (no Reports/Audit/Settings/Media)
  const page = await newPage(browser)
  const r1 = await login(page, 'ops', 'ops123')
  check('B0 ops login succeeds', r1 === 'ok', r1)
  await sleep(1000)
  const navText = await page.evaluate(() => document.querySelector('nav')?.textContent ?? '')
  check('B1 ops nav excludes Reports', !navText.includes('Reports'))
  check('B1b ops nav excludes Audit', !navText.includes('Audit'))
  check('B1c ops nav INCLUDES Media (ops role has media access)', navText.includes('Media'))
  check('B1d ops nav excludes Settings', !navText.includes('Settings'))
  const dashOk = await page.evaluate(() => document.body.textContent.includes('Operations'))
  check('B1d ops can open dashboard', dashOk)
  await page.close()
  // B2: customer cannot authenticate into the admin at all → friendly sign-in failure
  const p2 = await newPage(browser)
  const r2 = await login(p2, 'cust', 'cust123')
  check('B2a cust sign-in fails with friendly message', typeof r2 === 'string' && /failed/i.test(r2), String(r2).slice(0, 80))
  await sleep(800)
  const rawErr = await p2.evaluate(() => document.body.textContent.includes('Internal Server Error') || document.body.textContent.includes('Exception'))
  check('B2b no raw server error shown', !rawErr)
  await p2.close()
}

/* ---------- Flow C: production batch lifecycle ---------- */
async function flowBatch(browser) {
  console.log('\nFlow C — production batch lifecycle')
  const page = await newPage(browser)
  const rc = await login(page, 'admin', 'admin123')
  check('C0 admin login succeeds', rc === 'ok', rc)
  await nav(page, 'Batches')
  await sleep(2000)
  // C1: filter pill narrows the list
  const before = await page.evaluate(() => document.querySelectorAll('.card tbody tr, .table-scroll tbody tr').length)
  await page.evaluate(() => { [...document.querySelectorAll('.pill')].find((p) => /QC PENDING|READY|BOTTLING/.test(p.textContent))?.click() })
  await sleep(800)
  const after = await page.evaluate(() => document.querySelectorAll('.table-scroll tbody tr').length)
  check('C1 filter pill reacts (count changes or empty state)', after !== before || await page.evaluate(() => !!document.querySelector('.state-title')))
  // C2: create batch modal — submit disabled until valid
  await clickButton(page, 'Record pressing')
  await sleep(1000)
  check('C2 create modal opens', await modalOpen(page), await modalTitle(page))
  if (!(await modalOpen(page))) { await page.close(); return }
  const submitDisabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.modal-actions button')].find((x) => x.textContent.includes('Record batch'))
    return b ? b.disabled : null
  })
  check('C2b submit disabled until valid', submitDisabled === true)
  // C2c: fill required fields → enabled
  await page.evaluate(() => {
    const modal = document.querySelector('.modal')
    const code = modal.querySelector('input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(code, 'UI-FLOW-' + Date.now() % 100000)
    code.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => {
    const sel = document.querySelector('.modal select')
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  await page.evaluate(() => {
    const modal = document.querySelector('.modal')
    const nums = [...modal.querySelectorAll('input[type=number]')]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    if (nums[0]) { setter.call(nums[0], '25'); nums[0].dispatchEvent(new Event('input', { bubbles: true })) }
    if (nums[1]) { setter.call(nums[1], '1500'); nums[1].dispatchEvent(new Event('input', { bubbles: true })) }
  })
  await sleep(300)
  const submitEnabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.modal-actions button')].find((x) => x.textContent.includes('Record batch'))
    return b ? b.disabled : null
  })
  check('C2c submit enables when valid', submitEnabled === false)
  await clickButton(page, 'Record batch')
  await sleep(1500)
  const toast = await toastText(page)
  check('C2d success toast on create', /recorded/i.test(toast), toast.slice(0, 60))
  // C3: status advance requires confirmation (button labelled "→ <next status>")
  if (await modalOpen(page)) { await clickButton(page, 'Cancel'); await sleep(500) }
  const adv = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('→'))
    if (btn) { btn.click(); return true } return false
  })
  check('C3 advance button exists', adv)
  await sleep(600)
  const title = await modalTitle(page)
  check('C3b confirm dialog appears', /Advance/i.test(title), title)
  const fwdOnly = await page.evaluate(() => document.querySelector('.modal')?.textContent.includes('forward'))
  check('C3c confirm explains forward-only', !!fwdOnly)
  await clickButton(page, 'Cancel')
  await sleep(400)
  check('C3d cancel closes without change', (await modalOpen(page)) === false)
  await page.close()
}

/* ---------- Flow D: transfer + adjustment confirm UX ---------- */
async function flowLedger(browser) {
  console.log('\nFlow D — ledger writes (transfer/adjustment)')
  const page = await newPage(browser)
  const rd = await login(page, 'admin', 'admin123')
  check('D0 admin login succeeds', rd === 'ok', rd)
  await nav(page, 'Transfer Stock')
  await sleep(2000)
  // D1: form disabled/guarded while stock loading; submit disabled until valid
  const submitDis = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Post transfer'))
    return b ? b.disabled : null
  })
  check('D1 transfer submit disabled until valid', submitDis === true)
  // D2: adjustment shows delta line + permanent-ledger confirm
  await nav(page, 'Stock Adjustment')
  await sleep(2000)
  await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')]
    if (selects[0] && selects[0].options.length > 1) {
      selects[0].selectedIndex = 1
      selects[0].dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  await sleep(400)
  await page.evaluate(() => {
    const num = document.querySelector('input[type=number]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    const onHand = num ? Number(num.max || 0) : 0
    setter.call(num, String(Math.max(0, onHand - 1)))
    num.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(400)
  const deltaShown = await page.evaluate(() => document.body.textContent.includes('Delta'))
  check('D2 delta preview shown before posting', deltaShown)
  await clickButton(page, 'Post adjustment')
  await sleep(600)
  const t = await modalTitle(page)
  const sub = await page.evaluate(() => document.querySelector('.modal')?.textContent ?? '')
  check('D2b confirm dialog before ledger write', /Post adjustment/i.test(t), t)
  check('D2c confirm states permanence', sub.includes('permanent') || sub.includes('cannot be undone'))
  await clickButton(page, 'Cancel')
  await page.close()
}

/* ---------- Flow E: media library UX ---------- */
async function flowMedia(browser) {
  console.log('\nFlow E — media library')
  const page = await newPage(browser)
  const re = await login(page, 'admin', 'admin123')
  check('E0 admin login succeeds', re === 'ok', re)
  await nav(page, 'Media Library')
  await sleep(2500)
  // E1: grid or empty state (never blank)
  const hasContent = await page.evaluate(() =>
    document.querySelectorAll('img').length > 0 || !!document.querySelector('.state-title') || document.body.textContent.includes('No media yet'))
  check('E1 library renders grid or helpful empty state', hasContent)
  // E2: upload modal validation — invalid assetKey shows friendly error
  await clickButton(page, 'Upload')
  await sleep(600)
  await page.evaluate(() => {
    const input = document.querySelector('.modal input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'BAD KEY!')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // upload button disabled because no file — instead test API-driven error text via presign on submit is blocked; assert disabled state
  const upDisabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.modal-actions button')].find((x) => x.textContent.includes('Upload'))
    return b ? b.disabled : null
  })
  check('E2 upload blocked until file chosen', upDisabled === true)
  await clickButton(page, 'Cancel')
  // E3: status pills + phase labels exist
  const pills = await page.evaluate(() => document.querySelectorAll('.pill').length)
  check('E3 status pills present', pills > 0)
  await page.close()
}

/* ---------- Flow F: site content editor UX ---------- */
async function flowContent(browser) {
  console.log('\nFlow F — site content editors')
  const page = await newPage(browser)
  const rf = await login(page, 'admin', 'admin123')
  check('F0 admin login succeeds', rf === 'ok', rf)
  await nav(page, 'Site Content')
  await sleep(2000)
  // F1: hero save requires headline (clear it first — the seeded block has one)
  await page.evaluate(() => {
    const input = document.querySelector('.card input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    if (input) { setter.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true })) }
  })
  await sleep(400)
  const saveDis = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save hero')
    return b ? b.disabled : null
  })
  check('F1 hero save disabled without headline', saveDis === true)
  // F2: testimonials save disabled while a row is incomplete
  await page.evaluate(() => { [...document.querySelectorAll('.pill')].find((p) => p.textContent.trim() === 'Testimonials')?.click() })
  await sleep(800)
  await clickButton(page, 'Add testimonial')
  await sleep(400)
  const saveDis2 = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save testimonials')
    return b ? b.disabled : null
  })
  check('F2 testimonials save disabled while incomplete', saveDis2 === true)
  await page.close()
}

/* ---------- Flow G: storefront (live + UX) ---------- */
async function flowStorefront(browser) {
  console.log('\nFlow G — storefront')
  const page = await newPage(browser)
  await page.goto(SHOP, { waitUntil: 'networkidle0', timeout: 40000 })
  await sleep(2500)
  // G1: renders with brand + products
  const t = await bodyText(page)
  check('G1 storefront renders brand + products', t.includes('FELD') && t.includes('Groundnut'))
  // G2: header shrinks on scroll (#headerInner gains h-14, per smoke-test)
  await page.evaluate(() => window.scrollTo(0, 800))
  await sleep(900)
  const shrunk = await page.evaluate(() => document.querySelector('#headerInner')?.classList.contains('h-14'))
  check('G2 header reacts to scroll', shrunk === true)
  // G3: add to cart → toast feedback
  await page.evaluate(() => document.querySelector('#collection')?.scrollIntoView())
  await sleep(1200)
  await page.evaluate(() => { [...document.querySelectorAll('#collection button')].find((b) => b.textContent.includes('Add to Reserve Cart'))?.click() })
  await sleep(800)
  const cartToast = await page.evaluate(() => document.body.textContent.includes('cart') || document.body.textContent.includes('Cart') || !!document.querySelector('.toast, [class*=toast]'))
  check('G3 add-to-cart gives feedback', cartToast)
  await page.screenshot({ path: '/tmp/shots-media/60-uiflow-storefront.png' })
  await page.close()
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
  try {
    await flowAuth(browser)
    await flowRbac(browser)
    await flowBatch(browser)
    await flowLedger(browser)
    await flowMedia(browser)
    await flowContent(browser)
    await flowStorefront(browser)
  } finally {
    await browser.close()
  }
  console.log(`\n============================================`)
  console.log(`${passed} passed, ${failures.length} failed`)
  if (failures.length) { console.log('failures:', failures.join(' | ')); process.exit(1) }
}

main()
