import { test, expect } from "@playwright/test";
import { TodosPage } from "../../pages/TodosPage";

/**
 * TODO削除テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 *
 * テスト戦略:
 * - ユニークなタイトルでTODOを作成し、そのTODOを削除
 * - 削除後にリストから消えていることを確認
 */
test.describe("TODO削除", () => {
  test("正常系 - TODOを削除できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `削除テストTODO_${uniqueId}`;
    const todoDescription = `削除テスト用_${uniqueId}`;

    // 確認ダイアログのハンドラを事前に設定
    page.on("dialog", (dialog) => dialog.accept());

    // 1. テスト用のTODOを作成
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.fillTodoForm(todoTitle, todoDescription);
    await todosPage.submitForm();

    // 作成成功を確認
    const createToast = todosPage.getToastWithText("TODOを作成しました");
    await expect(createToast).toBeVisible();
    await expect(createToast).toBeHidden({ timeout: 10000 });

    // 2. 作成したTODOが一覧に表示されることを確認
    await todosPage.waitForTodoCard(todoDescription);
    const todoHeading = todosPage.getTodoHeading(todoTitle);
    await expect(todoHeading).toBeVisible();

    // 3. 作成したTODOの削除ボタンをクリック
    await todosPage.clickDeleteButton(todoDescription);

    // Expected Results:
    // - 成功トーストメッセージ「TODOを削除しました」が表示される
    const successToast = todosPage.getToastWithText("TODOを削除しました");
    await expect(successToast).toBeVisible();

    // - 削除したTODOがリストから消えていることを確認
    await expect(todoHeading).not.toBeVisible();
  });
});
