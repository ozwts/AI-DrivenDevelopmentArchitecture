import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/LoginPage";
import { E2E_USER } from "../../fixtures/auth";

/**
 * 認証フロー - ログイン成功テスト
 *
 * 未認証状態でログインプロセスをテストする。
 * 認証セットアップとは独立して、ログインフロー自体の動作を検証する。
 */

// 未認証状態でテストを実行
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("認証フロー", () => {
  test("正常系 - 有効な認証情報でログインできる", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 1. ログインページ（/auth）に遷移する
    await loginPage.goto();

    // 2. メールアドレス入力欄にE2Eユーザーのメールアドレスを入力
    // 3. パスワード入力欄にE2Eユーザーのパスワードを入力
    // 4. 「ログイン」ボタンをクリック
    await loginPage.login(E2E_USER.email, E2E_USER.password);

    // Expected Results:
    // - ホーム画面（/）にリダイレクトされる
    await expect(page).toHaveURL("/");

    // - URL が /auth でないことを確認
    await loginPage.waitForRedirect();
  });
});
