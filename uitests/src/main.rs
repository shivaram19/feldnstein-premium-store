// UI flow tests (chromiumoxide port of scripts/ui-flow-tests.js) — drives the admin
// SPA (:5173) and storefront preview (:4173) through real user flows, asserting the
// UX contract per step. Backend expected on :8080. Run: cargo run (from uitests/).
use anyhow::Result;
use chromiumoxide::browser::BrowserConfig;
use chromiumoxide::Page;
use chromiumoxide::Browser;
use futures::StreamExt;
use serde_json::Value;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;
use tokio::time::sleep;

const ADMIN: &str = "http://localhost:5173";
const SHOP: &str = "http://localhost:4173";

static PASSED: AtomicUsize = AtomicUsize::new(0);
static FAILED: AtomicUsize = AtomicUsize::new(0);

fn check(name: &str, cond: bool, detail: &str) {
    if cond {
        PASSED.fetch_add(1, Ordering::SeqCst);
        println!("  PASS  {name}");
    } else {
        FAILED.fetch_add(1, Ordering::SeqCst);
        println!("  FAIL  {name}{}", if detail.is_empty() { String::new() } else { format!(" — {detail}") });
    }
}

async fn ev(page: &Page, expr: &str) -> Result<Value> {
    Ok(page.evaluate(expr).await?.into_value()?)
}

async fn ev_bool(page: &Page, expr: &str) -> bool {
    ev(page, expr).await.ok().and_then(|v| v.as_bool()).unwrap_or(false)
}

async fn ev_string(page: &Page, expr: &str) -> String {
    ev(page, expr).await.ok().and_then(|v| v.as_str().map(String::from)).unwrap_or_default()
}

/// Click the first <button> whose trimmed text contains `text`.
async fn click_button(page: &Page, text: &str) -> bool {
    ev_bool(page, &format!(
        r#"(() => {{ const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().includes({text:?})); if (b) {{ b.click(); return true; }} return false; }})()"#
    )).await
}

async fn click_pill(page: &Page, text: &str) -> bool {
    ev_bool(page, &format!(
        r#"(() => {{ const p = [...document.querySelectorAll('.pill')].find(x => x.textContent.trim() === {text:?}); if (p) {{ p.click(); return true; }} return false; }})()"#
    )).await
}

async fn modal_open(page: &Page) -> bool {
    ev_bool(page, "!!document.querySelector('.modal')").await
}

async fn modal_title(page: &Page) -> String {
    ev_string(page, "document.querySelector('.modal h2')?.textContent ?? ''").await
}

async fn toast_text(page: &Page) -> String {
    ev_string(page, "document.querySelector('.toast-stack')?.textContent ?? ''").await
}

/// Set a value on an element selected by a JS expression using the native setter
/// (so React picks it up) and dispatch an input event.
async fn set_value(page: &Page, selector_js: &str, value: &str) -> bool {
    ev_bool(page, &format!(
        r#"(() => {{
          const el = {selector_js};
          if (!el) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
            ?? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(el, {value:?});
          el.dispatchEvent(new Event('input', {{ bubbles: true }}));
          el.dispatchEvent(new Event('change', {{ bubbles: true }}));
          return true;
        }})()"#
    )).await
}

async fn nav(page: &Page, label: &str) -> bool {
    ev_bool(page, &format!(
        r#"(() => {{ const b = [...document.querySelectorAll('nav button')].find(x => x.textContent.trim().includes({label:?})); if (b) {{ b.click(); return true; }} return false; }})()"#
    )).await
}

/// Login and wait for either the shell (nav) or a login error. Returns (status, page).
async fn login(browser: &Browser, user: &str, pass: &str) -> Result<(String, Page)> {
    let page = browser.new_page("about:blank").await?;
    page.goto(ADMIN).await?;
    // fresh tab = fresh sessionStorage; no clear/reload (a reload races the
    // value-setting below and can leave the form unsubmitted)
    sleep(Duration::from_millis(1200)).await;
    let _ = set_value(&page, "document.querySelector('input[aria-label=\"Username\"]')", user).await;
    let _ = set_value(&page, "document.querySelector('input[aria-label=\"Password\"]')", pass).await;
    sleep(Duration::from_millis(300)).await;
    let _ = ev_bool(&page, "(() => { const b = document.querySelector('button.btn-primary'); if (b && !b.disabled) { b.click(); return true; } return false; })()").await;
    for _ in 0..24 {
        sleep(Duration::from_millis(500)).await;
        let state = ev(&page, "({ nav: !!document.querySelector('nav'), err: document.querySelector('.login-error')?.textContent ?? '' })").await?;
        if state["nav"].as_bool().unwrap_or(false) {
            return Ok(("ok".into(), page));
        }
        if let Some(err) = state["err"].as_str() {
            if !err.is_empty() {
                return Ok((err.to_string(), page));
            }
        }
    }
    Ok(("timeout".into(), page))
}

