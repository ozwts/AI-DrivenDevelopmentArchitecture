import { test, expect } from "@playwright/test";

test("[SS]プロジェクト詳細ページが表示される", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

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

  await page.goto("/projects/project-1");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロジェクト詳細ページ（メンバー招待ダイアログ）", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

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

  await page.goto("/projects/project-1");
  await page.waitForLoadState("networkidle");

  // 招待ボタンをクリックしてダイアログを開く
  await page.getByRole("button", { name: "招待" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
