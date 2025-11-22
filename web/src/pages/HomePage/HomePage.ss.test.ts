import { test, expect } from "@playwright/test";

test("[SS]ホームページが表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // MSWハンドラーをHAS_ALLモードに設定
  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
    };
    checkMswAndSetHandlers();
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]ホームページ（空の状態）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // MSWハンドラーを空データに切り替えるスクリプトをページロード前に注入
  await page.addInitScript(() => {
    // MSWが起動するまで待機してからハンドラーを切り替え
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        // MSWがまだ利用可能でない場合は少し待ってから再試行
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }

      // 空データハンドラーに切り替え
      msw.setHandlers("EMPTY");
    };

    checkMswAndSetHandlers();
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
