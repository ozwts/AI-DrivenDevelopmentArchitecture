import { test, expect } from "@playwright/test";

/**
 * TODOステータスフィルタリングテスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("TODOフィルタリング", () => {
  test("正常系 - ステータスでTODOをフィルタリングできる", async ({ page }) => {
    // 1. TODO一覧ページに遷移する
    await page.goto("/todos");

    // 2. ステータスフィルタドロップダウンで「完了」を選択
    const statusFilter = page.getByRole("combobox").first();
    await expect(statusFilter).toBeVisible();
    await statusFilter.selectOption("COMPLETED");

    // Expected Results:
    // - URLのクエリパラメータに「?status=COMPLETED」が追加される
    await expect(page).toHaveURL(/status=COMPLETED/);
  });
});
