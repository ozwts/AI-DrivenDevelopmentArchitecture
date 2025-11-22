import { test, expect } from "@playwright/test";

test("[SS]パスワードリセットページが表示される", async ({ page }) => {
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

  await page.goto("/reset-password");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]パスワードリセットページ（新しいパスワード設定）が表示される", async ({
  page,
}) => {
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

  await page.goto("/reset-password");
  await page.waitForLoadState("networkidle");

  // メールアドレス入力
  await page.fill('input[type="email"]', "test@example.com");

  // 確認コード送信ボタンをクリック（実際には送信されないが、UIの状態変更のみ）
  // MSWでモックされているため、ステップが進む
  await page.click('button[type="submit"]');

  // ステップ変更を待機（confirmステップに移行）
  await page.waitForSelector('input[id="confirmationCode"]', {
    timeout: 5000,
  });

  await expect(page).toHaveScreenshot({ fullPage: true });
});
