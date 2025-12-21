# バリデーション制約パターン

## 核心原則

OpenAPIスキーマは**空文字列ではなくオプショナル**を使用する。

**関連ドキュメント**:

- **OpenAPI全体像**: `10-api-overview.md`
- **エンドポイント設計**: `20-endpoint-design.md`

## 空文字列禁止原則

### オプショナルフィールドの設計方針

**原則**: オプショナルフィールドは**空文字列ではなくundefined（省略）**で表現する。

```yaml
# ✅ Good: オプショナルフィールド
{parentEntity}Id:
  type: string
  minLength: 1  # 空文字列禁止
  description: 親リソースID（省略可能。値を送信する場合は1文字以上必須）

# ❌ Bad: 空文字列を許可
{parentEntity}Id:
  type: string
  description: 親リソースID
  # minLengthがないため、空文字列が許可される
```

**理由**:

1. **意図の明確化**: 「値がない」状態を空文字列ではなくundefinedで表現
2. **バリデーション統一**: すべての文字列フィールドに一貫したルールを適用
3. **バグ防止**: 空文字列と未設定の区別が不要になる

## OpenAPI定義パターン

### 必須フィールド

```yaml
Create{Entity}Params:
  type: object
  required:
    - name
  properties:
    name:
      type: string
      minLength: 1 # 空文字列禁止
      maxLength: 200
      description: リソース名
```

**重要**: 必須フィールドは`required`に含め、`minLength: 1`で空文字列を禁止する。

### オプショナルフィールド

```yaml
Create{Entity}Params:
  type: object
  properties:
    {parentEntity}Id:
      type: string
      minLength: 1  # 空文字列禁止
      description: 親リソースID（省略可能。値を送信する場合は1文字以上必須）
    {assignee}Id:
      type: string
      minLength: 1  # 空文字列禁止
      description: 担当者ID（省略可能。値を送信する場合は1文字以上必須）
```

**重要**:

- `required`には含めない（オプショナル）
- `minLength: 1`で空文字列を禁止
- クライアントは値がない場合はフィールドを省略

### 更新パラメータ（PATCH）

```yaml
Update{Entity}Params:
  type: object
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 200
      description: リソース名
    {parentEntity}Id:
      type: string
      minLength: 1  # 空文字列禁止
      description: 親リソースID（省略可能。値を送信する場合は1文字以上必須）
    {assignee}Id:
      type: string
      minLength: 1  # 空文字列禁止
      description: 担当者ID（省略可能。値を送信する場合は1文字以上必須）
```

**注**: PATCH統一原則により、すべてのフィールドはオプショナル（`required`は空）。

## クライアント実装パターン

### 値がない場合は省略

```typescript
// ✅ Good: 値がない場合はフィールドを省略
const params = {
  name: "新しいリソース",
  // {parentEntity}Idは未設定なので省略（undefinedまたはフィールド自体を含めない）
};

await fetch("/{resources}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(params),
});
```

```typescript
// ❌ Bad: 空文字列を送信
const params = {
  name: "新しいリソース",
  {parentEntity}Id: "",  // ❌ 空文字列は送信しない
};
```

### 値をクリア（未設定に戻す）- PATCH操作のみ

**重要**: PATCH操作（Update\*Params）で一度設定した値を「未設定」に戻すには、`nullable: true`が必要です。

#### 3値の区別

| クライアント送信 | 意味       | OpenAPI設定          |
| ---------------- | ---------- | -------------------- |
| フィールド省略   | 変更しない | -                    |
| `null`送信       | クリアする | `nullable: true`必須 |
| 値を送信         | 値を設定   | -                    |

#### OpenAPI定義

```yaml
Update{Entity}Params:
  type: object
  properties:
    {parentEntity}Id:
      type: string
      minLength: 1      # 空文字列禁止
      nullable: true    # クリア操作を許可
      description: 親リソースID（省略可能、nullで"未割り当て"に設定）
```

#### クライアント実装

```typescript
// ケース1: フィールドを省略（既存値が維持される）
const params = {
  name: "更新されたリソース",
  // {parentEntity}Idを省略すると既存値が維持される
};

await fetch(`/{resources}/{resourceId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(params),
});
```

```typescript
// ケース2: nullを送信（値をクリア）
const params = {
  name: "更新されたリソース",
  {parentEntity}Id: null,  // 親リソース未割り当てに戻す
};

