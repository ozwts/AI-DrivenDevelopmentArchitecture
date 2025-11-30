import { AttachmentStatus } from "./attachment-status";

// AttachmentStatusを再エクスポート
export { AttachmentStatus };

/**
 * Attachment コンストラクタのProps型
 */
export type AttachmentProps = {
  id: string;
  fileName: string;
  storageKey: string;
  contentType: string;
  fileSize: number;
  status: AttachmentStatus | undefined;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Attachment エンティティ
 *
 * TODOに添付されるファイルを表すドメインエンティティ。
 * TODOアグリゲートの子エンティティとして、TodoRepository経由でのみアクセスされる。
 *
 * @remarks
 * - このエンティティは親エンティティ（TODO）のIDを持たない
 * - 親子関係はリポジトリ層で管理される（DynamoDBのPK/SK等）
 * - ストレージキーは抽象的な名前（storageKey）を使用し、技術依存を避ける
 *
 * @example
 * ```typescript
 * // Attachmentの作成
 * const attachment = new Attachment({
 *   id: "attachment-123",
 *   fileName: "document.pdf",
 *   storageKey: "attachments/todo-123/attachment-123/document.pdf",
 *   contentType: "application/pdf",
 *   fileSize: 102400,
 *   status: "PREPARED",
 *   uploadedBy: "user-123",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // ステータス変更（アップロード完了時）
 * const uploaded = attachment.changeStatus("UPLOADED", "2024-01-01T00:01:00.000Z");
 * ```
 */
export class Attachment {
  /**
   * Attachment ID
   *
   * 添付ファイルを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * ファイル名
   *
   * 元のファイル名。
   * 必須項目。
   */
  readonly fileName: string;

  /**
   * ストレージキー
   *
   * ストレージシステムにおけるファイルの識別子。
   * 技術非依存の抽象的な名前を使用（s3Key等の技術要素を避ける）。
   * 必須項目。
   */
  readonly storageKey: string;

  /**
   * コンテンツタイプ
   *
   * MIMEタイプ（例: "application/pdf", "image/png"）。
   * 必須項目。
   */
  readonly contentType: string;

  /**
   * ファイルサイズ
   *
   * バイト単位のファイルサイズ。
   * 必須項目。
   */
  readonly fileSize: number;

  /**
   * ステータス
   *
   * アップロード処理の進行状況。
   * デフォルト値は "PREPARED"（アップロード準備完了）。
   */
  readonly status: AttachmentStatus | undefined;

  /**
   * アップロード者ユーザーID
   *
   * ファイルをアップロードしたユーザーのID。
   * 必須項目。
   */
  readonly uploadedBy: string;

  /**
   * 作成日時
   *
   * 添付ファイルレコードが作成された日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly createdAt: string;

  /**
   * 更新日時
   *
   * 添付ファイルレコードが最後に更新された日時（ISO 8601形式）。
   * ステータス更新時に更新される。
   */
  readonly updatedAt: string;

  /**
   * コンストラクタ
   *
   * @param props - Attachmentのプロパティ
   */
  constructor(props: AttachmentProps) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.storageKey = props.storageKey;
    this.contentType = props.contentType;
    this.fileSize = props.fileSize;
    this.status = props.status;
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * ステータスを変更して新しいAttachmentインスタンスを返す
   *
   * @param status - 新しいステータス
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいAttachmentインスタンス
   */
  changeStatus(status: AttachmentStatus, updatedAt: string): Attachment {
    return new Attachment({
      ...this,
      status,
      updatedAt,
    });
  }
}
