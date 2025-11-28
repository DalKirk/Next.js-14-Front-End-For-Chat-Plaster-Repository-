const { spawn } = require('child_process');
const playwright = require('playwright');

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

(async () => {
  console.log('[TEST] Starting Next.js dev server...');
  const dev = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), shell: true, env: process.env });

  let ready = false;
  dev.stdout.on('data', d => {
    const s = d.toString();
    process.stdout.write(s);
    if (s.includes('Local:') && s.includes('http://localhost:3000')) {
      ready = true;
    }
  });
  dev.stderr.on('data', d => process.stderr.write(d.toString()));
  dev.on('exit', (code) => console.log('[TEST] dev server exited with', code));

  // wait up to 30s for ready
  const timeout = 30000;
  const start = Date.now();
  while (!ready && Date.now() - start < timeout) {
    await wait(500);
  }

  if (!ready) {
    console.error('[TEST] Dev server did not become ready in time');
    dev.kill();
    process.exit(1);
  }

  console.log('[TEST] Dev server ready, launching Playwright');

  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const logs = [];
    page1.on('console', msg => logs.push(`[PAGE1 console] ${msg.type()}: ${msg.text()}`));
    page1.on('pageerror', err => logs.push(`[PAGE1 pageerror] ${err.message}`));

    await page1.goto('http://127.0.0.1:3000/game-builder', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);

    const page2 = await context.newPage();
    page2.on('console', msg => logs.push(`[PAGE2 console] ${msg.type()}: ${msg.text()}`));
    page2.on('pageerror', err => logs.push(`[PAGE2 pageerror] ${err.message}`));
    await page2.goto('http://127.0.0.1:3000/advanced-features-demo', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(1000);

    const sampleAnim = {
      name: 'playwright-test',
      states: {
        idle: {
          frames: [
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'
          ],
          frameDuration: 150
        }
      }
    };

    await page2.evaluate((anim) => {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('gamebuilder-animations');
          bc.postMessage(anim);
          bc.close();
          console.log('[TEST EXPORT] Posted animation via BroadcastChannel', anim.name);
        } else {
          window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: anim }));
          console.log('[TEST EXPORT] Dispatched CustomEvent import', anim.name);
        }
      } catch (err) {
        console.error('[TEST EXPORT] Error posting animation', err);
      }

      try {
        localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim));
        console.log('[TEST EXPORT] Saved animation to localStorage');
      } catch (e) {
        console.warn('[TEST EXPORT] localStorage write failed', e);
      }
    }, sampleAnim);

    await page1.waitForTimeout(1500);

    const stored = await page1.evaluate(() => {
      try { return localStorage.getItem('gamebuilder.playerAnimation'); }
      catch (e) { return null; }
    });
    logs.push(`[PAGE1 localStorage] ${stored ? 'FOUND' : 'NOT FOUND'} ${stored ? stored.slice(0,200) : ''}`);

    console.log('--- Playwright Captured Logs ---');
    logs.forEach(l => console.log(l));

    await browser.close();
  } catch (err) {
    console.error('[TEST] Playwright error', err);
  } finally {
    try { dev.kill(); } catch (e) {}
  }

})();
