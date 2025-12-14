import { test, expect } from "@playwright/experimental-ct-react";
import { AttachmentUpload } from "./AttachmentUpload";

test("ファイル選択ボタンが表示される", async ({ mount }) => {
  const component = await mount(<AttachmentUpload onUpload={() => {}} />);

  // ファイル選択ボタンが表示される
  await expect(component.getByText("ファイルを選択")).toBeVisible();
});

test("ヘルプテキストが表示される", async ({ mount }) => {
  const component = await mount(<AttachmentUpload onUpload={() => {}} />);

  await expect(
    component.getByText(
      "対応形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト（最大10MB）",
    ),
  ).toBeVisible();
});

test("ファイル選択labelがアクセシブル", async ({ mount }) => {
  const component = await mount(<AttachmentUpload onUpload={() => {}} />);

  // labelがテキストで取得できる
  const label = component.getByText("ファイルを選択");
  await expect(label).toBeVisible();
  // labelがinput要素と正しく関連付けられている
  await expect(label).toHaveAttribute("for", "attachment-upload-input");
  // クリック可能なスタイルが設定されている
  await expect(label).toHaveAttribute("class", /cursor-pointer/);
});

test("ファイル入力要素が存在する", async ({ mount }) => {
  const component = await mount(<AttachmentUpload onUpload={() => {}} />);

  // labelに関連付けられたinput要素を取得
  const input = component.locator("#attachment-upload-input");
  await expect(input).toBeAttached();
  await expect(input).toHaveAttribute("type", "file");
});
