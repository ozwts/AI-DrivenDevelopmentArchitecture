import { test, expect } from "@playwright/test";
import { TodosPage } from "../../pages/TodosPage";

/**
 * TODOステータス変更テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 *
 * テスト戦略:
 * - ユニークなタイトル・説明文でTODOを作成し、そのTODOのみを操作
 * - Page Objectのメソッドを使用してカードを特定
 */
test.describe("TODOステータス変更", () => {
  test("正常系 - TODOのステータスを変更できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `ステータステストTODO_${uniqueId}`;
    const todoDescription = `ステータス変更テスト用_${uniqueId}`;

    // 1. TODOを作成
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.fillTodoForm(todoTitle, todoDescription);
    await todosPage.submitForm();

    // 作成成功を確認
    const createToast = todosPage.getToastWithText("TODOを作成しました");
    await expect(createToast).toBeVisible();
    await expect(createToast).toBeHidden({ timeout: 10000 });

    // 2. 作成したTODOカードを特定して開始ボタンをクリック
    await todosPage.waitForTodoCard(todoDescription);
    await todosPage.clickStartButton(todoDescription);

    // Expected Results:
    // - 成功トーストメッセージ「ステータスを更新しました」が表示される
    const successToast = todosPage.getToastWithText("ステータスを更新しました");
    await expect(successToast).toBeVisible();

    // - ステータスが「進行中」に変更されていることを確認
    const todoCard = todosPage.getTodoCard(todoDescription);
    await expect(todoCard.getByText("進行中")).toBeVisible();
  });
});
