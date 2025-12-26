import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";

/**
 * プロジェクトでTODOをフィルタリングするテスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("プロジェクトフィルタリング", () => {
  test("正常系 - プロジェクトでTODOをフィルタリングできる", async ({
    page,
  }) => {
    const projectsPage = new ProjectsPage(page);

    // 1. プロジェクト一覧ページに遷移する
    await projectsPage.goto();

    // 2. 最初のプロジェクトカードの見出しを取得
    const projectHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(projectHeading).toBeVisible({ timeout: 10000 });

    // 3. プロジェクトカードをクリック
    await projectHeading.click();

    // Expected Results:
    // - TODO一覧ページ（/todos）に遷移する
    // - URLのクエリパラメータに「?projectId=」が含まれる
    await expect(page).toHaveURL(/\/todos/);
    await expect(page).toHaveURL(/projectId=/);
  });
});
