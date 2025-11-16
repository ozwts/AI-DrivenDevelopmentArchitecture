import { test, expect } from "@playwright/test";
import { config } from "../../config";
import urlJoin from "url-join";

test("[SS]ホームページが表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

// FIXME: 空データで上書きしてもMSWが優先される様子。MSWとの共存方法を模索中
test("[SS]ホームページ（空の状態）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // 空データでモックを上書き
  await page.route(urlJoin(config.apiUrl, "/todos"), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );
  await page.route(urlJoin(config.apiUrl, "/projects"), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
