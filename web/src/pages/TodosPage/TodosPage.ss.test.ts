import { test, expect } from "@playwright/test";
import { config } from "../../config";
import urlJoin from "url-join";

test("[SS]TODOページが表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

// FIXME: 正しくフィルター出来ていない
test("[SS]TODOページ（TODOフィルター）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos?status=TODO");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

// FIXME: 正しくフィルターできていない
test("[SS]TODOページ（プロジェクトフィルター）が表示される", async ({
  page,
}) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos?projectId=1");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

// FIXME: 空データで上書きしてもMSWが優先される様子。MSWとの共存方法を模索中
test("[SS]TODOページ（空の状態）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // 空データでモックを上書き
  await page.route(urlJoin(config.apiUrl, "/todos"), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]TODOページ（作成モーダル）が表示される", async ({ page }) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");

  // 新規作成ボタンをクリック
  await page.click('button:has-text("新規TODO")');

  // モーダルが表示されるのを待つ
  await page.waitForSelector('[role="dialog"]');

  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]TODOページ（詳細モーダル・添付ファイルあり）が表示される", async ({
  page,
}) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");

  // 「データベース設計を完了する」の詳細を見るボタンをクリック
  await page.getByTestId("todo-detail-button").first().click();

  // 詳細モーダルが表示されるのを待つ
  await page.waitForSelector('[role="dialog"]');

  // 添付ファイルリストが表示されるのを待つ
  await page.waitForSelector("text=添付ファイル");

  await expect(page).toHaveScreenshot({ fullPage: true });
});

// FIXME: 添付ファイルが表示される
test("[SS]TODOページ（詳細モーダル・添付ファイルなし）が表示される", async ({
  page,
}) => {
  // ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");

  // 「API実装」の詳細を見るボタンをクリック（2番目のカード）
  await page.getByTestId("todo-detail-button").nth(1).click();

  // 詳細モーダルが表示されるのを待つ
  await page.waitForSelector('[role="dialog"]');

  // 添付ファイルセクションが表示されるのを待つ
  await page.waitForSelector("text=添付ファイル");

  // ネットワークが落ち着くのを待つ
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
