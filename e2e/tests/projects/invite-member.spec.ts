import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";
import { ProjectDetailPage } from "../../pages/projects/ProjectDetailPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * メンバー招待テスト
 *
 * 前提条件:
 * - 認証済み状態 (auth.setup.ts)
 * - 招待可能な別ユーザーが存在する
 *
 * 注意: このテストは複数ユーザーが必要です。
 * 単一ユーザー環境ではスキップされます。
 */
test.describe("メンバー招待", () => {
  let createdProjectId: string | undefined;
  let invitableUser: { id: string; name: string } | undefined;

  test.beforeAll(async () => {
    // 招待可能なユーザーを検索
    const response = await apiClient.get("/users");
    if (response.ok) {
      const users = await response.json();
      // E2Eユーザー以外のユーザーを探す
      invitableUser = users.find(
        (u: { email: string; name: string; id: string }) =>
          !u.email.includes("e2e-test")
      );
    }
  });

  test.afterEach(async () => {
    if (createdProjectId) {
      await apiClient.delete(`/projects/${createdProjectId}`);
      createdProjectId = undefined;
    }
  });

  test("正常系 - オーナーがユーザー名検索でメンバーを招待できる", async ({
    page,
  }) => {
    // 招待可能なユーザーがいない場合はスキップ
    test.skip(!invitableUser, "招待可能なユーザーがいません");

    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const uniqueId = Date.now();
    const projectName = `E2E招待テスト_${uniqueId}`;

    // 1. プロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, "招待テスト用プロジェクト");

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

    await projectsPage.getToastWithText("プロジェクトを作成しました");

    // 2. プロジェクト詳細ページに遷移
    await projectDetailPage.goto(createdProjectId!);
    await expect(projectDetailPage.memberSection).toBeVisible();

    // 3. 招待ダイアログを開く
    await projectDetailPage.clickInviteButton();

    // 4. ユーザーを検索
    await projectDetailPage.searchUser(invitableUser!.name);

    // 検索結果が表示されるまで待機
    await expect(
      page.getByText(invitableUser!.name, { exact: true })
    ).toBeVisible();

    // 5. ユーザーを選択
    await projectDetailPage.selectUser(invitableUser!.name);

    // 6. 招待を実行
    const inviteResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/members") && res.request().method() === "POST"
    );

    await projectDetailPage.clickInviteSubmit();
    await inviteResponsePromise;

    // Expected Results:
    // - 招待したユーザーがメンバー一覧に表示される
    const memberCard = projectDetailPage.getMemberCard(invitableUser!.name);
    await expect(memberCard).toBeVisible();

    // - 招待したユーザーはオーナーバッジを持たない
    const ownerBadge = projectDetailPage.getOwnerBadge(invitableUser!.name);
    await expect(ownerBadge).not.toBeVisible();
  });
});
