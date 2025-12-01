import { test, expect } from "@playwright/experimental-ct-react";
import { AttachmentList } from "./AttachmentList";

const mockAttachments = [
  {
    id: "attachment-1",
    todoId: "todo-1",
    filename: "test-document.pdf",
    filesize: 1024000,
    contentType: "application/pdf",
    status: "UPLOADED" as const,
    createdAt: "2025-01-15T03:00:00Z",
    updatedAt: "2025-01-15T03:00:00Z",
  },
  {
    id: "attachment-2",
    todoId: "todo-1",
    filename: "screenshot.png",
    filesize: 512000,
    contentType: "image/png",
    status: "UPLOADED" as const,
    createdAt: "2025-01-14T10:30:00Z",
    updatedAt: "2025-01-14T10:30:00Z",
  },
];

test("空の状態が表示される", async ({ mount }) => {
  const component = await mount(
    <AttachmentList
      attachments={[]}
      onDownload={() => {}}
      onDelete={() => {}}
    />,
  );

  // タイトル、アイコン、説明文が表示される
  await expect(component.getByText("添付ファイルなし")).toBeVisible();
  await expect(component.locator("svg")).toBeVisible();
  await expect(
    component.getByText("このTODOにはまだファイルが添付されていません"),
  ).toBeVisible();
});

test("ローディング状態が表示される", async ({ mount }) => {
  const component = await mount(
    <AttachmentList
      isLoading={true}
      onDownload={() => {}}
      onDelete={() => {}}
    />,
  );

  // LoadingSpinnerが表示されることを確認
  await expect(component.locator('[role="status"]')).toBeVisible();
});

test("添付ファイル一覧が表示される", async ({ mount }) => {
  const component = await mount(
    <AttachmentList
      attachments={mockAttachments}
      onDownload={() => {}}
      onDelete={() => {}}
    />,
  );

  // ファイル名、サイズ、日付は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("test-document.pdf")).toBeVisible();
  await expect(component.getByText("screenshot.png")).toBeVisible();
  await expect(component.getByText(/1000 KB/)).toBeVisible();
  await expect(component.getByText(/2025\/01\/15/)).toBeVisible();
});

test("ダウンロードボタンがアクセシブル", async ({ mount }) => {
  const component = await mount(
    <AttachmentList
      attachments={[mockAttachments[0]]}
      onDownload={() => {}}
      onDelete={() => {}}
    />,
  );

  const downloadButton = component.getByRole("button", {
    name: "test-document.pdfをダウンロード",
  });
  await expect(downloadButton).toBeVisible();
});

test("削除ボタンがアクセシブル", async ({ mount }) => {
  const component = await mount(
    <AttachmentList
      attachments={[mockAttachments[0]]}
      onDownload={() => {}}
      onDelete={() => {}}
    />,
  );

  const deleteButton = component.getByRole("button", {
    name: "test-document.pdfを削除",
  });
  await expect(deleteButton).toBeVisible();
});

test("ダウンロードボタンをクリックするとonDownloadが呼ばれる", async ({
  mount,
}) => {
  let downloadedAttachment = null;

  const component = await mount(
    <AttachmentList
      attachments={[mockAttachments[0]]}
      onDownload={(attachment) => {
        downloadedAttachment = attachment;
      }}
      onDelete={() => {}}
    />,
  );

  await component
    .getByRole("button", { name: "test-document.pdfをダウンロード" })
    .click();

  expect(downloadedAttachment).toEqual(mockAttachments[0]);
});

test("削除ボタンをクリックするとonDeleteが呼ばれる", async ({ mount }) => {
  let deletedAttachment = null;

  const component = await mount(
    <AttachmentList
      attachments={[mockAttachments[0]]}
      onDownload={() => {}}
      onDelete={(attachment) => {
        deletedAttachment = attachment;
      }}
    />,
  );

  await component
    .getByRole("button", { name: "test-document.pdfを削除" })
    .click();

  expect(deletedAttachment).toEqual(mockAttachments[0]);
});
