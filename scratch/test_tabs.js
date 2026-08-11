const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set default timeout to 60 seconds because Next.js compilation can take a while on the first hit
  page.setDefaultTimeout(60000);

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER UNCAUGHT ERROR] ${err.message}\nStack:\n${err.stack}`);
  });

  console.log('Navigating to http://localhost:3000/admin/super...');
  // Use load instead of networkidle to prevent hanging on map tile loads
  await page.goto('http://localhost:3000/admin/super', { waitUntil: 'load' });
  console.log('Page loaded successfully.');

  // Let's clear localStorage to make sure we test clean loading
  await page.evaluate(() => localStorage.clear());
  console.log('Cleared localStorage, reloading...');
  await page.goto('http://localhost:3000/admin/super', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Click on 'Mapas de línea' tab
  console.log('Clicking on Mapa de línea tab...');
  const lineMapsBtn = page.locator('text=Mapas de Línea');
  if (await lineMapsBtn.count() > 0) {
    await lineMapsBtn.click();
    console.log('Clicked Mapas de Línea.');
  } else {
    console.log('Mapas de Línea tab button not found by text.');
  }
  await page.waitForTimeout(4000);

  // Click on 'Tareas' tab
  console.log('Clicking on Tareas tab...');
  const todosBtn = page.locator('text=Tareas');
  if (await todosBtn.count() > 0) {
    await todosBtn.click();
    console.log('Clicked Tareas.');
  } else {
    console.log('Tareas tab button not found by text.');
  }
  await page.waitForTimeout(4000);

  // Let's also test with loaded localStorage by reloading the page and clicking again
  console.log('Reloading with populated localStorage...');
  await page.goto('http://localhost:3000/admin/super', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  console.log('Clicking on Tareas tab with populated localStorage...');
  if (await todosBtn.count() > 0) {
    await todosBtn.click();
  }
  await page.waitForTimeout(4000);

  await browser.close();
  console.log('Done.');
})();
