import { test as setup, expect } from "@playwright/test";
import { E2E_USER } from "../fixtures/auth";
import { LoginPage } from "../pages/LoginPage";

const authFile = "playwright/.auth/user.json";

/**
 * 認証セットアップ
 *
 * テスト実行前に一度だけ実行され、認証状態を保存する。
 * 各テストはこの認証状態を再利用する。
 */
setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(E2E_USER.email, E2E_USER.password);
  await loginPage.waitForRedirect();

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
