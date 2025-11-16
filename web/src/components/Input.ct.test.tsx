import { test, expect } from "@playwright/experimental-ct-react";
import { Input } from "./Input";

test.describe("Input Component", () => {
  test("ラベルが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <Input label="テスト入力" placeholder="入力してください" />,
    );
    await expect(component.getByText("テスト入力")).toBeVisible();
  });

  test("ラベルとinputが正しく関連付けられている（アクセシビリティ）", async ({
    mount,
  }) => {
    const component = await mount(
      <Input label="ユーザー名" placeholder="名前を入力" />,
    );

    // getByLabelでinputが見つかることを確認（htmlFor属性が正しく設定されている）
    const input = component.getByLabel("ユーザー名");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "名前を入力");
  });

  test("エラーメッセージが表示される", async ({ mount }) => {
    const component = await mount(
      <Input label="テスト入力" error="エラーメッセージ" />,
    );
    await expect(component.getByText("エラーメッセージ")).toBeVisible();
  });

  test("required属性が指定された場合、ラベルにアスタリスクが表示される", async ({
    mount,
  }) => {
    const component = await mount(<Input label="必須項目" required />);
    await expect(component.getByText("必須項目")).toBeVisible();
    await expect(component.getByText("*")).toBeVisible();
  });

  test("helperTextが表示される（エラーがない場合）", async ({ mount }) => {
    const component = await mount(
      <Input label="入力" helperText="これはヘルプテキストです" />,
    );
    await expect(component.getByText("これはヘルプテキストです")).toBeVisible();
  });

  test("エラーがある場合、helperTextは表示されない", async ({ mount }) => {
    const component = await mount(
      <Input
        label="入力"
        error="エラーが発生しました"
        helperText="これは表示されません"
      />,
    );
    await expect(component.getByText("エラーが発生しました")).toBeVisible();
    await expect(component.getByText("これは表示されません")).not.toBeVisible();
  });
});