/* ---------- Flow A: authentication ---------- */
async fn flow_auth(browser: &Browser) -> Result<()> {
    println!("\nFlow A — authentication");
    let page = browser.new_page("about:blank").await?;
    page.goto(ADMIN).await?;
    sleep(Duration::from_millis(1000)).await;
    let disabled_empty = ev_bool(&page, "document.querySelector('button.btn-primary').disabled").await;
    check("A1 submit disabled when empty", disabled_empty, "");
    // A2 negative: wrong password → friendly error, stays on login
    let (err, err_page) = login(browser, "admin", "wrongpass").await?;
    check(
        "A2 invalid login shows friendly error",
        err.len() > 5 && !err.contains("500"),
        &err.chars().take(60).collect::<String>(),
    );
    let still_login = ev_bool(&err_page, "!!document.querySelector('.login-card')").await;
    check("A2b stays on login screen", still_login, "");
    err_page.close().await?;
    Ok(())
}

/* ---------- Flow B: RBAC ---------- */
async fn flow_rbac(browser: &Browser) -> Result<()> {
    println!("\nFlow B — RBAC");
    let (ok_ops, page) = login(browser, "ops", "ops123").await?;
    check("B0 ops login succeeds", ok_ops == "ok", &ok_ops);
    sleep(Duration::from_millis(1200)).await;
    let nav_text = ev_string(&page, "document.querySelector('nav')?.textContent ?? ''").await;
    check("B1 ops nav excludes Reports", !nav_text.contains("Reports"), "");
    check("B1b ops nav excludes Audit", !nav_text.contains("Audit"), "");
    check("B1c ops nav INCLUDES Media (ops role has media access)", nav_text.contains("Media"), "");
    check("B1d ops nav excludes Settings", !nav_text.contains("Settings"), "");
    let dash = ev_string(&page, "document.body.textContent").await;
    check("B1e ops can open dashboard", dash.contains("Operations"), "");
    // cust cannot authenticate into admin at all → friendly failure message
    let (cust, page2) = login(browser, "cust", "cust123").await?;
    check(
        "B2a cust sign-in fails with friendly message",
        cust.to_lowercase().contains("failed"),
        &cust.chars().take(80).collect::<String>(),
    );
    let raw = ev_bool(&page2, "document.body.textContent.includes('Internal Server Error') || document.body.textContent.includes('Exception')").await;
    check("B2b no raw server error shown", !raw, "");
    page.close().await?;
    page2.close().await?;
    Ok(())
}

