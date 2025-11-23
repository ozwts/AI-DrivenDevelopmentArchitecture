import { test, expect } from "@playwright/test";

test("[SS]サインアップページが表示される", async ({ page }) => {
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

  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]サインアップページ（確認コード入力）が表示される", async ({
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

  await page.goto("/signup");
  await page.waitForLoadState("networkidle");

  // サインアップフォームに入力
  await page.getByTestId("email-input").fill("test@example.com");
  await page.getByTestId("password-input").fill("TestPassword123!");
  await page.getByTestId("confirm-password-input").fill("TestPassword123!");

  // サインアップボタンをクリック
  await page.getByTestId("submit-button").click();

  // 確認コード入力フォームが表示されるのを待つ
  await page.getByTestId("confirmation-code-input").waitFor({ timeout: 5000 });

  await expect(page).toHaveScreenshot({ fullPage: true });
});
