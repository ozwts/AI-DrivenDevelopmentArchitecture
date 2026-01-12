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

test("[SS]プロジェクト詳細ページ（招待ダイアログ表示）", async ({ page }) => {
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

  // 招待ボタンをクリック
  await page.getByRole("button", { name: "招待" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロジェクト詳細ページ（メンバー削除確認ダイアログ表示）", async ({
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

  // メンバーの削除ボタンをクリック（最初のメンバー以外）
  const deleteButtons = page.getByRole("button", { name: /削除/ });
  await deleteButtons.first().click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロジェクト詳細ページ（脱退確認ダイアログ表示）", async ({ page }) => {
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

  // 脱退ボタンをクリック
  await page.getByRole("button", { name: "脱退" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