await fetch(`/{resources}/{resourceId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params),
});
```

**詳細**: `20-endpoint-design.md` - PATCH操作でのフィールドクリア（null使用）を参照

## Handler層での正規化

Handler層では、防御的対応として空文字列を`undefined`に変換する。

```typescript
// Handler層での正規化（防御的対応）
const parseResult = schemas.Create{Entity}Params.safeParse(rawBody);
if (!parseResult.success) {
  return c.json({ name: "ValidationError", ... }, 400);
}

const body = parseResult.data;

// 入力の正規化: 空文字列は意味を持たないのでundefinedに変換
const {parentEntity}Id =
  body.{parentEntity}Id?.trim() === "" ? undefined : body.{parentEntity}Id;
const {assignee}Id =
  body.{assignee}Id?.trim() === "" ? undefined : body.{assignee}Id;

const result = await useCase.execute({
  name: body.name,
  {parentEntity}Id,  // undefinedまたは有効な文字列
  {assignee}Id,  // undefinedまたは有効な文字列
});
```

**理由**:

- OpenAPIスキーマで`minLength: 1`を設定していれば、この正規化は不要
- しかし、防御的対応として実装することで堅牢性を向上

## 責務の分担

**OpenAPI層**: 契約レベルで空文字列を禁止（`minLength: 1`）
**Handler層**: 入力の正規化（防御的対応）

## 文字列フィールドの制約パターン

### 基本的な文字列フィールド

```yaml
# 必須フィールド（空文字列禁止）
title:
  type: string
  minLength: 1 # 空文字列禁止
  maxLength: 200
  description: タイトル

# オプショナルフィールド（空文字列禁止）
description:
  type: string
  minLength: 1 # 送信する場合は1文字以上必須
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

**注意**: パターン制約は型レベルバリデーションの範囲。ドメインロジックを含む複雑なパターンはDomain層で実施する。

### enum制約

```yaml
# enum値で選択肢を制限
status:
  type: string
  enum: [PENDING, IN_PROGRESS, COMPLETED]
  description: ステータス
```

**注意**: enum定義は大文字スネークケースで統一（`10-api-overview.md`参照）。

## Do / Don't

### ✅ Good

```yaml
# オプショナルフィールドにminLength: 1を設定
{parentEntity}Id:
  type: string
  minLength: 1
  description: 親リソースID（省略可能。値を送信する場合は1文字以上必須）

# 必須フィールドにminLength: 1を設定
name:
  type: string
  minLength: 1
  maxLength: 200
  description: リソース名

# descriptionで制約の意図を明記
{assignee}Id:
  type: string
  minLength: 1
  description: 担当者ID（省略可能。値を送信する場合は1文字以上必須）
```

```typescript
// クライアント: 値がない場合は省略
const params = {
  name: "新しいリソース",
  // {parentEntity}Idは省略（undefinedまたはフィールド自体を含めない）
};
```

```typescript
// Handler層: 空文字列をundefinedに変換（防御的対応）
const {parentEntity}Id =
  body.{parentEntity}Id?.trim() === "" ? undefined : body.{parentEntity}Id;
```

### ❌ Bad

```yaml
# minLengthがない（空文字列が許可される）
{parentEntity}Id:
  type: string
  description: 親リソースID

# minLengthが0（空文字列が許可される）
name:
  type: string
  minLength: 0  # ❌ 1以上にすべき
  maxLength: 200
```

```typescript
// 空文字列を送信
const params = {
  name: "新しいリソース",
  {parentEntity}Id: "",  // ❌ 省略すべき
};
```

```typescript
// Handler層で空文字列をチェックしない
const result = await useCase.execute({
  {parentEntity}Id: body.{parentEntity}Id,  // ❌ 空文字列のまま渡される可能性
});
```

## Register*Params（POST）と Update*Params（PATCH）の違い

### 核心原則

**Register*Params（POST）では `nullable: true` を設定しない。Update*Params（PATCH）でのみ `nullable: true` を設定する。**

### 理由

| スキーマ | nullable: true | 空文字列 | 許可される状態 |
|---------|----------------|----------|----------------|
| Register*Params | ❌ 設定しない | ❌ minLength: 1 | 2値: 有効な値 or 省略 |
| Update*Params | ✅ 必要に応じて設定 | ❌ minLength: 1 | 3値: 有効な値 or null or 省略 |

**POSTで `nullable: true` を設定しない理由**:

1. **意味的な不整合**: 新規作成時に「値をクリアする」操作は存在しない
2. **バリデーションエラー回避**: `null` を送信すると型エラー（`nullable: true` なしでは null は許可されない）
3. **シンプルな契約**: 2値（有効な値 or 省略）で十分

### OpenAPI定義例

```yaml
# ✅ Good: Register*Params（POST）- nullable: true なし
RegisterTodoParams:
  type: object
  required:
    - title
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
    description:
      type: string
      minLength: 1    # 空文字列禁止
      # nullable: true なし（新規作成時に「クリア」は不要）
    projectId:
      type: string
      minLength: 1    # 空文字列禁止
      # nullable: true なし

# ✅ Good: Update*Params（PATCH）- nullable: true あり
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
    description:
      type: string
      minLength: 1    # 空文字列禁止
      nullable: true  # クリア操作を許可
    projectId:
      type: string
      minLength: 1    # 空文字列禁止
      nullable: true  # クリア操作を許可
```

### クライアント実装への影響

**参照**: `../../web/api/20-request-normalization.md` - フロントエンドでの正規化実装

| HTTPメソッド | 空文字列の扱い | 正規化関数 |
|-------------|---------------|-----------|
| POST | 省略（フィールドを送信しない） | `normalizePostRequest()` |
| PATCH | `null` に変換 | `normalizePatchRequest()` |

```typescript
// POST: 空文字列フィールドを省略
const normalized = normalizePostRequest(data);
// { title: "タイトル", description: "" } → { title: "タイトル" }

// PATCH: 空文字列を null に変換（dirtyFieldsでフィルタリング後）
const normalized = normalizePatchRequest(data, dirtyFields);
// { description: "" } → { description: null }
```

## チェックリスト

```
[ ] すべての文字列フィールドにminLength: 1を設定（空文字列禁止）
[ ] 必須フィールドはrequiredに含め、minLength: 1を設定
[ ] オプショナルフィールドはrequiredに含めず、minLength: 1を設定
[ ] Register*Paramsでは nullable: true を設定しない
[ ] Update*Paramsでは値のクリアが必要なフィールドに nullable: true を設定
[ ] descriptionで制約の意図を明記
```
