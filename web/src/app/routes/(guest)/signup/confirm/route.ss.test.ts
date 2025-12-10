import { test, expect } from "@playwright/test";

test("[SS]サインアップ確認ページが表示される", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // 確認ページはメールパラメータが必要
  await page.goto("/signup/confirm?email=test@example.com");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
