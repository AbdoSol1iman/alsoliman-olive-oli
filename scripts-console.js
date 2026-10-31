const { chromium } = require('playwright-core');

(async () => {
  const routes = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/usr/bin/brave-browser', args: ['--no-sandbox'] });
  for (const route of routes) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const msgs = [];
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') msgs.push(`[${m.type()}] ${m.text()}`); });
    p.on('pageerror', (e) => msgs.push(`[pageerror] ${e.message}`));
    await p.goto(`http://localhost:3210${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(1500);
    console.log(`\n=== ${route} (${msgs.length}) ===`);
    msgs.slice(0, 8).forEach((m) => console.log(m.slice(0, 400)));
    await p.close();
  }
  await b.close();
})();
