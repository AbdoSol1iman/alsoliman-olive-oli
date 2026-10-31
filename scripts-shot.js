const { chromium } = require('playwright-core');

(async () => {
  const url = process.argv[2] || 'http://localhost:3210/ar';
  const out = process.argv[3] || '/tmp/opencode/shot';
  const width = Number(process.argv[4] || 1440);
  const height = Number(process.argv[5] || 900);
  const b = await chromium.launch({ executablePath: '/usr/bin/brave-browser', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: 'networkidle' });
  // walk the page so every reveal + lazy image resolves
  const total = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 500) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(90);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}-full.png`, fullPage: true });
  await p.screenshot({ path: `${out}-top.png` });
  const errors = [];
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  console.log('ok', out, 'height', total, errors.length ? errors : '');
  await b.close();
})();
