import { faker } from "@faker-js/faker";
import { AttachmentStatus } from "./attachment-status.vo";

export type AttachmentStatusDummyProps = Partial<{
  status: "PREPARED" | "UPLOADED";
}>;

/**
 * テスト用AttachmentStatusファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns AttachmentStatusインスタンス
 */
export const attachmentStatusDummyFrom = (
  props?: AttachmentStatusDummyProps,
): AttachmentStatus => {
  const statusValue =
    props?.status ??
    faker.helpers.arrayElement(["PREPARED", "UPLOADED"] as const);

  const result = AttachmentStatus.from({ status: statusValue });

  if (!result.success) {
    throw new Error(`Failed to generate AttachmentStatus: ${result.error!.message}`);
  }

  return result.data!;
};
