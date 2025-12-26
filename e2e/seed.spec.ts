import { test, expect } from "@playwright/test";

/**
 * シードファイル
 *
 * Playwright Test Agentがテスト生成時にページの初期状態をセットアップするために使用。
 * このテストを実行後、エージェントがブラウザを操作してテストコードを生成する。
 */
test.describe("E2E Test Seed", () => {
  test("seed", async ({ page }) => {
    // ログインページに遷移（認証が必要な場合）
    await page.goto("/auth");
  });
});
