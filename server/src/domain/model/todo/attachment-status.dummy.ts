import { AttachmentStatus } from "./attachment-status";

/**
 * テスト用のダミーAttachmentStatusを生成する
 *
 * @example attachmentStatusDummyPrepared()
 * @example attachmentStatusDummyUploaded()
 */
export const attachmentStatusDummyPrepared = (): AttachmentStatus =>
  AttachmentStatus.prepared();

export const attachmentStatusDummyUploaded = (): AttachmentStatus =>
  AttachmentStatus.uploaded();

/**
 * ランダムなAttachmentStatusを生成する（デフォルトはPREPARED）
 */
export const attachmentStatusDummyRandom = (): AttachmentStatus =>
  Math.random() > 0.5
    ? AttachmentStatus.prepared()
    : AttachmentStatus.uploaded();
