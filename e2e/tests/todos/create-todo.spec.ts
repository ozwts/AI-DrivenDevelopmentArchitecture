import { test, expect } from "@playwright/test";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * TODO作成テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("TODO作成", () => {
  let createdTodoId: string | undefined;

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("正常系 - 新規TODOを作成できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `E2Eテスト用TODO_${uniqueId}`;

    // 1. TODO一覧ページ（/todos）に遷移する
    await todosPage.goto();

    // 2. 「新規TODO」ボタンをクリック
    await todosPage.clickNewTodo();

    // 3. タイトル入力欄にユニークなタイトルを入力
    // 4. 説明入力欄に説明を入力
    await todosPage.fillTodoForm(
      todoTitle,
      "これはE2Eテストで作成されたTODOです"
    );

    // 作成APIのレスポンスをキャプチャ
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/todos") &&
        !res.url().includes("/todos/") &&
        res.request().method() === "POST"
    );

    // 5. 「作成」ボタンをクリック
    await todosPage.submitForm();

    // レスポンスからIDを取得
    const response = await responsePromise;
    const responseBody = await response.json();
    createdTodoId = responseBody.id;

    // Expected Results:
    // - 成功トーストメッセージ「TODOを作成しました」が表示される
    const successToast = todosPage.getToastWithText("TODOを作成しました");
    await expect(successToast).toBeVisible();

    // - TODO一覧ページ（/todos）にリダイレクトされる
    await expect(page).toHaveURL(/\/todos/);

    // - 作成したTODOが一覧に表示される
    const todoHeading = todosPage.getTodoHeading(todoTitle);
    await expect(todoHeading).toBeVisible();
  });
});
