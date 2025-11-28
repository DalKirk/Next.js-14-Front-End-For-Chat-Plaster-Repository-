const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Open GameBuilder (allow BASE_URL override via env)
  const page = await context.newPage();
  page.on('console', msg => console.log(`[PAGE console] ${msg.type()}: ${msg.text()}`));
  const base = process.env.BASE_URL || 'http://localhost:3000';
  await page.goto(`${base}/game-builder`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Import sample animation to localStorage directly
  const sampleAnim = {
    name: 'playwright-test2',
    states: {
      idle: {
        frames: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'],
        frameDuration: 500
      },
      run: {
        frames: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ/wP+ZLjpAAAAAElFTkSuQmCC'
        ],
        frameDuration: 150
      }
    }
  };

  await page.evaluate(anim => {
    localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim));
    // Use CustomEvent to load it to the page if the page is listening
    window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: anim }));
  }, sampleAnim);

  await page.waitForTimeout(1000);

  // Press Play (button index 3 is Play)
  await page.click('button:has-text("Play")');
  await page.waitForTimeout(200);

  // Ensure game state exists
  const hasDebugEl = await page.$('#pluto-debug');
  console.log('Has debug element:', !!hasDebugEl);

  // Check initial playerAnimFrame
  let frame0 = await page.$eval('#pluto-debug', el => Number(el.getAttribute('data-player-frame')) || 0);
  let state0 = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  console.log('Initial playerAnimFrame:', frame0);
  console.log('Initial playerAnimState:', state0);

  // Simulate movement: press 'd' key
  await page.keyboard.down('d');
  await page.waitForTimeout(500);

  let frameAfterMove = await page.$eval('#pluto-debug', el => Number(el.getAttribute('data-player-frame')) || 0);
  let stateAfterMove = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  console.log('playerAnimFrame after move:', frameAfterMove);
  console.log('playerAnimState after move:', stateAfterMove);

  // Release the key
  await page.keyboard.up('d');
  await page.waitForTimeout(500);

  let frameAfterStop = await page.$eval('#pluto-debug', el => Number(el.getAttribute('data-player-frame')) || 0);
  let stateAfterStop = await page.$eval('#pluto-debug', el => el.getAttribute('data-player-state'));
  console.log('playerAnimFrame after stop:', frameAfterStop);
  console.log('playerAnimState after stop:', stateAfterStop);

  await browser.close();
})();