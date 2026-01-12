import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";
import { ProjectDetailPage } from "../../pages/projects/ProjectDetailPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * プロジェクト脱退テスト
 *
 * 前提条件:
 * - 認証済み状態 (auth.setup.ts)
 *
 * 注意:
 * - オーナーは脱退できない（オーナー視点のテストは単一ユーザーで実行可能）
 * - メンバー脱退テストは、別ユーザーがオーナーのプロジェクトに招待される必要あり
 */
test.describe("プロジェクト脱退", () => {
  let createdProjectId: string | undefined;

  test.afterEach(async () => {
    if (createdProjectId) {
      await apiClient.delete(`/projects/${createdProjectId}`);
      createdProjectId = undefined;
    }
  });

  test("正常系 - オーナーには脱退ボタンが表示されない", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const uniqueId = Date.now();
    const projectName = `E2E脱退テスト_${uniqueId}`;

    // 1. プロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, "脱退テスト用プロジェクト");

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

    // 2. プロジェクト詳細ページに遷移
    await projectDetailPage.goto(createdProjectId!);
    await expect(projectDetailPage.memberSection).toBeVisible();

    // Expected Results:
    // - オーナーバッジが表示される
    const ownerBadge = page.getByText("オーナー");
    await expect(ownerBadge).toBeVisible();

    // - 脱退ボタンは表示されない（オーナーは脱退不可）
    await expect(projectDetailPage.leaveButton).not.toBeVisible();
  });

  /**
   * 注意: このテストは別ユーザーがオーナーのプロジェクトにE2Eユーザーが
   * メンバーとして招待されている状態が必要です。
   * 実行環境によってはスキップされます。
   */
  test.skip("正常系 - メンバーがプロジェクトから脱退できる", async ({
    page,
  }) => {
    // このテストを実行するには:
    // 1. 別ユーザーがプロジェクトを作成
    // 2. そのプロジェクトにE2Eユーザーを招待
    // 3. E2Eユーザーとしてログインし、脱退をテスト
    //
    // 現在のE2E環境では単一ユーザーのみのため、スキップ
    const projectDetailPage = new ProjectDetailPage(page);

    // 仮のプロジェクトID（実際のテストでは動的に取得）
    const memberProjectId = "member-project-id";

    // プロジェクト詳細ページに遷移
    await projectDetailPage.goto(memberProjectId);

    // 脱退ボタンが表示される（メンバーの場合）
    await expect(projectDetailPage.leaveButton).toBeVisible();

    // confirmダイアログを受け入れる
    page.on("dialog", (dialog) => dialog.accept());

    // 脱退を実行
    await projectDetailPage.clickLeaveButton();

    // 脱退後はプロジェクト一覧に遷移
    await expect(page).toHaveURL("/projects");
  });
});
