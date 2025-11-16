/**
 * Attachment ステータス
 *
 * アップロード処理の進行状況を表す。
 * - PREPARED: アップロード準備完了（署名付きURL発行済み）
 * - UPLOADED: S3へのアップロード完了
 */
export type AttachmentStatus = "PREPARED" | "UPLOADED";

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
  readonly status: AttachmentStatus;

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
   * @param props.id - Attachment ID
   * @param props.fileName - ファイル名
   * @param props.storageKey - ストレージキー
   * @param props.contentType - コンテンツタイプ（MIMEタイプ）
   * @param props.fileSize - ファイルサイズ（バイト）
   * @param props.status - ステータス（省略時は "PREPARED"）
   * @param props.uploadedBy - アップロード者ユーザーID
   * @param props.createdAt - 作成日時（ISO 8601形式）
   * @param props.updatedAt - 更新日時（ISO 8601形式）
   */
  constructor(props: {
    id: string;
    fileName: string;
    storageKey: string;
    contentType: string;
    fileSize: number;
    status?: AttachmentStatus;
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.storageKey = props.storageKey;
    this.contentType = props.contentType;
    this.fileSize = props.fileSize;
    this.status = props.status ?? "PREPARED";
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * ステータスを変更して新しいAttachmentインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * @param status - 新しいステータス
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいAttachmentインスタンス
   *
   * @example
   * ```typescript
   * const attachment = new Attachment({ ... });
   * const uploaded = attachment.changeStatus("UPLOADED", "2024-01-01T00:01:00.000Z");
   * ```
   */
  changeStatus(status: AttachmentStatus, updatedAt: string): Attachment {
    return new Attachment({
      id: this.id,
      fileName: this.fileName,
      storageKey: this.storageKey,
      contentType: this.contentType,
      fileSize: this.fileSize,
      status,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
      updatedAt,
    });
  }
}
