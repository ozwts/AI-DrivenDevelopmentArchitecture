import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { TodosPage } from "../../pages/todos/TodosPage";
import { apiClient } from "../../fixtures/api-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 添付ファイルダウンロードテスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("添付ファイルダウンロード", () => {
  let createdTodoId: string | undefined;
  const testFilename = "test-file.txt";

  test.afterEach(async () => {
    if (createdTodoId) {
      await apiClient.delete(`/todos/${createdTodoId}`);
      createdTodoId = undefined;
    }
  });

  test("正常系 - 添付ファイルをダウンロードできる", async ({ page }) => {
    const todosPage = new TodosPage(page);
    const uniqueId = Date.now();
    const todoTitle = `ダウンロードテスト_${uniqueId}`;
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

    // download-url APIのレスポンスをキャプチャ
    const downloadUrlPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/download-url") &&
        res.request().method() === "GET"
    );

    // 新しいタブ/ポップアップを待機
    const popupPromise = page.waitForEvent("popup");

    // 2. 添付ファイルセクションでファイル名のダウンロードボタンをクリック
    await todosPage.getDownloadButton(testFilename).click();

    // Expected Results:
    // - download-url APIが成功する
    const downloadUrlResponse = await downloadUrlPromise;
    expect(downloadUrlResponse.status()).toBe(200);

    // - 新しいタブが開く（S3署名付きURLへのリダイレクト）
    const popup = await popupPromise;
    // S3のURLが開かれることを確認（ローカルではMinIO）
    expect(popup.url()).toMatch(/^https?:\/\//);
  });
});
