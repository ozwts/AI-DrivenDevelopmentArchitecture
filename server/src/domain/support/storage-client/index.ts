import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

/**
 * プレサインドURLの生成結果
 */
export type GeneratePresignedUrlResult = Result<string, UnexpectedError>;

/**
 * オブジェクト削除結果
 */
export type DeleteObjectResult = Result<void, UnexpectedError>;

/**
 * ストレージクライアント
 *
 * ファイルストレージ（S3等）への依存を抽象化するインターフェース。
 * ドメイン層の純粋性を保ちながらストレージ機能を提供。
 *
 * @interface StorageClient
 *
 * @remarks
 * - 技術依存を避けるため、S3やGCS等の特定技術を示す名前を避ける
 * - すべてのメソッドはResult型を返し、例外を投げない
 * - プレサインドURLを使用することで、直接的なファイルI/Oを避ける
 */
export type StorageClient = {
  /**
   * アップロード用のプレサインドURLを生成する
   *
   * クライアント（フロントエンド）が直接ストレージにファイルをアップロードできる
   * 一時的な署名付きURLを生成する。
   *
   * @param props パラメータ
   * @param props.key ストレージキー（オブジェクトのパス）
   * @param props.contentType コンテンツタイプ（MIMEタイプ）
   * @param props.expiresIn URL有効期限（秒）デフォルトは300秒（5分）
   * @returns プレサインドURL生成結果
   *
   * @example
   * ```typescript
   * const result = await storageClient.generatePresignedUploadUrl({
   *   key: "attachments/todo-123/attachment-456/document.pdf",
   *   contentType: "application/pdf"
   * });
   *
   * if (result.success) {
   *   const uploadUrl = result.data;
   *   // クライアントにこのURLを返し、PUTリクエストでアップロード
   * }
   * ```
   */
  generatePresignedUploadUrl(props: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult>;

  /**
   * ダウンロード用のプレサインドURLを生成する
   *
   * クライアント（フロントエンド）が直接ストレージからファイルをダウンロードできる
   * 一時的な署名付きURLを生成する。
   *
   * @param props パラメータ
   * @param props.key ストレージキー（オブジェクトのパス）
   * @param props.expiresIn URL有効期限（秒）デフォルトは300秒（5分）
   * @returns プレサインドURL生成結果
   *
   * @example
   * ```typescript
   * const result = await storageClient.generatePresignedDownloadUrl({
   *   key: "attachments/todo-123/attachment-456/document.pdf"
   * });
   *
   * if (result.success) {
   *   const downloadUrl = result.data;
   *   // クライアントにこのURLを返し、GETリクエストでダウンロード
   * }
   * ```
   */
  generatePresignedDownloadUrl(props: {
    key: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult>;

  /**
   * ストレージからオブジェクトを削除する
   *
   * @param props パラメータ
   * @param props.key ストレージキー（オブジェクトのパス）
   * @returns 削除結果
   *
   * @example
   * ```typescript
   * const result = await storageClient.deleteObject({
   *   key: "attachments/todo-123/attachment-456/document.pdf"
   * });
   *
   * if (result.success) {
   *   // 削除成功
   * } else {
   *   // エラーハンドリング
   *   logger.error("ファイル削除失敗", result.error);
   * }
   * ```
   */
  deleteObject(props: { key: string }): Promise<DeleteObjectResult>;
};
