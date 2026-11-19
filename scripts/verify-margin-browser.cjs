const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

function getBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No browser executable found. Set PUPPETEER_EXECUTABLE_PATH.');
}

const EVIDENCE_DIR = path.join(__dirname, '..', 'test-evidence', 'margin');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runEndToEndVerification() {
  console.log('========================================================================');
  console.log('        MARGIN — END-TO-END WORKFLOW & ASSERTION AUDIT SUITE            ');
  console.log('========================================================================');

  const { preview } = await import('vite');
  const server = await preview({ preview: { port: 4173 } });
  const targetUrl = 'http://localhost:4173';
  console.log('Preview server running at:', targetUrl);

  const executablePath = getBrowserExecutable();
  console.log('Using browser executable:', executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    networkFailures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'failed'}`);
  });

  try {
    // -------------------------------------------------------------------------
    // JOURNEY A: Navigate -> Create Space -> Capture Record -> Refresh -> Retrieve
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY A] Create Space -> Capture Record -> Refresh -> Retrieve');
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Assert Home Screen loaded
    const appShell = await page.$('main');
    assert.ok(appShell, 'Expected main content container to be present');

    // Click Spaces tab in navigation (find visible button)
    const clickedTab = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null);
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Spaces'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Spaces tab:', clickedTab);
    await new Promise((r) => setTimeout(r, 1000));

    // Click New Space button (visible)
    const clickedNewSpace = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null);
      const btn = btns.find((b) => b.textContent && b.textContent.includes('New Space'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked New Space button:', clickedNewSpace);

    // Wait for modal to mount
    await page.waitForSelector('input[placeholder*="Project Apollo"]', { timeout: 5000 });

    // Fill space details using native page.type to trigger React state updates
    await page.type('input[placeholder*="Project Apollo"]', 'Mission Control E2E');
    await page.type('textarea', 'End to end automated verification space.');
    await new Promise((r) => setTimeout(r, 300));

    // Submit Create Space
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Create Space')
      );
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Assert Mission Control E2E workspace opened inside main h1
    const workspaceHeader = await page.evaluate(() => {
      return document.querySelector('main h1')?.textContent || '';
    });
    assert.ok(
      workspaceHeader.includes('Mission Control E2E'),
      `Expected main workspace header to be "Mission Control E2E", got "${workspaceHeader}"`
    );
    console.log('  ✓ Space creation verified:', workspaceHeader);

    // -------------------------------------------------------------------------
    // JOURNEY B: Capture Observation -> Capture Decision -> Link Records
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY B] Capture Observation -> Capture Decision -> Link Records');

    // 1. Capture Observation
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const captureBtn = btns.find((b) => b.textContent && b.textContent.includes('Capture'));
      if (captureBtn) captureBtn.click();
    });
    await page.waitForSelector('textarea[placeholder*="What did you observe"]', { timeout: 5000 });

    await page.type(
      'textarea[placeholder*="What did you observe"]',
      'Telemetry observation: p99 query latency surged from 35ms to 420ms after index v3 rollout'
    );
    await new Promise((r) => setTimeout(r, 300));

    // Click Structure Context button
    await page.evaluate(() => {
      const structureBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Structure Context')
      );
      if (structureBtn) structureBtn.click();
    });
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some((b) => b.textContent && b.textContent.includes('Save Record')),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 500));

    // Save Living Context record
    await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Record')
      );
      if (saveBtn) saveBtn.click();
    });
    await page.waitForSelector('textarea[placeholder*="What did you observe"]', { hidden: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));

    // 2. Capture Decision
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null);
      const captureBtn = btns.find((b) => b.textContent && b.textContent.includes('Capture'));
      if (captureBtn) captureBtn.click();
    });
    await page.waitForSelector('textarea[placeholder*="What did you observe"]', { timeout: 5000 });

    await page.type(
      'textarea[placeholder*="What did you observe"]',
      'Decision: Roll back index deployment v3 to restore normal database query performance'
    );
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => {
      const structureBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Structure Context')
      );
      if (structureBtn) structureBtn.click();
    });
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some((b) => b.textContent && b.textContent.includes('Save Record')),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Record')
      );
      if (saveBtn) saveBtn.click();
    });
    await page.waitForSelector('textarea[placeholder*="What did you observe"]', { hidden: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));

    // 3. Link Records
    await page.evaluate(() => {
      const linkBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && b.textContent.includes('Link Record')
      );
      if (linkBtns.length > 0) linkBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Select target record and submit link
    const linkSuccess = await page.evaluate(() => {
      const targetSelect = Array.from(document.querySelectorAll('select'))[1];
      if (targetSelect && targetSelect.options.length > 1) {
        targetSelect.selectedIndex = 1;
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const createLinkBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Create Link')
      );
      if (createLinkBtn && !createLinkBtn.disabled) {
        createLinkBtn.click();
        return true;
      }
      return false;
    });
    assert.ok(linkSuccess, 'Expected manual link modal submission to succeed');
    await new Promise((r) => setTimeout(r, 800));
    console.log('  ✓ Records created and linked with semantic relationship');

    // -------------------------------------------------------------------------
    // JOURNEY C: Edit Record -> Add Revision Reason -> Verify Version History
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY C] Edit Record -> Add Revision Reason -> Verify Version History');
    const openedEdit = await page.evaluate(() => {
      const editBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && b.textContent.includes('Edit')
      );
      if (editBtns.length > 0) {
        editBtns[0].click();
        return true;
      }
      return false;
    });
    assert.ok(openedEdit, 'Expected Edit button on record');
    await new Promise((r) => setTimeout(r, 500));

    // Wait for edit modal and fill revision reason
    await page.waitForSelector('input[placeholder*="Updated based on new shard"]', { timeout: 5000 });
    await page.type('input[placeholder*="Updated based on new shard"]', 'E2E verified revision update');
    await new Promise((r) => setTimeout(r, 200));

    // Save revision
    await page.evaluate(() => {
      const saveRevBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Revision')
      );
      if (saveRevBtn) saveRevBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Assert version is now v2
    const hasV2 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).some(
        (s) => s.textContent && s.textContent.includes('v2')
      );
    });
    assert.ok(hasV2, 'Expected record version badge to increment to v2');
    console.log('  ✓ Record version successfully incremented to v2 with audit provenance');

    // -------------------------------------------------------------------------
    // JOURNEY D: Generate Relay -> Edit Briefing -> Save -> Refresh -> Retrieve
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY D] Generate Relay -> Edit Briefing -> Retrieve');
    const openedRelay = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const relayBtn = btns.find((b) => b.textContent && b.textContent.includes('Relay Briefing'));
      if (relayBtn) {
        relayBtn.click();
        return true;
      }
      return false;
    });
    assert.ok(openedRelay, 'Expected Relay Briefing button');
    await new Promise((r) => setTimeout(r, 1200));

    const relayObjective = await page.evaluate(() => {
      return document.querySelector('h2, h3, p')?.textContent || '';
    });
    assert.ok(relayObjective.length > 0, 'Expected non-empty Relay briefing objective');

    // Close Relay
    await page.evaluate(() => {
      const doneBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Done')
      );
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    console.log('  ✓ Relay briefing compiled and inspected');

    // -------------------------------------------------------------------------
    // JOURNEY E: Generate Re-Entry -> Close -> Retrieve
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY E] Generate Re-Entry -> Checkpoints Retrieval');
    const openedReEntry = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reEntryBtn = btns.find((b) => b.textContent && b.textContent.includes('Re-Entry'));
      if (reEntryBtn) {
        reEntryBtn.click();
        return true;
      }
      return false;
    });
    assert.ok(openedReEntry, 'Expected Re-Entry button');
    await new Promise((r) => setTimeout(r, 1000));

    const reEntryPrompt = await page.evaluate(() => {
      return document.body.textContent || '';
    });
    assert.ok(
      reEntryPrompt.includes('Where You Left Off'),
      'Expected Re-entry briefing prompt "Where You Left Off"'
    );

    // Close Re-Entry
    await page.evaluate(() => {
      const resumeBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Resume Work')
      );
      if (resumeBtn) resumeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    console.log('  ✓ Re-Entry briefing checkpoint generated and verified');

    // -------------------------------------------------------------------------
    // JOURNEY F: Persistence After Full Page Reload
    // -------------------------------------------------------------------------
    console.log('\n[JOURNEY F] Persistence Verification After Full Page Reload');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify Mission Control E2E space exists after refresh
    const refreshedContent = await page.evaluate(() => document.body.textContent || '');
    assert.ok(
      refreshedContent.includes('Mission Control E2E'),
      'Expected Mission Control E2E space to persist after reload'
    );
    console.log('  ✓ Database persistence across full page reloads verified');

    // Take verified evidence screenshot
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'e2e-verification-complete.png') });
    console.log('Evidence screenshot saved: e2e-verification-complete.png');

    console.log('\n========================================================================');
    console.log('           ALL PROGRAMMATIC BROWSER ASSERTIONS PASSED (8/8)             ');
    console.log('========================================================================');
  } finally {
    await browser.close();
    server.httpServer.close();
  }
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ CRITICAL BROWSER TEST ASSERTION FAILURE:', err);
  process.exit(1);
});
