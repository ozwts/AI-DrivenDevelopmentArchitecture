import { type Page, type Locator } from "@playwright/test";
import path from "path";

/**
 * TODO一覧ページのPage Object
 *
 * セレクタ優先順位: getByRole > getByLabel > getByTestId
 */
export class TodosPage {
  readonly page: Page;
  readonly newTodoButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly dueDateInput: Locator;
  readonly createButton: Locator;
  readonly updateButton: Locator;
  readonly successToast: Locator;
  readonly fileInput: Locator;
  readonly attachmentSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodoButton = page.getByRole("button", { name: "新規TODO" });
    this.titleInput = page.getByLabel("タイトル");
    this.descriptionInput = page.getByLabel("説明");
    this.dueDateInput = page.getByLabel("期限日");
    this.createButton = page.getByRole("button", { name: "作成" });
    this.updateButton = page.getByRole("button", { name: "更新" });
    this.successToast = page.getByRole("alert");
    this.fileInput = page.getByTestId("file-input");
    this.attachmentSection = page.getByTestId("attachment-section");
  }

  async goto() {
    await this.page.goto("/todos");
  }

  async clickNewTodo() {
    await this.newTodoButton.click();
  }

  async fillTodoForm(title: string, description: string) {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
  }

  async submitForm() {
    await this.createButton.click();
  }

  getSuccessToast(): Locator {
    return this.successToast;
  }

  getTodoHeading(todoTitle: string): Locator {
    return this.page
      .getByRole("heading", { name: todoTitle, level: 3 })
      .first();
  }

  /**
   * 説明文からTODOカードを特定
   * 説明文を含むarticle要素（Card）を検索
   */
  getTodoCardByDescription(description: string): Locator {
    return this.page
      .getByRole("article")
      .filter({ has: this.page.getByText(description, { exact: true }) });
  }

  /**
   * 特定のTODOカード内の編集ボタンを取得
   */
  getEditButtonForTodo(description: string): Locator {
    return this.getTodoCardByDescription(description).getByRole("button", {
      name: "編集",
    });
  }

  /**
   * 特定のTODOカード内の開始ボタンを取得
   */
  getStartButtonForTodo(description: string): Locator {
    return this.getTodoCardByDescription(description).getByRole("button", {
      name: "開始",
    });
  }

  /**
   * TODOの編集ボタンをクリック
   */
  async clickEditButton(description: string) {
    await this.getEditButtonForTodo(description).click();
  }

  /**
   * TODOの開始ボタンをクリック（ステータス変更）
   */
  async clickStartButton(description: string) {
    await this.getStartButtonForTodo(description).click();
  }

  /**
   * 期限日を入力
   */
  async fillDueDate(date: string) {
    await this.dueDateInput.fill(date);
  }

  /**
   * 期限日をクリア
   */
  async clearDueDate() {
    await this.dueDateInput.clear();
  }

  /**
   * 更新ボタンをクリック
   */
  async clickUpdateButton() {
    await this.updateButton.click();
  }

  /**
   * 特定のテキストを含むトーストを取得
   */
  getToastWithText(text: string): Locator {
    return this.successToast.filter({ hasText: text });
  }

  /**
   * 説明文を含むTODOカードが表示されるまで待機
   */
  async waitForTodoCard(description: string) {
    await this.getTodoCardByDescription(description).waitFor({
      state: "visible",
    });
  }

  /**
   * 説明文からTODOカードを取得（getTodoCardByDescriptionのエイリアス）
   */
  getTodoCard(description: string): Locator {
    return this.getTodoCardByDescription(description);
  }

  /**
   * 特定のTODOカード内の削除ボタンをクリック
   */
  async clickDeleteButton(description: string) {
    const card = this.getTodoCardByDescription(description);
    await card.getByRole("button", { name: "削除" }).click();
  }

  /**
   * TODO作成フォームでファイルを選択
   */
  async selectFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * TODO詳細ページに遷移
   */
  async gotoDetail(todoId: string) {
    await this.page.goto(`/todos/${todoId}`);
  }

  /**
   * 添付ファイルセクションのアップロード用ファイル選択
   */
  async selectAttachmentFile(filePath: string) {
    const attachmentInput = this.page.getByTestId("attachment-upload-input");
    await attachmentInput.setInputFiles(filePath);
  }

  /**
   * アップロードボタンをクリック
   */
  async clickUploadButton() {
    await this.page.getByRole("button", { name: "アップロード" }).click();
  }

  /**
   * 添付ファイルのダウンロードボタンをクリック
   */
  getDownloadButton(filename: string): Locator {
    return this.page.getByRole("button", { name: `${filename}をダウンロード` });
  }

  /**
   * 添付ファイルの削除ボタンをクリック
   */
  getAttachmentDeleteButton(filename: string): Locator {
    return this.page.getByRole("button", { name: `${filename}を削除` });
  }

  /**
   * 添付ファイル名が表示されているか確認
   */
  getAttachmentFilename(filename: string): Locator {
    return this.attachmentSection.getByText(filename);
  }

  /**
   * テスト用ファイルのパスを取得
   */
  static getTestFilePath(filename: string = "test-file.txt"): string {
    return path.join(__dirname, "../../fixtures/files", filename);
  }
}
