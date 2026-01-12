import { test, expect } from "@playwright/test";
import { ProjectsPage } from "../../pages/projects/ProjectsPage";
import { ProjectDetailPage } from "../../pages/projects/ProjectDetailPage";
import { apiClient } from "../../fixtures/api-client";

/**
 * メンバー削除テスト
 *
 * 前提条件:
 * - 認証済み状態 (auth.setup.ts)
 * - 招待可能な別ユーザーが存在する
 *
 * 注意: このテストは複数ユーザーが必要です。
 * 単一ユーザー環境ではスキップされます。
 */
test.describe("メンバー削除", () => {
  let createdProjectId: string | undefined;
  let invitableUser: { id: string; name: string } | undefined;

  test.beforeAll(async () => {
    // 招待可能なユーザーを検索
    const response = await apiClient.get("/users");
    if (response.ok) {
      const users = await response.json();
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

  test("正常系 - オーナーがメンバーを削除できる", async ({ page }) => {
    // 招待可能なユーザーがいない場合はスキップ
    test.skip(!invitableUser, "招待可能なユーザーがいません");

    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const uniqueId = Date.now();
    const projectName = `E2E削除テスト_${uniqueId}`;

    // 1. プロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(projectName, "削除テスト用プロジェクト");

    const createResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/projects") &&
        !res.url().includes("/projects/") &&
        res.request().method() === "POST"
    );

    await projectsPage.submitForm();

    const createResponse = await createResponsePromise;
    const createResponseBody = await createResponse.json();
    createdProjectId = createResponseBody.id;

    // 2. プロジェクト詳細ページに遷移
    await projectDetailPage.goto(createdProjectId!);

    // 3. メンバーを招待（APIで直接実行）
    await fetch(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/projects/${createdProjectId!}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ userId: invitableUser!.id }),
      }
    );

    // 4. ページをリロードして招待したメンバーを表示
    await page.reload();
    await expect(projectDetailPage.memberSection).toBeVisible();

    // メンバーが表示されていることを確認
    const memberCard = projectDetailPage.getMemberCard(invitableUser!.name);
    await expect(memberCard).toBeVisible();

    // 5. confirmダイアログを受け入れる設定
    page.on("dialog", (dialog) => dialog.accept());

    // 6. メンバーを削除
    const deleteResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/members/") && res.request().method() === "DELETE"
    );

    await projectDetailPage.clickDeleteMember(invitableUser!.name);
    await deleteResponsePromise;

    // Expected Results:
    // - 削除したユーザーがメンバー一覧から消える
    await expect(memberCard).not.toBeVisible();
  });

  test("正常系 - オーナー自身の削除ボタンは表示されない", async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const uniqueId = Date.now();
    const projectName = `E2Eオーナー削除不可テスト_${uniqueId}`;

    // 1. プロジェクトを作成
    await projectsPage.goto();
    await projectsPage.clickNewProject();
    await projectsPage.fillProjectForm(
      projectName,
      "オーナー削除不可テスト用プロジェクト"
    );

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
    // - オーナーバッジは表示される
    const ownerBadge = page.getByText("オーナー");
    await expect(ownerBadge).toBeVisible();

    // - オーナーの削除ボタンは表示されない（aria-labelで検索しても見つからない）
    const deleteButtons = page.getByRole("button", { name: /を削除$/ });
    await expect(deleteButtons).toHaveCount(0);
  });
});

/**
 * アクセストークンを取得
 */
async function getAccessToken(): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const authFile = path.join(__dirname, "../../playwright/.auth/user.json");

  if (!fs.existsSync(authFile)) {
    return "";
  }

  const authData = JSON.parse(fs.readFileSync(authFile, "utf-8"));
  const localStorage = authData.origins?.[0]?.localStorage || [];
  const tokenEntry = localStorage.find((item: { name: string }) =>
    item.name.endsWith(".accessToken")
  );

  return tokenEntry?.value || "";
}
