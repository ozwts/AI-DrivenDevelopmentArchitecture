import { test, expect } from "@playwright/test";

test("[SS]プロジェクト編集ページが表示される", async ({ page }) => {
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

  await page.goto("/projects/project-1/edit");
  await page.waitForLoadState("networkidle");

  // カラーパレットはランダム生成のためマスクする
  const colorOptions = await page.locator('[data-testid^="color-option-"]').all();
  await expect(page).toHaveScreenshot({ fullPage: true, mask: colorOptions });
});
