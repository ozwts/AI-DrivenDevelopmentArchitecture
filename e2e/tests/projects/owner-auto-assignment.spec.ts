import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";
import { ProjectDetailPage } from "../../pages/projects/ProjectDetailPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * プロジェクトオーナー自動割り当てテスト
 *
 * 前提条件: 認証済み状態 (auth.setup.ts)
 */
test.describe("プロジェクトオーナー自動割り当て", () => {
  let createdProjectId: string | undefined;

  test.afterEach(async () => {
    if (createdProjectId) {
      await apiClient.delete(`/projects/${createdProjectId}`);
      createdProjectId = undefined;
    }
  });

  test("正常系 - プロジェクト作成者が自動的にオーナーになる", async ({
    page,
  }) => {
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const uniqueId = Date.now();
    const projectName = `E2Eオーナーテスト_${uniqueId}`;

    // 1. プロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(
      projectName,
      "オーナー自動割り当てテスト用プロジェクト"
    );

    // 作成APIのレスポンスをキャプチャ
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/projects") &&
        !res.url().includes("/projects/") &&
        res.request().method() === "POST"
    );

    await projectsPage.submitForm();

    const response = await responsePromise;
    const responseBody = await response.json();
    createdProjectId = responseBody.id;

    // 2. 作成成功を確認
    const successToast = projectsPage.getToastWithText(
      "プロジェクトを作成しました"
    );
    await expect(successToast).toBeVisible();

    // 3. プロジェクト詳細ページに遷移
    await projectDetailPage.goto(createdProjectId!);

    // Expected Results:
    // - プロジェクトメンバーセクションが表示される
    await expect(projectDetailPage.memberSection).toBeVisible();

    // - 作成者がメンバー一覧に表示される（オーナーバッジ付き）
    // 注: E2Eユーザーの名前はメールアドレスから生成される
    const ownerBadge = page.getByText("オーナー");
    await expect(ownerBadge).toBeVisible();

    // - 招待ボタンが表示される（オーナーのみに表示）
    await expect(projectDetailPage.inviteButton).toBeVisible();

    // - 脱退ボタンは表示されない（オーナーは脱退不可）
    await expect(projectDetailPage.leaveButton).not.toBeVisible();
  });
});
