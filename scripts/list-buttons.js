const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/game-builder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map((b,i) => ({i, text: b.innerText.trim(), visible: !!(b.offsetWidth || b.offsetHeight)}));
  });
  console.log('Buttons snapshot:', btns);
  await browser.close();
})();