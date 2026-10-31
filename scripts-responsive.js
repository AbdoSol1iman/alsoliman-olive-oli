const { chromium } = require('playwright-core');

const routes = process.argv.slice(2);
const widths = [320, 390, 768, 1280, 1920];

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/brave-browser', args: ['--no-sandbox'] });
  let bad = 0;
  for (const route of routes) {
    const row = [];
    for (const w of widths) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`http://localhost:3210${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(1100);
      const r = await p.evaluate(() => {
        const de = document.documentElement;
        const over = de.scrollWidth - de.clientWidth;
        let worst = null;
        if (over > 1) {
          for (const el of document.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0) continue;
            if (rect.right > de.clientWidth + 1 || rect.left < -1) {
              if (!worst || rect.width > worst.w) {
                worst = { w: Math.round(rect.width), tag: el.tagName, cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 90), right: Math.round(rect.right), left: Math.round(rect.left) };
              }
            }
          }
        }
        return { over, worst };
      });
      if (r.over > 1 || errs.length) {
        bad++;
        row.push(`  ${w}px: overflow=${r.over} ${r.worst ? JSON.stringify(r.worst) : ''} ${errs.length ? 'ERR ' + errs[0].slice(0, 120) : ''}`);
      }
      await p.close();
    }
    if (row.length) console.log(route + '\n' + row.join('\n'));
    else console.log(`${route}  ok`);
  }
  console.log(bad === 0 ? '\nALL CLEAN' : `\n${bad} problem viewports`);
  await b.close();
})();
