import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * プロジェクト作成テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("プロジェクト作成", () => {
  let createdProjectId: string | undefined;

  test.afterEach(async () => {
    if (createdProjectId) {
      await apiClient.delete(`/projects/${createdProjectId}`);
      createdProjectId = undefined;
    }
  });

  test("正常系 - 新規プロジェクトを作成できる", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const uniqueId = Date.now();
    const projectName = `E2Eテストプロジェクト_${uniqueId}`;

    // 1. プロジェクト一覧ページ（/projects）に遷移する
    await projectsPage.goto();

    // 2. 「新規プロジェクト」ボタンをクリック
    await projectsPage.clickNewProject();

    // 3. プロジェクト名入力欄にユニークな名前を入力
    // 4. 説明入力欄に説明を入力
    await projectsPage.fillProjectForm(
      projectName,
      "これはE2Eテストで作成されたプロジェクトです"
    );

    // 作成APIのレスポンスをキャプチャ
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/projects") &&
        !res.url().includes("/projects/") &&
        res.request().method() === "POST"
    );

    // 5. 「作成」ボタンをクリック
    await projectsPage.submitForm();

    // レスポンスからIDを取得
    const response = await responsePromise;
    const responseBody = await response.json();
    createdProjectId = responseBody.id;

    // Expected Results:
    // - 成功トーストメッセージ「プロジェクトを作成しました」が表示される
    const successToast = projectsPage.getToastWithText("プロジェクトを作成しました");
    await expect(successToast).toBeVisible();

    // - プロジェクト一覧ページ（/projects）にリダイレクトされる
    await expect(page).toHaveURL("/projects");

    // - 作成したプロジェクトが一覧に表示される
    const projectHeading = projectsPage.getProjectHeading(projectName);
    await expect(projectHeading).toBeVisible();
  });
});
