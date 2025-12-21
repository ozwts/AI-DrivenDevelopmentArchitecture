import { test, expect } from "@playwright/experimental-ct-react";
import { TextareaField } from "./TextareaField";

test.describe("TextareaField Component", () => {
  test("ラベルが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <TextareaField label="説明" placeholder="入力してください" />,
    );
    await expect(component.getByText("説明")).toBeVisible();
  });

  test("ラベルとtextareaが正しく関連付けられている（アクセシビリティ）", async ({
    mount,
  }) => {
    const component = await mount(
      <TextareaField label="コメント" placeholder="コメントを入力" />,
    );

    const textarea = component.getByLabel("コメント");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder", "コメントを入力");
  });

  test("エラーメッセージが表示される", async ({ mount }) => {
    const component = await mount(
      <TextareaField label="説明" error="入力必須です" />,
    );
    await expect(component.getByRole("alert")).toHaveText("入力必須です");
  });

  test("エラー時にaria-invalidがtrueになる", async ({ mount }) => {
    const component = await mount(
      <TextareaField label="説明" error="エラー" />,
    );

    const textarea = component.getByRole("textbox");
    await expect(textarea).toHaveAttribute("aria-invalid", "true");
  });

  test("required属性が指定された場合、ラベルにアスタリスクが表示される", async ({
    mount,
  }) => {
    const component = await mount(<TextareaField label="必須項目" required />);
    await expect(component.getByText("必須項目")).toBeVisible();
    await expect(component.getByText("*")).toBeVisible();
  });

  test("helperTextが表示される（エラーがない場合）", async ({ mount }) => {
    const component = await mount(
      <TextareaField label="説明" helperText="500文字以内で入力してください" />,
    );
    await expect(
      component.getByText("500文字以内で入力してください"),
    ).toBeVisible();
  });

  test("エラーがある場合、helperTextは表示されない", async ({ mount }) => {
    const component = await mount(
      <TextareaField
        label="説明"
        error="エラーが発生しました"
        helperText="これは表示されません"
      />,
    );
    await expect(component.getByRole("alert")).toHaveText("エラーが発生しました");
    await expect(component.getByText("これは表示されません")).not.toBeVisible();
  });
});
