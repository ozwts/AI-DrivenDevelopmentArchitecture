# ファイルアップロードパターン（Two-Phase Upload）

## 核心原則

**Pre-signed URL方式**による **Two-Phase Upload** を採用し、サーバー負荷を最小化しつつセキュアなファイルアップロードを実現する。

## アーキテクチャ概要

```
クライアント                API Server              S3
    │                          │                    │
    │  ① アップロード準備       │                    │
    ├─────────────────────────>│                    │
    │  POST /prepare            │                    │
    │                          │  ② Pre-signed URL  │
    │                          │     生成            │
    │                          ├───────────────────>│
    │  ③ Pre-signed URL返却    │                    │
    │<─────────────────────────┤                    │
    │  uploadUrl, attachmentId │                    │
    │                          │                    │
    │  ④ 直接アップロード       │                    │
    ├──────────────────────────────────────────────>│
    │  PUT {uploadUrl}          │                    │
    │  (ファイルバイナリ)        │                    │
    │                          │                    │
    │  ⑤ ステータス更新         │                    │
    ├─────────────────────────>│                    │
    │  PATCH /:attachmentId     │                    │
    │  { status: "UPLOADED" }   │                    │
    │                          │  ⑥ DB更新          │
    │  ⑦ 更新完了               │                    │
    │<─────────────────────────┤                    │
```

## ステート遷移

添付ファイルは以下の2つの状態を持つ。

```
PREPARED ──(クライアントがS3アップロード完了)──> UPLOADED
```

### 状態定義

| 状態 | 説明 | 遷移条件 |
|------|------|---------|
| PREPARED | アップロード準備完了、S3 URLは発行済みだがファイル未アップロード | `POST /prepare` 成功時 |
| UPLOADED | S3へのアップロード完了、ファイルダウンロード可能 | クライアントが `PUT /:attachmentId` で通知 |

### OpenAPI定義

```yaml
AttachmentStatus:
  type: string
  enum:
    - PREPARED
    - UPLOADED
  description: 添付ファイルのステータス
```

## フェーズ1: アップロード準備（PREPARED状態作成）

### エンドポイント

```
POST /todos/{todoId}/attachments/prepare
```

### リクエスト

```yaml
PrepareAttachmentParams:
  type: object
  required:
    - filename
    - filesize
    - contentType
  properties:
    filename:
      type: string
      minLength: 1
      maxLength: 255
      description: ファイル名（拡張子含む）
    filesize:
      type: integer
      minimum: 1
      maximum: 10485760  # 10MB
      description: ファイルサイズ（バイト）
    contentType:
      type: string
      minLength: 1
      description: MIMEタイプ（例: image/png）
```

**重要**:
- ファイル本体は含めない（メタデータのみ）
- ファイルサイズ上限は10MB（型レベルバリデーション）
- contentTypeはクライアント指定（S3 Content-Type設定用）

### レスポンス

```yaml
PrepareAttachmentResponse:
  type: object
  required:
    - uploadUrl
    - attachment
  properties:
    uploadUrl:
      type: string
      description: S3 Pre-signed URL（有効期限付き）
    attachment:
      $ref: '#/components/schemas/AttachmentResponse'
```

```yaml
AttachmentResponse:
  type: object
  required:
    - id
    - todoId
    - filename
    - filesize
    - contentType
    - status
    - createdAt
    - updatedAt
  properties:
    id:
      type: string
      description: 添付ファイルID
    todoId:
      type: string
      description: 親TODOのID
    filename:
      type: string
    filesize:
      type: integer
    contentType:
      type: string
    status:
      $ref: '#/components/schemas/AttachmentStatus'  # PREPARED
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### サーバー側処理

1. **Attachmentエンティティ作成**: `status: PREPARED`で保存
2. **S3 Pre-signed URL生成**: PutObject用、有効期限15分
3. **レスポンス返却**: `uploadUrl`とAttachmentメタデータ

### UseCase実装パターン

```typescript
const result = await prepareAttachmentUploadUseCase.execute({
  todoId: input.todoId,
  filename: input.filename,
  filesize: input.filesize,
  contentType: input.contentType,
  userSub,
});

