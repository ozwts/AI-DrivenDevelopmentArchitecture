import { test, expect } from "@playwright/experimental-ct-react";
import { FileUploadSection } from "./FileUploadSection";

// Playwrightのコンポーネントテストでは、Fileオブジェクトが正しくシリアライズされないため、
// プレーンオブジェクトとして定義
const mockFile = {
  name: "test.txt",
  size: 12,
  type: "text/plain",
} as File;

test("ラベルが表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  // ラベルテキストは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("ファイル添付（任意）")).toBeVisible();
});

test("ファイル選択ボタンが表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  await expect(component.getByTestId("file-select-label")).toBeVisible();
  // ボタンテキストは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("ファイルを選択")).toBeVisible();
});

test("ヘルプテキストが表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  // ヘルプテキストは動的コンテンツのためgetByTextを使用
  await expect(
    component.getByText(
      "対応形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト（最大10MB）",
    ),
  ).toBeVisible();
});

test("ファイルが選択されていない場合、ファイル数が表示されない", async ({
  mount,
}) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  await expect(component.getByTestId("file-count")).not.toBeVisible();
});

test("ファイルが選択されている場合、ファイル数が表示される", async ({
  mount,
}) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  await expect(component.getByTestId("file-count")).toBeVisible();
  await expect(component.getByText("1個のファイルを選択中")).toBeVisible();
});

test("複数ファイルが選択されている場合、正しいファイル数が表示される", async ({
  mount,
}) => {
  const mockFile2 = {
    name: "test2.txt",
    size: 14,
    type: "text/plain",
  } as File;

  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile, mockFile2]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  await expect(component.getByText("2個のファイルを選択中")).toBeVisible();
});

test("エラーメッセージが表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError="ファイルサイズが大きすぎます"
    />,
  );

  // role="alert"でエラーメッセージをスコープ限定して検証（README.mdのベストプラクティス）
  const errorAlert = component.getByRole("alert");
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert).toContainText("ファイルサイズが大きすぎます");
});

test("選択されたファイルの一覧が表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  // ファイル名とタイプは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("test.txt")).toBeVisible();
  await expect(component.getByText(/text\/plain/)).toBeVisible();
});

test("選択されたファイルのサイズが表示される", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  // formatFileSizeの結果は動的コンテンツのためgetByTextを使用
  await expect(component.getByText(/Bytes/)).toBeVisible();
});

test("ファイル削除ボタンにaria-labelが設定されている", async ({ mount }) => {
  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  const deleteButton = component.getByRole("button", {
    name: "test.txtを削除",
  });
  await expect(deleteButton).toBeVisible();
});

test("ファイル削除ボタンをクリックするとonFileRemoveが呼ばれる", async ({
  mount,
}) => {
  let removedIndex: number | null = null;

  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile]}
      onFileSelect={() => {}}
      onFileRemove={(index) => {
        removedIndex = index;
      }}
      fileError=""
    />,
  );

  await component
    .getByRole("button", { name: "test.txtを削除" })
    .click();
  expect(removedIndex).toBe(0);
});

test("複数ファイルの場合、それぞれのファイル情報が表示される", async ({
  mount,
}) => {
  const mockFile2 = {
    name: "document.pdf",
    size: 14,
    type: "application/pdf",
  } as File;

  const component = await mount(
    <FileUploadSection
      selectedFiles={[mockFile, mockFile2]}
      onFileSelect={() => {}}
      onFileRemove={() => {}}
      fileError=""
    />,
  );

  await expect(component.getByText("test.txt")).toBeVisible();
  await expect(component.getByText("document.pdf")).toBeVisible();
  await expect(component.getByText(/text\/plain/)).toBeVisible();
  await expect(component.getByText(/application\/pdf/)).toBeVisible();
});
