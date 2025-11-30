/* eslint-disable class-methods-use-this */
import { Result } from "@/util/result";
import type {
  StorageClient,
  GeneratePresignedUrlResult,
  DeleteObjectResult,
} from ".";

export type StorageClientDummyProps = {
  generatePresignedUploadUrlReturnValue?:
    | GeneratePresignedUrlResult
    | undefined;
  generatePresignedDownloadUrlReturnValue?:
    | GeneratePresignedUrlResult
    | undefined;
  deleteObjectReturnValue?: DeleteObjectResult | undefined;
};

/**
 * テスト用StorageClient Dummy実装
 *
 * スモールテストでストレージ操作をモックするために使用。
 *
 * @example
 * ```typescript
 * // 正常系テスト
 * const storageClient = new StorageClientDummy();
 * const result = await storageClient.generatePresignedUploadUrl({
 *   key: "attachments/test/file.pdf",
 *   contentType: "application/pdf"
 * });
 * // result.isOk() === true
 *
 * // エラー系テスト
 * const failingClient = new StorageClientDummy({
 *   generatePresignedUploadUrlReturnValue: Result.err(
 *     new UnexpectedError("Failed to generate URL")
 *   )
 * });
 * ```
 */
export class StorageClientDummy implements StorageClient {
  readonly #defaultGeneratePresignedUploadUrlReturnValue: GeneratePresignedUrlResult =
    Result.ok("https://example.com/upload-url?signature=dummy");

  readonly #defaultGeneratePresignedDownloadUrlReturnValue: GeneratePresignedUrlResult =
    Result.ok("https://example.com/download-url?signature=dummy");

  readonly #defaultDeleteObjectReturnValue: DeleteObjectResult =
    Result.ok(undefined);

  readonly #generatePresignedUploadUrlReturnValue: GeneratePresignedUrlResult;

  readonly #generatePresignedDownloadUrlReturnValue: GeneratePresignedUrlResult;

  readonly #deleteObjectReturnValue: DeleteObjectResult;

  constructor(props?: StorageClientDummyProps) {
    this.#generatePresignedUploadUrlReturnValue =
      props?.generatePresignedUploadUrlReturnValue ??
      this.#defaultGeneratePresignedUploadUrlReturnValue;
    this.#generatePresignedDownloadUrlReturnValue =
      props?.generatePresignedDownloadUrlReturnValue ??
      this.#defaultGeneratePresignedDownloadUrlReturnValue;
    this.#deleteObjectReturnValue =
      props?.deleteObjectReturnValue ?? this.#defaultDeleteObjectReturnValue;
  }

  async generatePresignedUploadUrl(_props: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult> {
    return this.#generatePresignedUploadUrlReturnValue;
  }

  async generatePresignedDownloadUrl(_props: {
    key: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult> {
    return this.#generatePresignedDownloadUrlReturnValue;
  }

  async deleteObject(_props: { key: string }): Promise<DeleteObjectResult> {
    return this.#deleteObjectReturnValue;
  }
}
