const puppeteer = require('/tmp/shotter/node_modules/puppeteer-core');
const fs = require('fs');

const SHOTS = '/tmp/storefront-shots';
fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    userDataDir: '/home/rajneesh/.cache/feldnstein-ui-flow-tests/shot-profile',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', m => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
  page.on('requestfailed', r => console.log('REQ FAIL:', r.url().slice(0, 140), r.failure()?.errorText));

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${SHOTS}/01-home-top.png` });

  for (const [id, name] of [['process', '02-process-bull'], ['collection', '03-collection'], ['matrix', '04-matrix'], ['creed', '05-creed'], ['subscription', '06-subscription'], ['testimonials', '07-testimonials']]) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), id).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }

  // add to cart from collection, then open cart
  await page.evaluate(() => document.getElementById('collection')?.scrollIntoView());
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /add to cart/i.test(b.textContent || ''));
    b?.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('header button')];
    const b = btns.find(b => /cart/i.test(b.getAttribute('aria-label') || b.textContent || ''));
    b?.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${SHOTS}/08-cart.png` });

  await browser.close();
  console.log('shots done');
})().catch(e => { console.error(e); process.exit(1); });
