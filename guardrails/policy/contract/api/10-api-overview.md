# OpenAPI仕様の全体像

## 核心原則

OpenAPI仕様は**システム境界の契約**であり、**型レベルバリデーションの唯一の真実の情報源**である。

## OpenAPI仕様の責務

### 実施すること

1. **API契約定義**: エンドポイント、HTTPメソッド、パス、ステータスコード
2. **型レベルバリデーション**: リクエスト・レスポンスの型、必須性、形式、長さ、enum値
3. **ドキュメント生成**: 自動生成される仕様書がAPI契約書となる
4. **バリデーションスキーマ生成**: Zodスキーマの自動生成元（TypeScript型は`z.infer`で推論）

### 実施しないこと

1. **ドメインルール**: OpenAPIで表現できない複雑なルール → Domain層（Value Object/Entity、DomainErrorを返す）
2. **ビジネスルール**: DB参照を伴うルール → UseCase層
3. **実装詳細**: 内部のクラス構造、データベーススキーマ
4. **ドメインロジックを含むバリデーション**: OpenAPIでも表現可能な場合があるが、**実施しない**
   - 例: 年齢が18歳以上（`minimum: 18`と定義可能だが、ドメインロジックなのでDomain層（Value Object/Entity）で実施）
   - 例: 会社ドメインのメールアドレスのみ許可（`pattern`で定義可能だが、ドメインロジックなのでDomain層（Value Object/Entity）で実施）
   - 理由: ドメインロジックはValue Objectに集約し、責務を明確にする

### OpenAPIのenum定義

**OpenAPIの責務**: enumで選択肢を定義し、**型レベルバリデーション**を実施する。

**enum定義の原則**:

1. **大文字のスネークケース**で定義（例: `LOW`, `MEDIUM`, `HIGH`, `TODO`, `IN_PROGRESS`, `COMPLETED`）
2. ドメイン側のTypeScript型エイリアスまたはValue Objectの入力値と**完全に一致**させる
3. OpenAPIで定義されたenum値は、Zodスキーマで自動的に型レベルバリデーションされる

**例**:

```yaml
{Entity}Priority:
  type: string
  enum: [LOW, MEDIUM, HIGH]  # ドメイン層: type {Entity}Priority = "LOW" | "MEDIUM" | "HIGH" と一致
  description: 優先度

{Entity}Status:
  type: string
  enum: [DRAFT, ACTIVE, COMPLETED]  # ドメイン層: {Entity}Status.from({ status: "DRAFT" }) と一致
  description: ステータス
```

**重要**: OpenAPIのenum値は、ドメイン層の型エイリアスまたはValue Objectの入力値と**完全に一致**させる必要がある。

- 型エイリアス例: `type Priority = "LOW" | "MEDIUM" | "HIGH"`
- Value Object例: `Status.from({ status: "DRAFT" })`, `Status.from({ status: "COMPLETED" })`

**OpenAPIとドメイン層の責務分担**:

- **OpenAPI（本ポリシー）**: enum値を定義し、型レベルバリデーション（ValidationError、400 Bad Request）
- **ドメイン層**: 型エイリアスまたはValue Object化の判断、ドメインルール実装（DomainError、422 Unprocessable Entity）
  - 詳細: `guardrails/policy/server/domain-model/11-domain-validation-strategy.md` を参照

## Single Source of Truth原則

**参照**: `guardrails/constitution/structural-discipline/responsibility-principles.md`

### バリデーション階層における位置付け

OpenAPI仕様は**第1階層：型レベルバリデーション**の唯一の定義元である。

```
第1階層: OpenAPI仕様（真実の情報源）
    ↓ 型レベルバリデーション（minLength、maxLength、pattern、enum等）
    ↓ ValidationError（400 Bad Request）
    ↓ 自動生成（openapi-zod-client）
Zodスキーマ（src/generated/zod-schemas.ts）
    ↓ z.infer で型推論
TypeScript型定義
    ↓ 使用
Handler層（バリデーション実行）

第2階層: Domain層（Value Object/Entity）
    ↓ ドメインルール（OpenAPIで表現できても実施しない）
    ↓ DomainError（422 Unprocessable Entity）

第3階層: UseCase層
    ↓ ビジネスルール（DB参照、権限チェック等）
    ↓ 各種エラー（NotFoundError、ForbiddenError等）
```

**重要**:

