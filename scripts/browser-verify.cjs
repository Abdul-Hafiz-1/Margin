const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_URL = 'https://waryapp.web.app';
const EVIDENCE_DIR = path.join(__dirname, '..', 'test-evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('      WARY REAL BROWSER EVIDENCE AND VERIFICATION RUNNER        ');
  console.log('================================================================');
  console.log('Browser Executable:', EDGE_PATH);
  console.log('Target Live URL:', TARGET_URL);

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs = [];
  const networkRequests = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = `[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  page.on('pageerror', err => {
    const text = `[BROWSER UNCAUGHT ERROR] ${err.toString()}`;
    consoleLogs.push(text);
    console.error(text);
  });

  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() });
  });

  page.on('requestfailed', req => {
    const text = `[NETWORK FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`;
    networkErrors.push(text);
    console.log(text);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      const text = `[HTTP RESPONSE ${res.status()}] ${res.url()}`;
      networkErrors.push(text);
      console.log(text);
    } else if (res.url().includes('exchangeDebugToken') || res.url().includes('generateContent') || res.url().includes('firestore')) {
      const text = `[HTTP SUCCESS ${res.status()}] ${res.url()}`;
      console.log(text);
    }
  });

  console.log('\n--- Navigating to live app ---');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '0-initial-load.png') });
  console.log('Screenshot saved: 0-initial-load.png');

  // ============================================================================
  // ITEM 1: On-Device Model Status & Capability Check
  // ============================================================================
  console.log('\n================================================================');
  console.log('ITEM 1: On-Device Model Status & Capability Check');
  console.log('================================================================');
  
  const onDeviceCapabilities = await page.evaluate(() => {
    return {
      hasWindowAI: typeof (window).ai !== 'undefined',
      windowAiKeys: typeof (window).ai !== 'undefined' ? Object.keys((window).ai) : [],
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext
    };
  });
  console.log('Browser Environment:', JSON.stringify(onDeviceCapabilities, null, 2));

  // Try clicking initialize on-device AI button if present
  const clickedInit = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && (b.textContent.includes('Enable On-Device') || b.textContent.includes('Initialize On-Device')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked On-Device Init Button:', clickedInit);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '1-on-device-status.png') });
  console.log('Screenshot saved: 1-on-device-status.png');

  // ============================================================================
  // ITEM 2: Scam Detection & Cloud Redaction Verification
  // ============================================================================
  console.log('\n================================================================');
  console.log('ITEM 2: Scam Detection & Cloud Redaction Verification');
  console.log('================================================================');
  
  const testScamWithPrivateData = 
    'Urgent alert: Suspicious debit on Card 4111 2222 3333 4444. Call officer Sharma on +91 98765 43210 immediately or send OTP to desk@bank.com. A/C 987654321012.';

  // Enter text into textarea with React setter
  await page.waitForSelector('#message-input');
  await page.focus('#message-input');
  await page.keyboard.type(testScamWithPrivateData);
  await new Promise(r => setTimeout(r, 500));

  // Click Check Message button
  const checkClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Check Message'));
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Check Message button clicked:', checkClicked);
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '2-verdict-card.png') });
  console.log('Screenshot saved: 2-verdict-card.png');

  // Click "Get Cloud Second Opinion (Redacted)"
  const clickedSecondOpinion = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Second Opinion'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Second Opinion Button:', clickedSecondOpinion);
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '2-cloud-second-opinion.png') });
  console.log('Screenshot saved: 2-cloud-second-opinion.png');

  // Open Privacy Ledger Modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Privacy Ledger"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Inspect the exact redacted payload inside the modal
  const clickedInspect = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Inspect Exact Text'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Inspect Exact Text:', clickedInspect);
  await new Promise(r => setTimeout(r, 1000));

  const ledgerDetails = await page.evaluate(() => {
    const modalText = document.querySelector('.overflow-y-auto')?.textContent || '';
    return modalText;
  });
  console.log('Privacy Ledger Modal Contents:\n', ledgerDetails.substring(0, 1000));

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '2-privacy-ledger-redacted.png') });
  console.log('Screenshot saved: 2-privacy-ledger-redacted.png');

  // Close Ledger Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Close modal"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // ============================================================================
  // ITEM 3: True Offline via DevTools CDP (page.setOfflineMode(true))
  // ============================================================================
  console.log('\n================================================================');
  console.log('ITEM 3: True Offline via DevTools CDP Verification');
  console.log('================================================================');
  
  console.log('Enabling DevTools CDP Network Offline mode (navigator.onLine should become false)...');
  await page.setOfflineMode(true);

  const browserOnline = await page.evaluate(() => navigator.onLine);
  console.log('navigator.onLine under DevTools Offline:', browserOnline);

  // Clear input and type new offline test message
  await page.evaluate(() => {
    const el = document.getElementById('message-input');
    if (el) el.value = '';
  });
  await page.focus('#message-input');
  await page.keyboard.type('Dear consumer your electricity power will be disconnected tonight at 9:30 PM. Contact officer sir on 9876543210.');

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Check Message'));
    if (btn && !btn.disabled) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const offlineVerdict = await page.evaluate(() => {
    const verdictSection = document.getElementById('verdict-section');
    return verdictSection ? verdictSection.innerText : 'No verdict section found';
  });
  console.log('Verdict under True DevTools Offline:\n', offlineVerdict);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '3-true-offline-devtools.png') });
  console.log('Screenshot saved: 3-true-offline-devtools.png');

  // Test OCR offline status
  console.log('Testing OCR in true offline mode...');
  // Check if OCR language data or worker can be fetched offline
  const ocrOfflineEvaluation = await page.evaluate(async () => {
    try {
      const response = await fetch('https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz', { method: 'HEAD' });
      return { offlineFetchable: response.ok };
    } catch (e) {
      return { offlineFetchable: false, error: e.toString() };
    }
  });
  console.log('Tesseract OCR weights network check while offline:', JSON.stringify(ocrOfflineEvaluation));

  // Disable offline mode
  await page.setOfflineMode(false);
  console.log('DevTools Offline mode disabled.');

  // ============================================================================
  // ITEM 4: App Check Tokens for AI Logic & Firestore
  // ============================================================================
  console.log('\n================================================================');
  console.log('ITEM 4: App Check Token Verification');
  console.log('================================================================');
  
  const appCheckLogs = consoleLogs.filter(l => 
    l.toLowerCase().includes('appcheck') || 
    l.toLowerCase().includes('app check') ||
    l.toLowerCase().includes('debug token') ||
    l.toLowerCase().includes('recaptcha')
  );
  console.log('App Check Console Logs:\n', appCheckLogs.join('\n'));

  // ============================================================================
  // ITEM 5: Family Circle Real Accounts Verification
  // ============================================================================
  console.log('\n================================================================');
  console.log('ITEM 5: Family Circle Verification');
  console.log('================================================================');
  
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Family Circle"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '5-family-circle-modal.png') });
  console.log('Screenshot saved: 5-family-circle-modal.png');

  const familyModalText = await page.evaluate(() => {
    return document.querySelector('.overflow-y-auto')?.textContent || '';
  });
  console.log('Family Circle Details:\n', familyModalText.substring(0, 500));

  // Save all collected logs to file
  const reportLogPath = path.join(EVIDENCE_DIR, 'test-execution.log');
  fs.writeFileSync(reportLogPath, [
    '=== BROWSER CONSOLE LOGS ===',
    ...consoleLogs,
    '\n=== NETWORK REQUESTS ===',
    ...networkRequests.map(r => `${r.method} ${r.url}`),
    '\n=== NETWORK / HTTP ERRORS ===',
    ...networkErrors
  ].join('\n'));
  console.log('Full execution log saved to:', reportLogPath);

  await browser.close();
  console.log('\n================================================================');
  console.log('      REAL BROWSER VERIFICATION RUN COMPLETED                   ');
  console.log('================================================================');
}

runBrowserVerification().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
