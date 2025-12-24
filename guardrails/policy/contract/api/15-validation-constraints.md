# バリデーション制約パターン

## 核心原則

OpenAPIスキーマは**空文字列を許容**し、**変換はフロント/サーバー双方の境界層で行う**。

**根拠となる憲法**:
- `boundary-principles.md`: 境界の両側は独立して変換を行う
- `simplicity-principles.md`: Simple First, Then Easy

**関連ドキュメント**:
- **OpenAPI全体像**: `10-api-overview.md`
- **HTTP操作**: `25-http-operations.md`
- **PATCH 3値セマンティクス**: `30-patch-semantics.md`

## 空文字列の処理方針

### 設計の背景

HTMLフォームは未入力を空文字列（`""`）として扱う。この「境界での表現の違い」を、API契約を厳格にするのではなく、**各境界層で変換**することで解決する。

### 責務の分担

| 層 | 責務 | 変換内容 |
|----|------|----------|
| フロントエンド（normalize.ts） | HTMLフォームの都合を吸収 | `""` → 除外（POST）/ null（PATCH） |
| サーバー（Handler層） | 外部入力を内部形式に変換 | `""` → undefined |
| ドメイン層 | ビジネスロジック | 変換済みデータを使用 |

## minLength: 1 の設定基準

ドメインで必須な属性には`minLength: 1`を設定する。

Zodは`z.string()`で空文字列を有効値とする（TypeScript型システム準拠）。auto-generated Zodスキーマでフォームバリデーションを機能させるには、OpenAPIで`minLength: 1`を設定し`z.string().min(1)`を生成する必要がある。

### 判断基準: ドメインで値の省略を許容するか

| 属性種別 | Register*Params | Update*Params | 理由 |
|---------|-----------------|---------------|------|
| 必須属性（ドメインで必ず値が必要） | required + minLength:1 | minLength:1（requiredなし） | 値を指定するなら有効値必須 |
| オプショナル属性（ドメインでundefined可） | minLengthなし | minLengthなし + nullable:true | 境界層で変換 |

**ポイント**: Update*Paramsでは`required`をつけない（省略=変更しない）が、`minLength:1`は設定する（指定するなら有効値）。

## OpenAPI定義パターン

### 文字列フィールド

```yaml
# 必須属性（ドメインでnull不可）: minLength: 1 を設定
title:
  type: string
  minLength: 1
  maxLength: 200
  description: タイトル

# オプショナル属性（ドメインでnull可）: minLength なし
description:
  type: string
  maxLength: 5000
  description: 説明（省略可能）
```

### パターン制約

```yaml
# 正規表現パターン（必要な場合のみ）
color:
  type: string
  pattern: "^#[0-9A-Fa-f]{6}$"
  description: カラーコード（例：#001964）
```

### enum制約

```yaml
# enum値で選択肢を制限
status:
  type: string
  enum: [PENDING, IN_PROGRESS, COMPLETED]
  description: ステータス
```

## Register*Params（POST）と Update*Params（PATCH）の違い

### 核心原則

**Register*Params（POST）では `nullable: true` を設定しない。Update*Params（PATCH）でのみ `nullable: true` を設定する。**

### 理由

| スキーマ | nullable: true | 許可される状態 |
|---------|----------------|----------------|
| Register*Params | ❌ 設定しない | 2値: 有効な値 or 省略 |
| Update*Params | ✅ 必要に応じて設定 | 3値: 有効な値 or null or 省略 |

### OpenAPI定義例

```yaml
# Register*Params（POST）
RegisterTodoParams:
  type: object
  required:
    - title            # ドメインで必須属性 → required配列に含める
  properties:
    title:
      type: string
      minLength: 1     # 必須属性: minLength: 1
      maxLength: 200
    description:
      type: string
      maxLength: 5000  # オプショナル属性: minLength なし
    projectId:
      type: string     # オプショナル属性: minLength なし

# Update*Params（PATCH）
UpdateTodoParams:
  type: object
  # required なし（省略=変更しない）
  properties:
    title:
      type: string
      minLength: 1     # 必須属性: requiredなし + minLength:1
      maxLength: 200
    description:
      type: string
      maxLength: 5000
      nullable: true   # オプショナル属性: クリア操作を許可
    projectId:
      type: string
      nullable: true   # オプショナル属性: クリア操作を許可
```

## 境界層での変換

オプショナルフィールドの空文字列は核心原則に従い、境界層で変換する。

### フロントエンド（normalize.ts）

```typescript
// POST: オプショナルフィールドの空文字列を除外
export function normalizePostRequest<T>(data: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.trim() === "") {
      continue;  // 空文字列は送信しない（オプショナルフィールド）
    }
    result[key as keyof T] = value;
  }
  return result;
}

// PATCH: 空文字列をnullに変換（クリア操作）
export function normalizePatchRequest<T>(
  data: T,
  dirtyFields: Partial<Record<keyof T, boolean>>,
): Partial<T> {
  // 1. dirtyFieldsでフィルタリング
  // 2. 空文字列をnullに変換
}
```

**参照**: `../../web/api/20-request-normalization.md`

### サーバー（Handler層）

```typescript
// オプショナルフィールドの空文字列をundefinedに変換
const projectId =
  body.projectId?.trim() === "" ? undefined : body.projectId;
```

**参照**: `../../server/handler/21-http-handler-implementation.md`

## PATCH操作での3値セマンティクス

| クライアント送信 | 意味       | OpenAPI設定          |
| ---------------- | ---------- | -------------------- |
| フィールド省略   | 変更しない | -                    |
| `null`送信       | クリアする | `nullable: true`必須 |
| 値を送信         | 値を設定   | -                    |

**詳細**: `30-patch-semantics.md` を参照

## Do / Don't

### ✅ Do

```yaml
# 必須属性（ドメインでnull不可）: minLength: 1 を設定
title:
  type: string
  minLength: 1
  maxLength: 200

# オプショナル属性（ドメインでnull可）: minLength なし
description:
  type: string
  maxLength: 5000

# Update*Paramsで必須属性: requiredなし + minLength:1
UpdateUserParams:
  properties:
    name:
      type: string
      minLength: 1  # 省略OK、指定するなら有効値

# Update*Paramsでオプショナル属性: nullable: true
UpdateTodoParams:
  properties:
    projectId:
      type: string
      nullable: true  # クリア操作を許可
```

```typescript
// フロントエンド: オプショナルの空文字列を除外/null変換
const normalized = normalizePostRequest(data);
const normalized = normalizePatchRequest(data, dirtyFields);

// サーバー: オプショナルの空文字列をundefinedに変換
const projectId = body.projectId?.trim() === "" ? undefined : body.projectId;
```

### ❌ Don't

```yaml
# 必須属性に minLength: 1 がない
title:
  type: string
  maxLength: 200  # ❌ minLength: 1 がない

# オプショナル属性に minLength: 1 を設定
description:
  type: string
  minLength: 1  # ❌ オプショナル属性には設定しない
  maxLength: 5000

# Update*Paramsで必須属性にrequiredをつける
UpdateUserParams:
  required:
    - name  # ❌ PATCHセマンティクスが壊れる（省略不可になる）
```

```typescript
// オプショナルの空文字列をそのまま渡す
const result = await useCase.execute({
  projectId: body.projectId,  // ❌ 空文字列のまま渡される可能性
});
```