/* ---------- Flow C: production batch lifecycle ---------- */
async fn flow_batch(browser: &Browser) -> Result<()> {
    println!("\nFlow C — production batch lifecycle");
    let (ok, page) = login(browser, "admin", "admin123").await?;
    check("C0 admin login succeeds", ok == "ok", &ok);
    nav(&page, "Batches").await;
    sleep(Duration::from_millis(2000)).await;
    let before = ev(&page, "document.querySelectorAll('.table-scroll tbody tr').length").await?.as_u64().unwrap_or(0);
    // C1: filter pill narrows the list (or produces an empty state)
    let pill_clicked = ev_bool(&page, r#"(() => {
      const p = [...document.querySelectorAll('.pill')].find(x => /QC PENDING|BOTTLING|SEDIMENTATION/.test(x.textContent));
      if (p) { p.click(); return true; } return false; })()"#).await;
    sleep(Duration::from_millis(900)).await;
    let after = ev(&page, "document.querySelectorAll('.table-scroll tbody tr').length").await?.as_u64().unwrap_or(0);
    let empty_state = ev_bool(&page, "!!document.querySelector('.state-title')").await;
    check("C1 filter pill reacts", pill_clicked && (after != before || empty_state), &format!("before={before} after={after}"));
    // C2: create modal + disabled-until-valid
    click_button(&page, "Record pressing").await;
    sleep(Duration::from_millis(1000)).await;
    check("C2 create modal opens", modal_open(&page).await, &modal_title(&page).await);
    if !modal_open(&page).await {
        return Ok(());
    }
    let dis = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('.modal-actions button')].find(x => x.textContent.includes('Record batch')); return b ? b.disabled : false; })()"#).await;
    check("C2b submit disabled until valid", dis, "");
    let code = format!("UI-FLOW-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() % 100000);
    set_value(&page, "document.querySelector('.modal input')", &code).await;
    let _ = ev_bool(&page, r#"(() => { const s = document.querySelector('.modal select'); if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); return true; } return false; })()"#).await;
    let _ = ev_bool(&page, r#"(() => { const nums = [...document.querySelectorAll('.modal input[type=number]')]; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; if (nums[0]) { setter.call(nums[0], '25'); nums[0].dispatchEvent(new Event('input', { bubbles: true })); } if (nums[1]) { setter.call(nums[1], '1500'); nums[1].dispatchEvent(new Event('input', { bubbles: true })); } return true; })()"#).await;
    sleep(Duration::from_millis(400)).await;
    let en = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('.modal-actions button')].find(x => x.textContent.includes('Record batch')); return b ? !b.disabled : false; })()"#).await;
    check("C2c submit enables when valid", en, "");
    click_button(&page, "Record batch").await;
    sleep(Duration::from_millis(1800)).await;
    let toast = toast_text(&page).await;
    check("C2d success toast on create", toast.to_lowercase().contains("recorded"), &toast.chars().take(60).collect::<String>());
    // C3: status advance requires confirmation (button labelled "→ <next status>")
    if modal_open(&page).await { click_button(&page, "Cancel").await; sleep(Duration::from_millis(500)).await; }
    let adv = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith('→')); if (b) { b.click(); return true; } return false; })()"#).await;
    check("C3 advance button exists", adv, "");
    sleep(Duration::from_millis(700)).await;
    let title = modal_title(&page).await;
    check("C3b confirm dialog appears", title.contains("Advance"), &title);
    let fwd = ev_bool(&page, "document.querySelector('.modal')?.textContent.includes('forward') ?? false").await;
    check("C3c confirm explains forward-only", fwd, "");
    click_button(&page, "Cancel").await;
    sleep(Duration::from_millis(500)).await;
    check("C3d cancel closes without change", !modal_open(&page).await, "");
    page.close().await?;
    Ok(())
}

/* ---------- Flow D: ledger writes ---------- */
async fn flow_ledger(browser: &Browser) -> Result<()> {
    println!("\nFlow D — ledger writes (transfer/adjustment)");
    let (ok, page) = login(browser, "admin", "admin123").await?;
    check("D0 admin login succeeds", ok == "ok", &ok);
    nav(&page, "Transfer Stock").await;
    sleep(Duration::from_millis(2000)).await;
    let dis = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Post transfer')); return b ? b.disabled : false; })()"#).await;
    check("D1 transfer submit disabled until valid", dis, "");
    nav(&page, "Stock Adjustment").await;
    sleep(Duration::from_millis(2000)).await;
    let _ = ev_bool(&page, r#"(() => { const s = [...document.querySelectorAll('select')][0]; if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); return true; } return false; })()"#).await;
    sleep(Duration::from_millis(500)).await;
    let _ = ev_bool(&page, r#"(() => { const n = document.querySelector('input[type=number]'); if (!n) return false; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; const onHand = Number(n.max || 0); setter.call(n, String(Math.max(0, onHand - 1))); n.dispatchEvent(new Event('input', { bubbles: true })); return true; })()"#).await;
    sleep(Duration::from_millis(500)).await;
    let delta = ev_bool(&page, "document.body.textContent.includes('Delta')").await;
    check("D2 delta preview shown before posting", delta, "");
    click_button(&page, "Post adjustment").await;
    sleep(Duration::from_millis(700)).await;
    let title = modal_title(&page).await;
    check("D2b confirm dialog before ledger write", title.contains("Post adjustment"), &title);
    let sub = ev_string(&page, "document.querySelector('.modal')?.textContent ?? ''").await;
    check("D2c confirm states permanence", sub.contains("permanent") || sub.contains("cannot be undone"), "");
    click_button(&page, "Cancel").await;
    page.close().await?;
    Ok(())
}

/* ---------- Flow E: media library ---------- */
async fn flow_media(browser: &Browser) -> Result<()> {
    println!("\nFlow E — media library");
    let (ok, page) = login(browser, "admin", "admin123").await?;
    check("E0 admin login succeeds", ok == "ok", &ok);
    nav(&page, "Media Library").await;
    sleep(Duration::from_millis(2500)).await;
    let has = ev_bool(&page, "document.querySelectorAll('img').length > 0 || !!document.querySelector('.state-title') || document.body.textContent.includes('No media yet')").await;
    check("E1 library renders grid or helpful empty state", has, "");
    click_button(&page, "Upload").await;
    sleep(Duration::from_millis(800)).await;
    set_value(&page, "document.querySelector('.modal input')", "BAD KEY!").await;
    let dis = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('.modal-actions button')].find(x => x.textContent.includes('Upload')); return b ? b.disabled : false; })()"#).await;
    check("E2 upload blocked until file chosen", dis, "");
    click_button(&page, "Cancel").await;
    let pills = ev(&page, "document.querySelectorAll('.pill').length").await?.as_u64().unwrap_or(0);
    check("E3 status pills present", pills > 0, "");
    page.close().await?;
    Ok(())
}

