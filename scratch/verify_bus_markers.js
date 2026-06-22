const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const skipIntroBtn = await page.$('text="Saltar Introducción"');
    if (skipIntroBtn) {
      await skipIntroBtn.click();
      await page.waitForTimeout(1000);
    }

    const selectLineBtn = await page.$('text="Elegí una línea..."');
    if (selectLineBtn) {
      await selectLineBtn.click();
      await page.waitForTimeout(2000);

      const line59Item = await page.$('text="Línea 59"');
      if (line59Item) {
        await line59Item.click();
        console.log("Line 59 clicked. Waiting for load...");
        await page.waitForTimeout(8000); // 8s to ensure data load and animation start

        // Find all markers that DO NOT have a title attribute on their inner div (since stop markers have titles)
        const busMarkersInfo = await page.$$eval('.maplibregl-marker', markers => {
          return markers.map(m => {
            const inner = m.querySelector('div');
            const title = inner ? inner.getAttribute('title') : null;
            return {
              html: m.outerHTML,
              title: title,
              isBus: !title // Bus markers don't use title on their inner wrapper
            };
          }).filter(info => info.isBus);
        });

        console.log(`Found ${busMarkersInfo.length} bus markers on the map.`);
        if (busMarkersInfo.length > 0) {
          console.log("Sample Bus Marker HTML:", busMarkersInfo[0].html);
        } else {
          console.log("No bus markers found. All markers have titles.");
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();
