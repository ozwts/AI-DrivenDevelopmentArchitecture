import { test, expect } from "@playwright/test";

// 固定日時のユーザーデータ（スナップショットテストの再現性のため）
const fixedUserData = {
  id: "user-1",
  sub: "cognito-sub-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  emailVerified: true,
  createdAt: "2024-10-17T03:00:00.000Z", // 2024/10/17 12:00:00 JST
  updatedAt: "2025-01-05T03:00:00.000Z", // 2025/1/5 12:00:00 JST
};

test("[SS]プロフィールページが表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // MSWハンドラーをHAS_ALLモードに設定し、ユーザーデータを固定日時でオーバーライド
  await page.addInitScript((userData) => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
      // /users/me エンドポイントを固定日時のデータでオーバーライド
      msw.worker.use(
        msw.rest.get("*/users/me", (_req: any, res: any, ctx: any) => {
          return res(ctx.json(userData), ctx.status(200));
        }),
      );
    };
    checkMswAndSetHandlers();
  }, fixedUserData);

  await page.goto("/profile");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]プロフィールページ（編集モーダル）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // MSWハンドラーをHAS_ALLモードに設定し、ユーザーデータを固定日時でオーバーライド
  await page.addInitScript((userData) => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
      // /users/me エンドポイントを固定日時のデータでオーバーライド
      msw.worker.use(
        msw.rest.get("*/users/me", (_req: any, res: any, ctx: any) => {
          return res(ctx.json(userData), ctx.status(200));
        }),
      );
    };
    checkMswAndSetHandlers();
  }, fixedUserData);

  await page.goto("/profile");
  await page.waitForLoadState("networkidle");

  // 編集ボタンをクリック（getByRole: 暗黙的a11y検証）
  await page.getByRole("button", { name: "編集" }).click();

  // モーダルのレンダリング完了を待機
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
