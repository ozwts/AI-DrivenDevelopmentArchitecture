import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ファイル添付付きTODO作成テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("ファイル添付付きTODO作成", () => {
  let createdTodoId: string | undefined;

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("正常系 - ファイル添付付きTODOを作成できる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `ファイル添付テスト_${uniqueId}`;
    const testFilePath = path.join(__dirname, "../../fixtures/files/test-file.txt");

    // 1. TODO一覧ページ（/todos）に遷移する
    await todosPage.goto();

    // 2. 「新規TODO」ボタンをクリック
    await todosPage.clickNewTodo();

    // 3. タイトル入力欄に「ファイル添付テスト」を入力
    await todosPage.titleInput.fill(todoTitle);

    // 4. ファイル選択ボタンをクリックし、テスト用ファイルを選択
    await todosPage.selectFile(testFilePath);

    // ファイルが選択されたことを確認
    await expect(page.getByTestId("file-count")).toHaveText("1個のファイルを選択中");

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
    // - 成功トーストメッセージが表示される
    const successToast = todosPage.getToastWithText("TODO");
    await expect(successToast).toBeVisible();

    // - TODO詳細ページにリダイレクトされる（ファイルアップロード時は詳細ページに遷移）
    await expect(page).toHaveURL(new RegExp(`/todos/${createdTodoId}`));

    // - 添付ファイルセクションが表示される
    await expect(todosPage.attachmentSection).toBeVisible();

    // - アップロードしたファイルが表示される
    await expect(todosPage.getAttachmentFilename("test-file.txt")).toBeVisible();
  });
});
