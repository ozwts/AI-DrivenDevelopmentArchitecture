import { type Page, type Locator } from "@playwright/test";

/**
 * プロジェクト一覧ページのPage Object
 *
 * セレクタ優先順位: getByRole > getByLabel > getByTestId
 */
export class ProjectsPage {
  readonly page: Page;
  readonly newProjectButton: Locator;
  readonly projectNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    // ヘッダーにある最初のボタンを選択（EmptyStateにも同じボタンがあるため）
    this.newProjectButton = page
      .getByRole("button", { name: "新規プロジェクト" })
      .first();
    this.projectNameInput = page.getByLabel("プロジェクト名");
    this.descriptionInput = page.getByLabel("説明");
    this.createButton = page.getByRole("button", { name: "作成" });
    this.successToast = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/projects");
  }

  async clickNewProject() {
    await this.newProjectButton.click();
  }

  async fillProjectForm(name: string, description: string) {
    await this.projectNameInput.fill(name);
    await this.descriptionInput.fill(description);
  }

  async submitForm() {
    await this.createButton.click();
  }

  getSuccessToast(): Locator {
    return this.successToast;
  }

  getProjectHeading(projectName: string): Locator {
    return this.page
      .getByRole("heading", { name: projectName, level: 3 })
      .first();
  }

  /**
   * 説明文からプロジェクトカードを特定
   * 説明文を含むarticle要素（Card）を検索
   */
  getProjectCardByDescription(description: string): Locator {
    return this.page
      .getByRole("article")
      .filter({ has: this.page.getByText(description, { exact: true }) });
  }

  /**
   * 特定のプロジェクトカード内の削除ボタンをクリック
   */
  async clickDeleteButton(description: string) {
    const card = this.getProjectCardByDescription(description);
    await card.getByRole("button", { name: "削除" }).click();
  }

  /**
   * 特定のテキストを含むトーストを取得
   */
  getToastWithText(text: string): Locator {
    return this.successToast.filter({ hasText: text });
  }
}
