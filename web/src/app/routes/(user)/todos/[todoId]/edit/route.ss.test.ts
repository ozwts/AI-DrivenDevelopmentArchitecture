import { test, expect } from "@playwright/test";

test("[SS]TODO編集ページが表示される", async ({ page }) => {
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

  await page.goto("/todos/1/edit");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
