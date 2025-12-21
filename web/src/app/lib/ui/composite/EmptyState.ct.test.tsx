import { test, expect } from "@playwright/experimental-ct-react";
import { EmptyState } from "./EmptyState";

test.describe("EmptyState Component", () => {
  test("titleが正しく表示される", async ({ mount }) => {
    const component = await mount(<EmptyState title="データがありません" />);
    await expect(component.getByRole("heading", { name: "データがありません" })).toBeVisible();
  });

  test("descriptionが表示される", async ({ mount }) => {
    const component = await mount(
      <EmptyState
        title="プロジェクトがありません"
        description="新しいプロジェクトを作成して始めましょう"
      />,
    );
    await expect(component.getByText("新しいプロジェクトを作成して始めましょう")).toBeVisible();
  });

  test("descriptionがない場合は表示されない", async ({ mount }) => {
    const component = await mount(<EmptyState title="データなし" />);
    await expect(component.getByRole("heading", { name: "データなし" })).toBeVisible();
    // descriptionのp要素が存在しないことを確認
    await expect(component.locator("p")).not.toBeVisible();
  });

  test("iconが表示される", async ({ mount }) => {
    const component = await mount(
      <EmptyState
        title="ファイルがありません"
        icon={<span data-testid="custom-icon">Icon</span>}
      />,
    );
    await expect(component.getByTestId("custom-icon")).toBeVisible();
  });

  test("actionが表示される", async ({ mount }) => {
    const component = await mount(
      <EmptyState
        title="TODOがありません"
        action={<button type="button">新規作成</button>}
      />,
    );
    await expect(component.getByRole("button", { name: "新規作成" })).toBeVisible();
  });

  test("icon, title, description, actionが全て表示される", async ({ mount }) => {
    const component = await mount(
      <EmptyState
        icon={<span data-testid="folder-icon">Folder</span>}
        title="プロジェクトがありません"
        description="新しいプロジェクトを作成して始めましょう"
        action={<button type="button">新規プロジェクト</button>}
      />,
    );

    await expect(component.getByTestId("folder-icon")).toBeVisible();
    await expect(component.getByRole("heading", { name: "プロジェクトがありません" })).toBeVisible();
    await expect(component.getByText("新しいプロジェクトを作成して始めましょう")).toBeVisible();
    await expect(component.getByRole("button", { name: "新規プロジェクト" })).toBeVisible();
  });
});
