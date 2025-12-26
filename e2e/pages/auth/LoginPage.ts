import { type Page, type Locator, expect } from "@playwright/test";

/**
 * ログインページのPage Object
 *
 * セレクタ優先順位: getByRole > getByLabel > getByTestId
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("メールアドレス");
    this.passwordInput = page.getByLabel("パスワード");
    this.submitButton = page.getByRole("button", { name: "ログイン" });
  }

  async goto() {
    await this.page.goto("/auth");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForRedirect() {
    // ログイン成功後、ホーム画面へリダイレクト
    await expect(this.page).not.toHaveURL(/\/auth/);
  }
}
