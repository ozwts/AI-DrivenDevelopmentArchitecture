import { type Page, type Locator } from "@playwright/test";

/**
 * ホームページのPage Object
 *
 * セレクタ優先順位: getByRole > getByLabel > getByTestId
 */
export class HomePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly todoCountStatus: Locator;
  readonly inProgressCountStatus: Locator;
  readonly doneCountStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole("heading", { name: "TODO App", level: 1 });
    this.todoCountStatus = page.getByRole("status", {
      name: "未着手のTODO数",
    });
    this.inProgressCountStatus = page.getByRole("status", {
      name: "進行中のTODO数",
    });
    this.doneCountStatus = page.getByRole("status", {
      name: "完了したTODO数",
    });
  }

  async goto() {
    await this.page.goto("/");
  }

  async getTodoCount(): Promise<string> {
    return (await this.todoCountStatus.textContent()) ?? "";
  }

  async getInProgressCount(): Promise<string> {
    return (await this.inProgressCountStatus.textContent()) ?? "";
  }

  async getDoneCount(): Promise<string> {
    return (await this.doneCountStatus.textContent()) ?? "";
  }
}
