import { test, expect } from "@playwright/test";
import { HomePage } from "../../pages/HomePage";

/**
 * ホーム画面の統計情報表示テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("ホーム画面", () => {
  test("正常系 - ホーム画面に統計情報が表示される", async ({ page }) => {
    const homePage = new HomePage(page);

    // 1. ホーム画面（/）に遷移する
    await homePage.goto();

    // Expected Results: ページタイトル「TODO App」が表示される
    await expect(homePage.pageTitle).toBeVisible();
    await expect(homePage.pageTitle).toHaveText("TODO App");

    // Expected Results: 統計グリッドが表示される
    // Expected Results: 未着手、進行中、完了の各ステータスのカウントが表示される
    await expect(homePage.todoCountStatus).toBeVisible();
    await expect(homePage.inProgressCountStatus).toBeVisible();
    await expect(homePage.doneCountStatus).toBeVisible();

    // カウントが数値であることを確認
    const todoCount = await homePage.getTodoCount();
    const inProgressCount = await homePage.getInProgressCount();
    const doneCount = await homePage.getDoneCount();

    expect(todoCount).toMatch(/^\d+$/);
    expect(inProgressCount).toMatch(/^\d+$/);
    expect(doneCount).toMatch(/^\d+$/);
  });
});