// result.data:
// {
//   uploadUrl: "https://s3.amazonaws.com/bucket/key?X-Amz-...",
//   attachment: { id: "...", status: "PREPARED", ... }
// }
```

## フェーズ2: クライアント側アップロード

クライアントは受け取った `uploadUrl` に対して **直接S3へHTTP PUTリクエスト** を送る。

### クライアント実装例（TypeScript）

```typescript
const prepareResponse = await fetch(
  `/todos/${todoId}/attachments/prepare`,
  {
    method: 'POST',
    body: JSON.stringify({ filename, filesize, contentType }),
  }
);

const { uploadUrl, attachment } = await prepareResponse.json();

// S3へ直接アップロード
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: {
    'Content-Type': contentType,
  },
});

// ステータス更新
await fetch(`/todos/${todoId}/attachments/${attachment.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'UPLOADED' }),
});
```

**重要**:
- API Serverを経由しない（帯域節約・スケーラビリティ向上）
- Pre-signed URLは一時的なアクセス権限を付与
- API Serverはファイルバイナリをハンドリングしない

## フェーズ3: ステータス更新（UPLOADED状態へ遷移）

### エンドポイント

```
PATCH /todos/{todoId}/attachments/{attachmentId}
```

### リクエスト

```yaml
UpdateAttachmentParams:
  type: object
  required:
    - status
  properties:
    status:
      $ref: '#/components/schemas/AttachmentStatus'  # "UPLOADED"
```

### レスポンス

```yaml
AttachmentResponse:
  # statusがUPLOADEDに更新されたレスポンス
```

### サーバー側処理

1. **Attachment取得**: 指定IDのAttachmentを取得
2. **ステータス遷移検証**: `PREPARED → UPLOADED` のみ許可
3. **DB更新**: `status`と`updatedAt`を更新
4. **レスポンス返却**: 更新後のAttachment

### UseCase実装パターン

```typescript
// ビジネスルール: PREPARED → UPLOADED のみ許可
if (attachment.status !== 'PREPARED') {
  return Result.err(new ValidationError(
    'ステータスはPREPAREDからUPLOADEDにのみ更新できます'
  ));
}

// 状態遷移
const updatedAttachment = attachment.updateStatus('UPLOADED');
```

## ダウンロード

### エンドポイント

```
GET /todos/{todoId}/attachments/{attachmentId}/download-url
```

### レスポンス

```yaml
GetAttachmentDownloadUrlResponse:
  type: object
  required:
    - downloadUrl
  properties:
    downloadUrl:
      type: string
      description: S3 Pre-signed URL（GetObject用、有効期限付き）
```

### サーバー側処理

1. **Attachment取得**: 指定IDのAttachmentを取得
2. **ステータス検証**: `status === 'UPLOADED'` であることを確認
3. **Pre-signed URL生成**: GetObject用、有効期限15分
4. **レスポンス返却**: `downloadUrl`

### UseCase実装パターン

```typescript
// ビジネスルール: UPLOADEDでなければダウンロード不可
if (attachment.status !== 'UPLOADED') {
  return Result.err(new ValidationError(
    'アップロード完了していないファイルはダウンロードできません'
  ));
}

const downloadUrl = await s3Adapter.generatePresignedUrl({
  operation: 'GetObject',
  key: attachment.s3Key,
  expiresIn: 900,  // 15分
});
```

## Pre-signed URLのセキュリティ

### 有効期限

| 操作 | 有効期限 | 理由 |
|------|---------|------|
| PutObject（アップロード） | 15分 | ユーザーがファイル選択後すぐアップロード想定 |
| GetObject（ダウンロード） | 15分 | ダウンロード開始後の時間的猶予 |

### アクセス制御

- **認証**: API ServerがPre-signed URL発行前に認証チェック
- **権限**: UseCase層で親TODO所有者チェック実施
- **一時性**: URLは期限切れ後アクセス不可

### S3バケット設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::bucket/*",
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

**重要**: HTTPS通信強制

## バリデーション階層

Two-Phase Uploadパターンにおけるバリデーションの配置。

**参照**: `guardrails/constitution/validation-principles.md`

### 第1階層：型レベルバリデーション（Handler層）

```yaml
filesize:
  type: integer
  minimum: 1
  maximum: 10485760  # 10MB
```

- ファイルサイズ上限
- ファイル名長さ
- contentType形式

### 第2階層：ドメインルール（Domain層）

```typescript
// Value Object: ファイル名拡張子チェック
export class Filename {
  static fromString(value: string): Result<Filename, ValidationError> {
    const allowedExtensions = ['.jpg', '.png', '.pdf'];
    const ext = path.extname(value).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return Result.err(new ValidationError('許可されていない拡張子です'));
    }

    return Result.ok(new Filename(value));
  }
}
```

### 第3階層：ビジネスルール（UseCase層）

```typescript
// TODO当たりの添付ファイル数上限チェック
const attachments = await attachmentRepository.findByTodoId({ todoId });

if (attachments.length >= 10) {
  return Result.err(new ValidationError('添付ファイルは最大10個までです'));
}
```

- TODO所有者チェック
- 添付ファイル数上限（ビジネスルール）
- ステータス遷移検証

## エラーハンドリング

### アップロード準備失敗

| ケース | エラー型 | HTTPステータス |
|--------|---------|---------------|
| TODOが存在しない | NotFoundError | 404 |
| TODO所有者でない | ForbiddenError | 403 |
| 添付ファイル数上限超過 | ValidationError | 400 |
| 不正なファイル拡張子 | ValidationError | 400 |

### S3アップロード失敗

クライアント側でハンドリング（API Serverは関与しない）

### ステータス更新失敗

| ケース | エラー型 | HTTPステータス |
|--------|---------|---------------|
| Attachmentが存在しない | NotFoundError | 404 |
| 不正なステータス遷移 | ValidationError | 400 |

## Do / Don't

### ✅ Good

```yaml
# Two-Phase Upload採用
POST /prepare → S3直接アップロード → PUT /update

# ステータスenumで状態管理
AttachmentStatus:
  enum: [PREPARED, UPLOADED]

# Pre-signed URLで一時アクセス権限付与
uploadUrl: "https://s3.amazonaws.com/...?X-Amz-Expires=900"

# メタデータのみ送信
PrepareAttachmentParams:
  properties:
    filename: ...
    filesize: ...
    contentType: ...
```

### ❌ Bad

```yaml
# APIサーバー経由でファイルアップロード
POST /attachments
Content-Type: multipart/form-data
# ❌ サーバー帯域消費、スケールしない

# ステータス管理なし
# ❌ アップロード途中状態を追跡できない

# パブリックS3バケット
# ❌ セキュリティリスク

# 有効期限なしURL
# ❌ URL漏洩時にアクセス制御不可
```

## チェックリスト

```
[ ] Pre-signed URL方式を採用
[ ] AttachmentStatusのenum定義（PREPARED, UPLOADED）
[ ] アップロード準備エンドポイント（POST /prepare）
[ ] ステータス更新エンドポイント（PATCH /:id）
[ ] ダウンロードURL取得エンドポイント（GET /:id/download-url）
[ ] ファイルサイズ上限を型レベルバリデーション（OpenAPI）
[ ] ファイル拡張子チェックをドメインルール（Value Object）
[ ] 添付ファイル数上限をビジネスルール（UseCase）
[ ] Pre-signed URL有効期限設定（15分）
[ ] HTTPS通信強制（S3バケットポリシー）
[ ] TODO所有者チェック（UseCase層）
[ ] ステータス遷移検証（PREPARED → UPLOADED）
```
