const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();

  const page = await context.newPage();
  page.on('console', msg => console.log(`[PAGE console] ${msg.type()}: ${msg.text()}`));
  await page.goto('http://localhost:3000/game-builder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const sampleAnim = {
    name: 'transition-test',
    states: {
      idle: {
        frames: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'
        ],
        frameDuration: 200,
        loop: true
      },
      run: {
        frames: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'
        ],
        frameDuration: 100,
        loop: true,
        transitions: {
          idle: { minHorizontal: 0.5 }
        }
      }
    },
    // global transition: to run when minHorizontal >= 0.5
    transitions: {
      run: { minHorizontal: 0.5 }
    }
  };

  // import via localStorage + custom event dispatch
  await page.evaluate((anim) => {
    try {
      localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim));
      window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: anim }));
      console.log('Imported animation via custom event');
    } catch (e) { console.error('Failed to import', e); }
  }, sampleAnim);

  await page.waitForTimeout(1000);

  // ensure debug element exists
  const hasDebug = await page.$('#pluto-debug');
  console.log('Has debug element:', !!hasDebug);

  // Click Play
  await page.click('button:has-text("Play")');
  await page.waitForTimeout(200);

  // Confirm state idle
  const state0 = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  const frame0 = Number(await page.$eval('#pluto-debug', el => el.getAttribute('data-player-frame')));
  console.log('Initial state/frame:', state0, frame0);

  // Press move right - 'd' key
  await page.keyboard.down('d');
  await page.waitForTimeout(700);

  const stateMoving = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  const frameMoving = Number(await page.$eval('#pluto-debug', el => el.getAttribute('data-player-frame')));
  console.log('While moving state/frame:', stateMoving, frameMoving);

  // Stop movement
  await page.keyboard.up('d');
  await page.waitForTimeout(500);

  const stateStopped = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  const frameStopped = Number(await page.$eval('#pluto-debug', el => el.getAttribute('data-player-frame')));
  console.log('After stop state/frame:', stateStopped, frameStopped);

  await browser.close();
})();
