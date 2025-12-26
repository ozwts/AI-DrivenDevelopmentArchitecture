import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/auth/LoginPage";

/**
 * 認証異常系テスト
 *
 * テストプラン: 不正な認証情報でエラーメッセージが表示される
 *
 * 参照ポリシー:
 * - guardrails/policy/e2e/30-test-patterns.md (エラーハンドリングパターン)
 * - guardrails/policy/e2e/40-authentication.md (未認証テスト)
 */
test.describe("認証異常系", () => {
  // 未認証状態でテストを実行するため、storageStateをクリア
  test.use({ storageState: { cookies: [], origins: [] } });

  test("不正な認証情報でエラーメッセージが表示される", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 1. ログインページ（/login）に遷移する
    await loginPage.goto();

    // 2. メールアドレス入力欄に「invalid@example.com」を入力
    await loginPage.emailInput.fill("invalid@example.com");

    // 3. パスワード入力欄に「wrongpassword」を入力
    await loginPage.passwordInput.fill("wrongpassword");

    // 4. 「ログイン」ボタンをクリック
    await loginPage.submitButton.click();

    // 期待結果: エラーメッセージ（role="alert"）が表示される
    const errorAlert = page.getByRole("alert");
    await expect(errorAlert).toBeVisible();

    // 期待結果: ログインページに留まる（URLが /auth のまま）
    await expect(page).toHaveURL(/\/auth/);
  });
});
