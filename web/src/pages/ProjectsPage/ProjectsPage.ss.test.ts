import { test, expect } from "@playwright/test";

test("[SS]プロジェクトページが表示される", async ({ page }) => {
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

  await page.goto("/projects");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロジェクトページ（空の状態）が表示される", async ({ page }) => {
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

  await page.goto("/projects");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロジェクトページ（作成モーダル）が表示される", async ({ page }) => {
  // Math.random() を固定値に置き換え（色のランダム生成を固定）
  await page.addInitScript(() => {
    let counter = 0;
    const fixedRandomValues = [
      0.12345, 0.23456, 0.34567, 0.45678, 0.56789, 0.6789,
    ];
    Math.random = () => {
      const value = fixedRandomValues[counter % fixedRandomValues.length];
      counter++;
      return value;
    };
  });

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

  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/projects");
  await page.waitForLoadState("networkidle");

  // 新規作成ボタンをクリック
  await page.click('button:has-text("新規プロジェクト")');

  // モーダルが表示されるのを待つ
  await page.waitForSelector('[role="dialog"]');

  await expect(page).toHaveScreenshot({ fullPage: true });
});
