import { type Page, type Locator } from "@playwright/test";

/**
 * プロジェクト詳細ページのPage Object
 *
 * セレクタ優先順位: getByRole > getByLabel > getByTestId
 */
export class ProjectDetailPage {
  readonly page: Page;
  readonly memberSection: Locator;
  readonly inviteButton: Locator;
  readonly leaveButton: Locator;
  readonly searchInput: Locator;
  readonly inviteSubmitButton: Locator;
  readonly cancelButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.memberSection = page.getByRole("heading", {
      name: /プロジェクトメンバー/,
    });
    this.inviteButton = page.getByRole("button", { name: "招待" });
    this.leaveButton = page.getByRole("button", {
      name: "このプロジェクトから脱退",
    });
    this.searchInput = page.getByLabel("ユーザーを検索");
    this.inviteSubmitButton = page.getByRole("button", { name: "招待する" });
    this.cancelButton = page.getByRole("button", { name: "キャンセル" });
    this.toast = page.getByRole("alert");
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  /**
   * メンバーカードを取得（ユーザー名で特定）
   */
  getMemberCard(userName: string): Locator {
    return this.page.locator("div").filter({
      has: this.page.getByText(userName, { exact: true }),
    });
  }

  /**
   * オーナーバッジを取得（ユーザー名で特定）
   */
  getOwnerBadge(userName: string): Locator {
    return this.getMemberCard(userName).getByText("オーナー");
  }

  /**
   * 特定メンバーの削除ボタンを取得
   */
  getDeleteMemberButton(userName: string): Locator {
    return this.getMemberCard(userName).getByRole("button", {
      name: `${userName}を削除`,
    });
  }

  /**
   * 招待ボタンをクリック
   */
  async clickInviteButton() {
    await this.inviteButton.click();
  }

  /**
   * ユーザー検索
   */
  async searchUser(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * 検索結果からユーザーを選択
   */
  async selectUser(userName: string) {
    await this.page
      .getByRole("button")
      .filter({ has: this.page.getByText(userName, { exact: true }) })
      .click();
  }

  /**
   * 招待を実行
   */
  async clickInviteSubmit() {
    await this.inviteSubmitButton.click();
  }

  /**
   * メンバー削除ボタンをクリック
   */
  async clickDeleteMember(userName: string) {
    await this.getDeleteMemberButton(userName).click();
  }

  /**
   * 脱退ボタンをクリック
   */
  async clickLeaveButton() {
    await this.leaveButton.click();
  }

  /**
   * confirmダイアログを受け入れ
   */
  async acceptDialog() {
    this.page.on("dialog", (dialog) => dialog.accept());
  }

  /**
   * 特定メッセージのトーストを取得
   */
  getToastWithText(text: string): Locator {
    return this.toast.filter({ hasText: text });
  }

  /**
   * 招待完了を待機
   */
  async waitForInviteComplete() {
    await this.page.waitForResponse(
      (res) =>
        res.url().includes("/members") && res.request().method() === "POST"
    );
  }

  /**
   * 削除完了を待機
   */
  async waitForDeleteComplete() {
    await this.page.waitForResponse(
      (res) =>
        res.url().includes("/members/") && res.request().method() === "DELETE"
    );
  }
}
