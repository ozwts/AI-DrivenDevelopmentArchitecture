import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/ProjectsPage";

/**
 * プロジェクト削除テスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 *
 * テスト戦略:
 * - ユニークな名前でプロジェクトを作成し、そのプロジェクトを削除
 * - 削除後にリストから消えていることを確認
 */
test.describe("プロジェクト削除", () => {
  test("正常系 - プロジェクトを削除できる", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const uniqueId = Date.now();
    const projectName = `削除テストプロジェクト_${uniqueId}`;
    const projectDescription = `削除テスト用_${uniqueId}`;

    // 1. テスト用のプロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, projectDescription);
    await projectsPage.submitForm();

    // 作成成功を確認
    const createToast = projectsPage.getToastWithText("プロジェクトを作成しました");
    await expect(createToast).toBeVisible();
    await expect(createToast).toBeHidden({ timeout: 10000 });

    // 2. 作成したプロジェクトが一覧に表示されることを確認
    const projectHeading = projectsPage.getProjectHeading(projectName);
    await expect(projectHeading).toBeVisible();

    // 3. 作成したプロジェクトの削除ボタンをクリック
    await projectsPage.clickDeleteButton(projectDescription);

    // 4. 削除確認モーダルが表示される
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // 5. モーダルの「削除」ボタンをクリック
    const confirmDeleteButton = modal.getByRole("button", { name: "削除" });
    await confirmDeleteButton.click();

    // Expected Results:
    // - 成功トーストメッセージ「プロジェクトを削除しました」が表示される
    const successToast = projectsPage.getToastWithText("プロジェクトを削除しました");
    await expect(successToast).toBeVisible();

    // - 削除したプロジェクトがリストから消えていることを確認
    await expect(projectHeading).not.toBeVisible();
  });
});
