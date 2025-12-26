import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/ProjectsPage";

/**
 * プロジェクト作成テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("プロジェクト作成", () => {
  test("正常系 - 新規プロジェクトを作成できる", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);

    // 1. プロジェクト一覧ページ（/projects）に遷移する
    await projectsPage.goto();

    // 2. 「新規プロジェクト」ボタンをクリック
    await projectsPage.clickNewProject();

    // 3. プロジェクト名入力欄に「E2Eテストプロジェクト」を入力
    // 4. 説明入力欄に「これはE2Eテストで作成されたプロジェクトです」を入力
    await projectsPage.fillProjectForm(
      "E2Eテストプロジェクト",
      "これはE2Eテストで作成されたプロジェクトです"
    );

    // 5. 「作成」ボタンをクリック
    await projectsPage.submitForm();

    // Expected Results:
    // - 成功トーストメッセージ「プロジェクトを作成しました」が表示される
    const successToast = projectsPage.getSuccessToast();
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText("プロジェクトを作成しました");

    // - プロジェクト一覧ページ（/projects）にリダイレクトされる
    await expect(page).toHaveURL("/projects");

    // - 作成したプロジェクトが一覧に表示される
    const projectHeading = projectsPage.getProjectHeading("E2Eテストプロジェクト");
    await expect(projectHeading).toBeVisible();
  });
});
