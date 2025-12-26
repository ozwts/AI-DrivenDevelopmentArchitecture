import { test, expect } from "@playwright/test";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * PATCH 3値セマンティクステスト - 期限をクリアできる
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 *
 * テスト戦略:
 * - ユニークなタイトルでTODOを作成し、そのTODOのみを操作
 * - Page Objectのメソッドを使用してカードを特定
 */
test.describe("PATCH 3値セマンティクス", () => {
  let createdTodoId: string | undefined;

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("エッジケース - 期限をクリアできる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `期限テストTODO_${uniqueId}`;
    const todoDescription = `期限クリアテスト用_${uniqueId}`;

    // 作成APIのレスポンスをキャプチャ
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/todos") &&
        !res.url().includes("/todos/") &&
        res.request().method() === "POST"
    );

    // 1. TODOを作成（期限日付き）
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.fillTodoForm(todoTitle, todoDescription);
    await todosPage.fillDueDate("2025-12-31");
    await todosPage.submitForm();

    // レスポンスからIDを取得
    const response = await responsePromise;
    const responseBody = await response.json();
    createdTodoId = responseBody.id;

    // 作成成功を確認
    const createToast = todosPage.getToastWithText("TODOを作成しました");
    await expect(createToast).toBeVisible();
    await expect(createToast).toBeHidden({ timeout: 10000 });

    // 2. 作成したTODOの編集ボタンをクリック
    await todosPage.waitForTodoCard(todoDescription);
    await todosPage.clickEditButton(todoDescription);

    // 編集ページへ遷移を確認
    await expect(page).toHaveURL(/\/todos\/[a-f0-9-]+\/edit$/);

    // 3. 期限日が設定されていることを確認してからクリア
    await expect(todosPage.dueDateInput).toHaveValue("2025-12-31");
    await todosPage.clearDueDate();

    // 4. 更新を実行
    await todosPage.clickUpdateButton();

    // Expected Results:
    // 成功トーストが表示される
    const successToast = todosPage.getToastWithText("TODOを更新しました");
    await expect(successToast).toBeVisible();

    // TODO詳細ページに遷移（編集後は詳細ページへリダイレクト）
    await expect(page).toHaveURL(/\/todos\/[a-f0-9-]+$/);

    // 期限がクリアされていることを確認（詳細ページで期限表示がない）
    await expect(page.getByText(/期限:/)).not.toBeVisible();
  });
});
