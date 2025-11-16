import { test, expect } from "@playwright/test";

test("[SS]プロフィールページが表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/profile");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロフィールページ（編集モーダル）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/profile");
  await page.waitForLoadState("networkidle");

  // 編集ボタンをクリック
  await page.click('button:has-text("編集")');

  // モーダルが表示されるのを待つ
  await page.waitForSelector('[role="dialog"]');

  await expect(page).toHaveScreenshot({ fullPage: true });
});
