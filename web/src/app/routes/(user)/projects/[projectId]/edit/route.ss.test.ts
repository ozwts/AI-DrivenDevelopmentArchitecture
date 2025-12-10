import { test, expect } from "@playwright/test";

test("[SS]プロジェクト編集ページが表示される", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.addInitScript(() => {
    // Math.randomを固定値を返すようにモック（カラーパレットの安定化）
    let callCount = 0;
    const fixedColors = [0x001964, 0x4caf50, 0xffa726, 0xe91e63, 0x9c27b0, 0x00bcd4];
    Math.random = () => fixedColors[callCount++ % fixedColors.length] / 16777215;

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
  await expect(page).toHaveScreenshot({ fullPage: true });
});
