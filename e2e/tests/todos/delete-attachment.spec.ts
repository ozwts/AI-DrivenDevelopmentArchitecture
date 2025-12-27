import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 添付ファイル削除テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("添付ファイル削除", () => {
  let createdTodoId: string | undefined;
  const testFilename = "test-file.txt";

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("正常系 - 添付ファイルを削除できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `添付ファイル削除テスト_${uniqueId}`;
    const testFilePath = path.join(__dirname, "../../fixtures/files/test-file.txt");

    // Setup: ファイル添付付きTODOを作成
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.titleInput.fill(todoTitle);
    await todosPage.selectFile(testFilePath);

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/todos") &&
        !res.url().includes("/todos/") &&
        res.request().method() === "POST"
    );
    await todosPage.submitForm();
    const response = await responsePromise;
    const responseBody = await response.json();
    createdTodoId = responseBody.id;

    // TODOが作成されたことを確認
    await expect(todosPage.getToastWithText("TODO")).toBeVisible();

    // 1. 添付ファイルがあるTODOの詳細ページに遷移する
    await todosPage.gotoDetail(createdTodoId);

    // 添付ファイルセクションが表示されるまで待機
    await expect(todosPage.attachmentSection).toBeVisible();

    // 添付ファイルが表示されていることを確認
    await expect(todosPage.getAttachmentFilename(testFilename)).toBeVisible();

    // 確認ダイアログを受け入れる設定
    page.on("dialog", (dialog) => dialog.accept());

    // 削除APIのレスポンスをキャプチャ
    const deleteResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/attachments/") &&
        res.request().method() === "DELETE"
    );

    // 2. 添付ファイルの削除ボタンをクリック
    await todosPage.getAttachmentDeleteButton(testFilename).click();

    // 削除完了を待つ
    await deleteResponsePromise;

    // Expected Results:
    // - 成功トーストメッセージが表示される
    const successToast = todosPage.getToastWithText("削除");
    await expect(successToast).toBeVisible();

    // - 削除したファイルが添付ファイルセクションから消える
    await expect(todosPage.getAttachmentFilename(testFilename)).not.toBeVisible();

    // - 「添付ファイルなし」メッセージが表示される
    await expect(page.getByText("添付ファイルなし")).toBeVisible();
  });
});
