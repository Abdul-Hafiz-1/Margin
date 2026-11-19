const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(__dirname, '..', 'test-evidence', 'margin');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function verifyMargin() {
  console.log('================================================================');
  console.log('       MARGIN — REAL BROWSER VERIFICATION & AUDIT RUNNER        ');
  console.log('================================================================');

  // Serve dist or connect to preview server
  const { preview } = await import('vite');
  const server = await preview({ preview: { port: 4173 } });
  const targetUrl = 'http://localhost:4173';
  console.log('Local Preview Server running at:', targetUrl);

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => {
    const text = `[BROWSER LOG ${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  // 1. Initial Load & Home Screen
  console.log('\n--- 1. Testing Home Screen & Continuity Anchors ---');
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '1-home-screen.png') });
  console.log('Screenshot saved: 1-home-screen.png');

  // 2. Open Project Apollo Workspace
  console.log('\n--- 2. Testing Workspace Screen ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('h3, button, span'));
    const target = buttons.find(b => b.textContent && b.textContent.includes('Project Apollo'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '2-workspace-apollo.png') });
  console.log('Screenshot saved: 2-workspace-apollo.png');

  // 3. Test Context Synthesis
  console.log('\n--- 3. Testing Living Context Synthesis ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Synthesize Context'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '3-context-synthesis.png') });
  console.log('Screenshot saved: 3-context-synthesis.png');

  // 4. Test Re-Entry Briefing
  console.log('\n--- 4. Testing Signature Re-Entry Briefing ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Re-Entry'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '4-reentry-modal.png') });
  console.log('Screenshot saved: 4-reentry-modal.png');

  // Close Re-Entry modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Resume Work'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Test Relay Context Briefing
  console.log('\n--- 5. Testing Signature Relay Context Handoff ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Relay Briefing'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '5-relay-modal.png') });
  console.log('Screenshot saved: 5-relay-modal.png');

  // Close Relay modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Done'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. Test Quick Capture
  console.log('\n--- 6. Testing Quick Capture Context Modal ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Capture'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '6-capture-modal.png') });
  console.log('Screenshot saved: 6-capture-modal.png');

  // Close Capture modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Close capture modal"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 7. Test Settings & Firebase AI Logic Audit
  console.log('\n--- 7. Testing Settings & Firebase AI Logic Proof ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Config'));
    if (btn) btn.click();
    else {
      const footerBtn = document.querySelector('button[aria-label="Settings"]') || buttons.find(b => b.textContent && b.textContent.includes('Sarah Chen'));
      if (footerBtn) footerBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click Execute Proof inside Settings
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Execute Proof'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '7-settings-ai-audit.png') });
  console.log('Screenshot saved: 7-settings-ai-audit.png');

  console.log('\n================================================================');
  console.log('      ALL REAL BROWSER CHECKS COMPLETED FOR MARGIN              ');
  console.log('================================================================');

  await browser.close();
  server.httpServer.close();
}

verifyMargin().catch(err => {
  console.error('MARGIN browser verification error:', err);
  process.exit(1);
});
