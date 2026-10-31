const { chromium } = require("playwright-core");

(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/brave-browser", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));

  // ---- login
  await p.goto("http://localhost:3210/admin/login", { waitUntil: "networkidle" });
  await p.fill("#admin-email", "admin@alsuliman.local");
  await p.fill("#admin-password", "alsuliman-dev");
  await p.locator('form:has(#admin-email) button[type="submit"]').click();
  await p.waitForURL("**/admin", { timeout: 20000 });
  console.log("login ok ->", p.url());
  await p.screenshot({ path: "/tmp/opencode/admin-home.png", fullPage: true });

  // ---- order flow: add to cart from shop
  await p.goto("http://localhost:3210/ar/shop", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const addButtons = p.locator('button:has-text("أضف إلى السلة")');
  await addButtons.nth(1).click({ force: true });
  await p.waitForTimeout(900);
  await p.screenshot({ path: "/tmp/opencode/drawer.png" });
  await p.goto("http://localhost:3210/ar/checkout", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.fill("#fullName", "أحمد محمد");
  await p.fill("#phone", "01012345678");
  await p.selectOption("#governorate", "cairo");
  await p.fill("#city", "المعادي");
  await p.fill("#address", "شارع 9، عمارة 12، الدور الثالث");
  await p.locator('form button[type="submit"]').last().click();
  await p.waitForTimeout(4000);
  console.log("after submit url:", p.url());
  const alert = await p.locator('[role="alert"]').allInnerTexts();
  console.log("alerts:", alert);
  console.log("field errors:", await p.locator('.text-red-800').allInnerTexts());
  await p.screenshot({ path: "/tmp/opencode/checkout-after.png", fullPage: true });
  await p.waitForURL("**/ar/order/**", { timeout: 25000 });
  const ref = p.url().split("/").pop();
  console.log("order ok ->", ref);
  await p.waitForTimeout(600);
  await p.screenshot({ path: "/tmp/opencode/order.png", fullPage: true });

  // ---- admin sees it
  await p.goto("http://localhost:3210/admin/orders", { waitUntil: "networkidle" });
  await p.screenshot({ path: "/tmp/opencode/admin-orders.png", fullPage: true });
  await p.goto(`http://localhost:3210/admin/orders/${ref}`, { waitUntil: "networkidle" });
  await p.screenshot({ path: "/tmp/opencode/admin-order.png", fullPage: true });

  console.log("errors:", errs.slice(0, 6));
  await b.close();
})();
