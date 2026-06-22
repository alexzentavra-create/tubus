const { chromium } = require('playwright');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[Browser PageError] ${err.message}`);
  });

  try {
    console.log("Navigating to http://localhost:3001...");
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
    console.log("Page loaded successfully.");

    await page.waitForTimeout(2000);

    // 1. Check if 'Saltar Introducción' button is present and click it
    const skipIntroBtn = await page.$('text="Saltar Introducción"');
    if (skipIntroBtn) {
      console.log("Welcome modal / introduction found. Clicking 'Saltar Introducción'...");
      await skipIntroBtn.click();
      await page.waitForTimeout(1000);
    }

    // 2. Click the 'Elegí una línea...' button
    const selectLineBtn = await page.$('text="Elegí una línea..."');
    if (selectLineBtn) {
      console.log("Found select line button, clicking...");
      await selectLineBtn.click();
      await page.waitForTimeout(2000);

      // Print all visible line items in selector
      const linesText = await page.$$eval('div', divs => {
        return divs.filter(d => d.innerText && d.innerText.includes("Línea")).map(d => d.innerText.split('\n')[0]);
      });
      console.log("Visible lines in selector:", Array.from(new Set(linesText)));

      // Let's click on Line 59!
      const line59Item = await page.$('text="Línea 59"');
      if (line59Item) {
        console.log("Clicking Line 59...");
        await line59Item.click();
        
        console.log("Waiting for buses to load (6 seconds)...");
        await page.waitForTimeout(6000);

        const markersCount = await page.$$eval('.maplibregl-marker', markers => markers.length);
        console.log(`Total markers found on map: ${markersCount}`);

        const markersHTML = await page.$$eval('.maplibregl-marker', markers => markers.map(m => m.outerHTML));
        console.log("Markers HTML:", markersHTML);
      } else {
        console.log("Line 59 item not found in list");
      }
    } else {
      console.log("Choose line button 'Elegí una línea...' not found");
    }

  } catch (error) {
    console.error("Error during browser test:", error);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
