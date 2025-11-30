import { faker } from "@faker-js/faker";
import { Attachment, AttachmentStatus } from "./attachment";
import {
  getDummyId,
  getDummyShortText,
  getDummyRecentDate,
} from "@/util/testing-util/dummy-data";

export type AttachmentDummyProps = Partial<{
  id: string;
  fileName: string;
  storageKey: string;
  contentType: string;
  fileSize: number;
  status: AttachmentStatus;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のAttachmentダミーデータを生成する
 *
 * @param props - 上書きするプロパティ（オプション）
 * @returns Attachmentインスタンス
 *
 * @example
 * ```typescript
 * // すべてランダム値で生成
 * const attachment = attachmentDummyFrom();
 *
 * // 特定フィールドのみ指定
 * const attachment = attachmentDummyFrom({
 *   id: "attachment-123",
 *   fileName: "document.pdf",
 *   status: "UPLOADED"
 * });
 * ```
 */
export const attachmentDummyFrom = (
  props?: AttachmentDummyProps,
): Attachment => {
  const now = getDummyRecentDate();
  const id = props?.id ?? getDummyId();
  const fileName = props?.fileName ?? `${getDummyShortText()}.pdf`;
  const todoId = getDummyId(); // 親TODOのID（ストレージキー生成用）

  return new Attachment({
    id,
    fileName,
    storageKey: props?.storageKey ?? `attachments/${todoId}/${id}/${fileName}`,
    contentType: props?.contentType ?? "application/pdf",
    fileSize: props?.fileSize ?? faker.number.int({ min: 1000, max: 10000000 }),
    status: props?.status !== undefined ? props.status : AttachmentStatus.prepared(),
    uploadedBy: props?.uploadedBy ?? getDummyId(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
