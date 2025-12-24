# ファイルアップロードAPI設計原則

## 核心原則

ファイルアップロードは **Two-Phase Upload パターン** を採用し、APIサーバーの負荷を最小化する。

## Two-Phase Upload パターン

### 設計意図

1. **スケーラビリティ**: APIサーバーがファイルバイナリを扱わない
2. **帯域効率**: クライアントがストレージ（S3等）に直接アップロード
3. **セキュリティ**: Pre-signed URLによる一時的なアクセス権限付与
4. **トレーサビリティ**: ステート管理により進行状況を追跡可能

### フロー概要

```
1. クライアント → API: アップロード準備リクエスト（メタデータのみ）
2. API → クライアント: 一時URLとリソースIDを返却
3. クライアント → ストレージ: 直接ファイルアップロード
4. クライアント → API: アップロード完了通知
```

**重要**: APIサーバーはファイルバイナリをハンドリングしない。

## ステート管理

### 基本原則

ファイルアップロードリソースは **明確なステート** を持ち、状態遷移を管理する。

### 推奨ステート

| ステート | 意味                 | 遷移条件                     |
| -------- | -------------------- | ---------------------------- |
| PREPARED | アップロード準備完了 | 準備API成功時                |
| UPLOADED | アップロード完了     | クライアントからの完了通知時 |

**enum定義原則**: 大文字スネークケースで定義（`PREPARED`, `UPLOADED`）

### ステート遷移ルール

- **一方向遷移**: `PREPARED` → `UPLOADED` のみ許可
- **検証必須**: 不正な遷移はビジネスルールエラー（422）
- **追跡可能性**: 各ステートに`createdAt`/`updatedAt`を記録

## エンドポイント設計

### 準備エンドポイント

**パターン**: `POST /{parent-resource}/{id}/{child-resource}/prepare`

**例**: `POST /todos/{todoId}/attachments/prepare`

**リクエスト内容**:

- ファイル名（必須）
- ファイルサイズ（必須）
- Content-Type（必須）
- **ファイルバイナリは含めない**

**レスポンス内容**:

- 一時アップロードURL
- 作成されたリソース（ステータス: PREPARED）

### 完了通知エンドポイント

**パターン**: `PATCH /{parent-resource}/{id}/{child-resource}/{id}`

**例**: `PATCH /todos/{todoId}/attachments/{attachmentId}`

**リクエスト内容**:

- ステータス更新（`UPLOADED`）

**レスポンス内容**:

- 更新されたリソース（ステータス: UPLOADED）

### ダウンロードURLエンドポイント

**パターン**: `GET /{parent-resource}/{id}/{child-resource}/{id}/download-url`

**例**: `GET /todos/{todoId}/attachments/{attachmentId}/download-url`

**レスポンス内容**:

- 一時ダウンロードURL

**前提条件**: ステータスが`UPLOADED`である必要がある

## 命名規則

### リクエスト/レスポンススキーマ

| 用途           | パターン                    | 例                          |
| -------------- | --------------------------- | --------------------------- |
| 準備リクエスト | `Prepare{Resource}Params`   | `PrepareAttachmentParams`   |
| 準備レスポンス | `Prepare{Resource}Response` | `PrepareAttachmentResponse` |
| リソース       | `{Resource}Response`        | `AttachmentResponse`        |
| ステータスenum | `{Resource}Status`          | `AttachmentStatus`          |

### プロパティ名

| 概念            | プロパティ名  | 型        | 説明            |
| --------------- | ------------- | --------- | --------------- |
| ファイルサイズ  | `filesize`    | `integer` | バイト単位      |
| ファイル名      | `filename`    | `string`  | 拡張子含む      |
| MIMEタイプ      | `contentType` | `string`  | 例: `image/png` |
| アップロードURL | `uploadUrl`   | `string`  | Pre-signed URL  |
| ダウンロードURL | `downloadUrl` | `string`  | Pre-signed URL  |

**注**: `size`ではなく`filesize`を使用（明示性）

## バリデーション階層

### 第1階層: 型レベルバリデーション（OpenAPI）

- ファイルサイズ上限（`maximum`）
- ファイル名長さ（`minLength`, `maxLength`）
- 必須フィールド（`required`）

**HTTPステータス**: 400 Bad Request

### 第2階層: ドメインルール

- ファイル拡張子制限（許可リスト）
- ファイル名パターン検証

**HTTPステータス**: 422 Unprocessable Entity

### 第3階層: ビジネスルール

- 親リソース所有者チェック
- アップロード数上限
- ステータス遷移検証

**HTTPステータス**: 403 Forbidden / 404 Not Found / 422 Unprocessable Entity

## セキュリティ原則

### Pre-signed URL

**有効期限**: 15分を推奨

- アップロード: ファイル選択後すぐ実行を想定
- ダウンロード: ダウンロード開始後の猶予

**アクセス制御**:

1. API側で認証・認可チェック
2. Pre-signed URL発行時に権限検証
3. URL有効期限で一時性を確保

### ストレージ設定

- **HTTPS強制**: HTTP通信を拒否
- **プライベートバケット**: パブリックアクセス禁止
- **CORS設定**: 必要なオリジンのみ許可

## エラーハンドリング

### 準備フェーズ

| ケース                 | エラー型        | HTTPステータス |
| ---------------------- | --------------- | -------------- |
| 親リソース未検出       | NotFoundError   | 404            |
| 権限なし               | ForbiddenError  | 403            |
| 型レベルバリデーション | ValidationError | 400            |
| ドメインルール違反     | DomainError     | 422            |

### アップロードフェーズ

クライアント側でハンドリング（API関与なし）

### 完了通知フェーズ

| ケース             | エラー型      | HTTPステータス |
| ------------------ | ------------- | -------------- |
| リソース未検出     | NotFoundError | 404            |
| 不正なステート遷移 | DomainError   | 422            |

## レスポンス設計

### 親リソースID包含

ネストされたリソースのレスポンスには **親リソースID** を含める。

**理由**:

- レスポンスの自己完結性
- WebSocket/SSE等でURLコンテキストがない場合に対応

**例**:

```yaml
AttachmentResponse:
  properties:
    id: ... # 自身のID
    todoId: ... # 親リソースID（必須）
    filename: ...
```

## Do / Don't

### ✅ Good

```yaml
# Two-Phase Upload採用
POST /prepare → 直接アップロード → PATCH /update

# ステータス管理
enum: [PREPARED, UPLOADED]

# メタデータのみ送信
properties:
  filename: string
  filesize: integer
  contentType: string

# Pre-signed URL有効期限設定
uploadUrl: "https://...?Expires=900"

# 親リソースID包含
properties:
  id: ...
  parentId: ...
```

### ❌ Bad

```yaml
# APIサーバー経由でアップロード
POST /attachments
Content-Type: multipart/form-data  # ❌ サーバー負荷

# ステータス管理なし
# ❌ 進行状況追跡不可

# size プロパティ名
properties:
  size: integer  # ❌ filesize を使用すべき

# 有効期限なし
uploadUrl: "https://..."  # ❌ セキュリティリスク

# 親IDなし
properties:
  id: ...
  # ❌ parentId がない
```
