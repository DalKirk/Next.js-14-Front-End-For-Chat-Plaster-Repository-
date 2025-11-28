const playwright = require('playwright');

(async () => {
  const logs = [];
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Page 1: GameBuilder
  const page1 = await context.newPage();
  page1.on('console', msg => logs.push(`[PAGE1 console] ${msg.type()}: ${msg.text()}`));
  page1.on('pageerror', err => logs.push(`[PAGE1 pageerror] ${err.message}`));
    const base = process.env.BASE_URL || 'http://localhost:3000';
    await page1.goto(`${base}/game-builder`, { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1000);

  // Page 2: Sprite Editor
  const page2 = await context.newPage();
  page2.on('console', msg => logs.push(`[PAGE2 console] ${msg.type()}: ${msg.text()}`));
  page2.on('pageerror', err => logs.push(`[PAGE2 pageerror] ${err.message}`));
    await page2.goto(`${base}/advanced-features-demo`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);

  // Sample animation to export
  const sampleAnim = {
    name: 'playwright-test',
    states: {
      idle: {
        frames: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'
        ],
        frameDuration: 150
      }
    }
  };

  // Post the animation from page2 via BroadcastChannel or CustomEvent and save to localStorage
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

  // Wait to let GameBuilder receive messages and process
  await page1.waitForTimeout(3000);

  // Read localStorage from page1
  const stored = await page1.evaluate(() => {
    try { return localStorage.getItem('gamebuilder.playerAnimation'); }
    catch (e) { return null; }
  });
  logs.push(`[PAGE1 localStorage] ${stored ? 'FOUND' : 'NOT FOUND'} ${stored ? stored.slice(0,200) : ''}`);

  // Optionally, try to call any global debug var if present (best-effort)
  try {
    const parsedCount = await page1.evaluate(() => {
      try {
        const stored = localStorage.getItem('gamebuilder.playerAnimation');
        if (!stored) return null;
        const anim = JSON.parse(stored);
        return anim && anim.states ? Object.keys(anim.states).length : null;
      } catch (e) { return null; }
    });
    logs.push('[PAGE1 parsedAnimationStates] ' + parsedCount);
  } catch (err) {
    logs.push('[PAGE1 parsedAnimationStates] eval failed');
  }

  console.log('--- Playwright Captured Logs ---');
  logs.forEach(l => console.log(l));

  await browser.close();
})();
