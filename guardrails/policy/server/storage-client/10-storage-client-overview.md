# StorageClient: ファイルストレージインターフェース

## 核心原則

StorageClientは**ファイルストレージ（S3等）への抽象インターフェース**であり、**技術非依存**かつ**プレサインドURL**を使用してストレージ操作を行う。

**関連ドキュメント**: `../port/10-port-overview.md`

## 責務

### 実施すること

1. **ストレージ操作の抽象化**: プレサインドURL生成、オブジェクト削除
2. **Result型によるエラーハンドリング**: 例外を投げず、Result型で失敗を表現
3. **技術非依存**: S3, GCS等の具体的な技術に依存しない

### 実施しないこと

1. **直接的なファイルI/O** → プレサインドURLを使用
2. **ファイル内容の処理** → UseCase層で実施
3. **ストレージキーの生成ロジック** → UseCase層で実施

## 型定義

```typescript
import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

export type GeneratePresignedUrlResult = Result<string, UnexpectedError>;
export type DeleteObjectResult = Result<void, UnexpectedError>;

export type StorageClient = {
  generatePresignedUploadUrl(props: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult>;

  generatePresignedDownloadUrl(props: {
    key: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult>;

  deleteObject(props: { key: string }): Promise<DeleteObjectResult>;
};
```

## 使用例

### UseCase層での使用

```typescript
export class PrepareAttachmentUploadUseCase {
  readonly #storageClient: StorageClient;

  constructor(props: { storageClient: StorageClient }) {
    this.#storageClient = props.storageClient;
  }

  async execute(input: PrepareUploadInput): Promise<PrepareUploadOutput> {
    const key = `attachments/${input.todoId}/${input.attachmentId}/${input.fileName}`;

    const result = await this.#storageClient.generatePresignedUploadUrl({
      key,
      contentType: input.contentType,
      expiresIn: 300, // 5分
    });

    if (!result.success) {
      return result;
    }

    return Result.ok({ uploadUrl: result.data, key });
  }
}
```

### 削除処理

```typescript
const result = await storageClient.deleteObject({
  key: "attachments/todo-123/attachment-456/document.pdf",
});

if (!result.success) {
  logger.error("ファイル削除失敗", result.error);
}
```

## Dummy実装

```typescript
export class StorageClientDummy implements StorageClient {
  readonly #generatePresignedUploadUrlReturnValue: GeneratePresignedUrlResult;
  readonly #generatePresignedDownloadUrlReturnValue: GeneratePresignedUrlResult;
  readonly #deleteObjectReturnValue: DeleteObjectResult;

  constructor(props?: StorageClientDummyProps) {
    this.#generatePresignedUploadUrlReturnValue =
      props?.generatePresignedUploadUrlReturnValue ??
      Result.ok("https://example.com/upload-url?signature=dummy");
    // ...
  }

  generatePresignedUploadUrl(_props: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<GeneratePresignedUrlResult> {
    return Promise.resolve(this.#generatePresignedUploadUrlReturnValue);
  }

  // ...
}
```

### テストでの使用

```typescript
// 正常系
const storageClient = new StorageClientDummy();
const result = await storageClient.generatePresignedUploadUrl({
  key: "attachments/test/file.pdf",
  contentType: "application/pdf",
});
expect(result.success).toBe(true);

// エラー系
const failingClient = new StorageClientDummy({
  generatePresignedUploadUrlReturnValue: Result.err(
    new UnexpectedError("Failed to generate URL")
  ),
});
```

## Do / Don't

### ✅ Good

```typescript
// プレサインドURLを使用
const result = await storageClient.generatePresignedUploadUrl({
  key: "attachments/todo-123/file.pdf",
  contentType: "application/pdf",
});

// Result型でエラーハンドリング
if (!result.success) {
  return Result.err(result.error);
}
```

### ❌ Bad

```typescript
// 技術固有のAPI
const result = await s3Client.putObject({
  Bucket: "my-bucket",  // ❌ S3固有
  Key: "file.pdf",
  Body: fileBuffer,     // ❌ 直接アップロード
});

// 例外を投げる
throw new Error("Upload failed");  // ❌ Result型を使うべき
```
