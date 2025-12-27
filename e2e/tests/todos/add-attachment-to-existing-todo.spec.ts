import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 既存TODOに添付ファイル追加テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("既存TODOに添付ファイル追加", () => {
  let createdTodoId: string | undefined;
  const testFilename = "test-file.txt";

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("正常系 - 既存TODOに添付ファイルを追加できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `添付ファイル追加テスト_${uniqueId}`;
    const testFilePath = path.join(__dirname, "../../fixtures/files/test-file.txt");

    // Setup: 添付ファイルなしのTODOを作成
    await todosPage.goto();
    await todosPage.clickNewTodo();
    await todosPage.titleInput.fill(todoTitle);

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

    // 1. 添付ファイルがないTODOの詳細ページに遷移する
    await todosPage.gotoDetail(createdTodoId);

    // 添付ファイルセクションが表示されるまで待機
    await expect(todosPage.attachmentSection).toBeVisible();

    // 添付ファイルなしの状態を確認
    await expect(page.getByText("添付ファイルなし")).toBeVisible();

    // 2. ファイルを選択
    await todosPage.selectAttachmentFile(testFilePath);

    // 3. アップロードボタンをクリック
    const uploadResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/attachments") &&
        res.request().method() === "POST"
    );
    await todosPage.clickUploadButton();

    // アップロード完了を待つ
    await uploadResponsePromise;

    // Expected Results:
    // - 成功トーストメッセージが表示される
    const successToast = todosPage.getToastWithText("アップロード");
    await expect(successToast).toBeVisible();

    // - 添付ファイルセクションにアップロードしたファイルが表示される
    await expect(todosPage.getAttachmentFilename(testFilename)).toBeVisible();

    // - 「添付ファイルなし」メッセージが消える
    await expect(page.getByText("添付ファイルなし")).not.toBeVisible();
  });
});
