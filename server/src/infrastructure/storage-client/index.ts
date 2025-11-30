/* eslint-disable class-methods-use-this */
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";
import type {
  StorageClient,
  GeneratePresignedUrlResult,
  DeleteObjectResult,
} from "@/domain/support/storage-client";

export type S3StorageClientProps = {
  /**
   * S3バケット名
   */
  bucketName: string;

  /**
   * S3クライアント
   */
  s3Client: S3Client;
};

/**
 * AWS S3用のStorageClient実装
 */
export class S3StorageClient implements StorageClient {
  readonly #bucketName: string;

  readonly #s3Client: S3Client;

  constructor(props: S3StorageClientProps) {
    this.#bucketName = props.bucketName;
    this.#s3Client = props.s3Client;
  }

  /**
   * アップロード用のプレサインドURLを生成する
   */
  async generatePresignedUploadUrl(props: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.#bucketName,
        Key: props.key,
        ContentType: props.contentType,
      });

      const url = await getSignedUrl(this.#s3Client, command, {
        expiresIn: props.expiresIn ?? 300, // デフォルト5分
      });

      return Result.ok(url);
    } catch (error) {
      return Result.err(
        new UnexpectedError(
          `プレサインドアップロードURL生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * ダウンロード用のプレサインドURLを生成する
   */
  async generatePresignedDownloadUrl(props: {
    key: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.#bucketName,
        Key: props.key,
      });

      const url = await getSignedUrl(this.#s3Client, command, {
        expiresIn: props.expiresIn ?? 300, // デフォルト5分
      });

      return Result.ok(url);
    } catch (error) {
      return Result.err(
        new UnexpectedError(
          `プレサインドダウンロードURL生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * ストレージからオブジェクトを削除する
   */
  async deleteObject(props: { key: string }): Promise<DeleteObjectResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.#bucketName,
        Key: props.key,
      });

      await this.#s3Client.send(command);

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new UnexpectedError(
          `オブジェクト削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