- 型レベルのバリデーションルールは、OpenAPI仕様にのみ記述する。コード内に手動で重複実装しない。
- ドメインロジックを含むバリデーションは、OpenAPIでも表現可能な場合があるが、**実施しない**（Domain層（Value Object/Entity）の責務）。

## ファイル配置

```
プロジェクトルート/
├── {resource}.openapi.yaml              # OpenAPI仕様書（単一ファイル）
├── server/
│   └── src/
│       ├── generated/
│       │   └── schemas.*                # 自動生成されたスキーマ
│       └── handler/                     # バリデーション実行
└── web/
    └── src/
        └── generated/
            └── schemas.*                # 自動生成されたスキーマ
```

**自動生成コマンド**:

```bash
npm run codegen  # server と web で実行
```

**実体**:

```bash
# server/package.json & web/package.json
openapi-zod-client '../todo.openapi.yaml' \
  --output './src/generated/zod-schemas.ts' \
  --export-schemas
```

## OpenAPI仕様の構造

### 基本構成

```yaml
openapi: 3.0.2
info:
  title: アプリケーション名
  version: バージョン
  description: 説明

paths:
  /{resource}:
    get: ...
    post: ...

components:
  schemas:
    {Entity}Response:
      type: object
      required: [...]
      properties: ...
    {Action}{Entity}Params:
      type: object
      required: [...]
      properties: ...
```

## スキーマ命名規則

### リクエストスキーマ

| 用途          | パターン                 | 例                                               |
| ------------- | ------------------------ | ------------------------------------------------ |
| POST（作成）  | `{Action}{Entity}Params` | `Create{Entity}Params`, `Register{Entity}Params` |
| PATCH（更新） | `Update{Entity}Params`   | `Update{Entity}Params`                           |

**注**: PUTは使用しない（PATCH統一）。詳細は `20-endpoint-design.md` - HTTPメソッド統一ポリシーを参照。

### レスポンススキーマ

| 用途             | パターン                   | 例                        |
| ---------------- | -------------------------- | ------------------------- |
| 単一リソース     | `{Entity}Response`         | `{Entity}Response`        |
| リスト           | `{Entity}sResponse`        | `{Entity}sResponse`       |
| 特殊なアクション | `{Action}{Entity}Response` | `Prepare{Entity}Response` |

### 共通スキーマ

| 用途           | パターン          | 例                                   |
| -------------- | ----------------- | ------------------------------------ |
| エラー         | `ErrorResponse`   | `ErrorResponse`                      |
| ヘルスチェック | `HealthResponse`  | `HealthResponse`                     |
| enum型         | `{Entity}{Field}` | `{Entity}Status`, `{Entity}Priority` |

## 型定義パターン

### 基本的なプロパティ

```yaml
properties:
  id:
    type: string
    description: 一意の識別子
  name:
    type: string
    minLength: 1
    maxLength: 200
    description: 名前
  createdAt:
    type: string
    format: date-time
    description: 作成日時（ISO 8601形式）
```

### 必須・オプショナル

```yaml
required:
  - id
  - name
  - createdAt
properties:
  id: ...
  name: ...
  description: # requiredに含まれていない = オプショナル
    type: string
  createdAt: ...
```

### enum型

```yaml
{Entity}Status:
  type: string
  enum:
    - DRAFT
    - ACTIVE
    - COMPLETED
  description: ステータス
```

**注**: enum値は大文字スネークケースで定義し、ドメイン層の型エイリアスまたはValue Objectの入力値と一致させる。

#### enum型の参照方法

**原則**: enum型を参照する場合は直接`$ref`を使用する。`allOf`は使用しない。

**✅ 正しい書き方**:

```yaml
Create{Entity}Params:
  properties:
    status:
      $ref: "#/components/schemas/{Entity}Status"
      description: ステータス
```

**❌ 誤った書き方**:

```yaml
Create{Entity}Params:
  properties:
    status:
      allOf: # ❌ 不要な複雑性
        - $ref: "#/components/schemas/{Entity}Status"
      description: ステータス
```

**理由**:

- `allOf`は複数のスキーマを組み合わせる際に使用するもの
- 単一の`$ref`のみの場合は`allOf`は不要で、直接`$ref`を使うのがシンプルで推奨される
- OpenAPI 3.0の標準的な書き方に従う

### ネストされたオブジェクト

```yaml
{Entity}Response:
  type: object
  required:
    - id
    - childResources
  properties:
    id:
      type: string
    childResources:
      type: array
      items:
        $ref: '#/components/schemas/{ChildEntity}Response'
```

