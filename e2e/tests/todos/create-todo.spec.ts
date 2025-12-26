import { test, expect } from "@playwright/test";
import { TodosPage } from "../../pages/TodosPage";

/**
 * TODO作成テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("TODO作成", () => {
  test("正常系 - 新規TODOを作成できる", async ({ page }) => {
    const todosPage = new TodosPage(page);

    // 1. TODO一覧ページ（/todos）に遷移する
    await todosPage.goto();

    // 2. 「新規TODO」ボタンをクリック
    await todosPage.clickNewTodo();

    // 3. タイトル入力欄に「E2Eテスト用TODO」を入力
    // 4. 説明入力欄に「これはE2Eテストで作成されたTODOです」を入力
    await todosPage.fillTodoForm(
      "E2Eテスト用TODO",
      "これはE2Eテストで作成されたTODOです"
    );

    // 5. 「作成」ボタンをクリック
    await todosPage.submitForm();

    // Expected Results:
    // - 成功トーストメッセージ「TODOを作成しました」が表示される
    const successToast = todosPage.getSuccessToast();
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText("TODOを作成しました");

    // - TODO一覧ページ（/todos）にリダイレクトされる
    await expect(page).toHaveURL(/\/todos/);

    // - 作成したTODOが一覧に表示される
    const todoHeading = todosPage.getTodoHeading("E2Eテスト用TODO");
    await expect(todoHeading).toBeVisible();
  });
});