/* ---------- Flow F: site content editors ---------- */
async fn flow_content(browser: &Browser) -> Result<()> {
    println!("\nFlow F — site content editors");
    let (ok, page) = login(browser, "admin", "admin123").await?;
    check("F0 admin login succeeds", ok == "ok", &ok);
    nav(&page, "Site Content").await;
    sleep(Duration::from_millis(2000)).await;
    set_value(&page, "document.querySelector('.card input')", "").await;
    sleep(Duration::from_millis(400)).await;
    let dis = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Save hero'); return b ? b.disabled : false; })()"#).await;
    check("F1 hero save disabled without headline", dis, "");
    click_pill(&page, "Testimonials").await;
    sleep(Duration::from_millis(900)).await;
    click_button(&page, "Add testimonial").await;
    sleep(Duration::from_millis(500)).await;
    let dis2 = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Save testimonials'); return b ? b.disabled : false; })()"#).await;
    check("F2 testimonials save disabled while incomplete", dis2, "");
    page.close().await?;
    Ok(())
}

/* ---------- Flow G: storefront ---------- */
async fn flow_storefront(browser: &Browser) -> Result<()> {
    println!("\nFlow G — storefront");
    let page = browser.new_page("about:blank").await?;
    page.goto(SHOP).await?;
    sleep(Duration::from_millis(3000)).await;
    let text = ev_string(&page, "document.body.textContent").await;
    check("G1 storefront renders brand + products", text.contains("FELD") && text.contains("Groundnut"), "");
    let _ = ev_bool(&page, "window.scrollTo(0, 800); true").await;
    sleep(Duration::from_millis(900)).await;
    let shrunk = ev_bool(&page, "document.querySelector('#headerInner')?.classList.contains('h-14') ?? false").await;
    check("G2 header reacts to scroll", shrunk, "");
    let _ = ev_bool(&page, "document.querySelector('#collection')?.scrollIntoView(); true").await;
    sleep(Duration::from_millis(1200)).await;
    let clicked = ev_bool(&page, r#"(() => { const b = [...document.querySelectorAll('#collection button')].find(x => x.textContent.includes('Add to Reserve Cart')); if (b) { b.click(); return true; } return false; })()"#).await;
    sleep(Duration::from_millis(900)).await;
    let feedback = clicked && ev_bool(&page, "document.body.textContent.toLowerCase().includes('cart') || !!document.querySelector('[class*=toast]')").await;
    check("G3 add-to-cart gives feedback", feedback, "");
    if let Ok(bytes) = page.screenshot(chromiumoxide::page::ScreenshotParams::default()).await { let _ = std::fs::write("/tmp/shots-media/70-rust-storefront.png", bytes); }
    page.close().await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let (mut browser, mut handler) = Browser::launch(
        BrowserConfig::builder()
            .chrome_executable("/usr/bin/chromium")
            .arg("--no-sandbox")
            .arg("--mute-audio")
            .arg("--window-size=1440,900")
            .build().map_err(anyhow::Error::msg)?,
    )
    .await?;
    tokio::spawn(async move { while handler.next().await.is_some() {} });

    let result = async {
        flow_auth(&browser).await?;
        flow_rbac(&browser).await?;
        flow_batch(&browser).await?;
        flow_ledger(&browser).await?;
        flow_media(&browser).await?;
        flow_content(&browser).await?;
        flow_storefront(&browser).await?;
        Ok::<(), anyhow::Error>(())
    }
    .await;

    let passed = PASSED.load(Ordering::SeqCst);
    let failed = FAILED.load(Ordering::SeqCst);
    println!("\n============================================");
    println!("{passed} passed, {failed} failed");
    let _ = browser.close().await;
    result?;
    if failed > 0 {
        std::process::exit(1);
    }
    Ok(())
}