## バリデーション制約

### 文字列

```yaml
title:
  type: string
  minLength: 1
  maxLength: 200
  pattern: "^[a-zA-Z0-9 ]+$" # 正規表現（必要な場合のみ）
```

### 数値

```yaml
priority:
  type: integer
  minimum: 1
  maximum: 5
```

### 配列

```yaml
tags:
  type: array
  minItems: 0
  maxItems: 10
  items:
    type: string
```

## ネストされたリソースの親ID

**設計原則**: ネストされたリソースのレスポンスには親IDを含める。

**理由**:

- レスポンスボディの自己完結性
- フロントエンド状態管理の利便性
- WebSocket/SSEなどURLコンテキストがない場合への対応

**例**:

```yaml
{ChildEntity}Response:
  type: object
  required:
    - id
    - {parentEntity}Id      # 親リソースのID
    - name
  properties:
    id:
      type: string
      description: 子リソースID
    {parentEntity}Id:
      type: string
      description: 親リソースのID
    name:
      type: string
```

**エンドポイント**: `GET /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}`

- URLパスに`{parentEntity}Id`が含まれるが、レスポンスボディにも含める

## OpenAPI-First開発フロー

```
1. OpenAPI仕様書を更新
   ↓
2. 自動生成コマンド実行
   ↓
3. スキーマが生成される
   ↓
4. Handler層で型推論
   ↓
5. スキーマでバリデーション実行
   ↓
6. 型安全な実装
```

**重要**:

- 仕様変更は必ずOpenAPIから開始する（コードから逆算しない）
- 型定義は手動で作成せず、生成されたスキーマから推論

## Do / Don't

### ✅ Good

```yaml
# OpenAPI仕様（明確な説明）
name:
  type: string
  minLength: 1
  maxLength: 200
  description: リソース名（1文字以上200文字以下）

# 適切なrequired指定
required:
  - id
  - name
  - createdAt

# enumで選択肢を制限（大文字スネークケース）
status:
  type: string
  enum: [DRAFT, ACTIVE, COMPLETED]

# ネストされたリソースに親ID含める
{ChildEntity}Response:
  properties:
    id: ...
    {parentEntity}Id: ...  # 親ID
```

### ❌ Bad

```yaml
# 説明なし
name:
  type: string  # ❌ 制約や説明がない

# 制約なし
title:
  type: string  # ❌ minLength/maxLengthがない

# requiredの過不足
required: []    # ❌ すべてオプショナルは不自然
required: [id, name, description]  # ❌ descriptionは通常オプショナル

# マジックナンバー
priority:
  type: integer  # ❌ enumで定義すべき

# ネストされたリソースに親IDなし
{ChildEntity}Response:
  properties:
    id: ...
    # ❌ {parentEntity}Idがない
```

## HTTPメソッド設計原則

**PATCH統一原則**: 更新操作はPATCHのみを使用（PUTは使用しない）

| HTTPメソッド | CRUD操作 | ステータスコード | 説明                                             |
| ------------ | -------- | ---------------- | ------------------------------------------------ |
| POST         | Create   | 201 Created      | リソース作成                                     |
| GET          | Read     | 200 OK           | リソース取得                                     |
| PATCH        | Update   | 200 OK           | **リソース更新（すべてオプショナルフィールド）** |
| DELETE       | Delete   | 204 No Content   | リソース削除                                     |

**詳細**: `20-endpoint-design.md` - HTTPメソッド統一ポリシーを参照

## チェックリスト

```
[ ] OpenAPI 3.0.2以降を使用
[ ] すべてのエンドポイントを定義
[ ] リクエスト・レスポンススキーマを定義
[ ] required/optionalを明示
[ ] 文字列フィールドに型レベル制約を設定（minLength/maxLength/pattern/enum）
[ ] 空文字列を禁止（15-validation-constraints.md参照）
[ ] 値のクリアが必要なフィールドにnullableを設定（20-endpoint-design.md参照）
[ ] ドメインロジックを含むバリデーションは実施しない
[ ] enumで選択肢を制限（大文字スネークケース、ドメイン層の型定義と一致）
[ ] enum型参照は直接$refを使用（allOfは使用しない）
[ ] descriptionで説明を記載
[ ] ネストされたリソースに親IDを含める
[ ] PUTは使用しない（PATCHで統一）
[ ] スキーマ自動生成が正常に動作
[ ] ValidationErrorは400 Bad Requestで返す
```
