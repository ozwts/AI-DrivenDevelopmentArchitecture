# バリデーション制約パターン

## 核心原則

OpenAPIスキーマは**空文字列ではなくオプショナル**を使用する。

**関連ドキュメント**:
- **OpenAPI全体像**: `10-openapi-overview.md`
- **エンドポイント設計**: `20-endpoint-design.md`

## 空文字列禁止原則

### オプショナルフィールドの設計方針

**原則**: オプショナルフィールドは**空文字列ではなくundefined（省略）**で表現する。

```yaml
# ✅ Good: オプショナルフィールド
projectId:
  type: string
  minLength: 1  # 空文字列禁止
  description: プロジェクトID（省略可能。値を送信する場合は1文字以上必須）

# ❌ Bad: 空文字列を許可
projectId:
  type: string
  description: プロジェクトID
  # minLengthがないため、空文字列が許可される
```

**理由**:
1. **意図の明確化**: 「値がない」状態を空文字列ではなくundefinedで表現
2. **バリデーション統一**: すべての文字列フィールドに一貫したルールを適用
3. **バグ防止**: 空文字列と未設定の区別が不要になる

## OpenAPI定義パターン

### 必須フィールド

```yaml
RegisterTodoParams:
  type: object
  required:
    - title
  properties:
    title:
      type: string
      minLength: 1  # 空文字列禁止
      maxLength: 200
      description: TODOのタイトル
```

**重要**: 必須フィールドは`required`に含め、`minLength: 1`で空文字列を禁止する。

### オプショナルフィールド

```yaml
RegisterTodoParams:
  type: object
  properties:
    projectId:
      type: string
      minLength: 1  # 空文字列禁止
      description: プロジェクトID（省略可能。値を送信する場合は1文字以上必須）
    assigneeUserId:
      type: string
      minLength: 1  # 空文字列禁止
      description: 担当者のユーザーID（省略可能。値を送信する場合は1文字以上必須）
```

**重要**:
- `required`には含めない（オプショナル）
- `minLength: 1`で空文字列を禁止
- クライアントは値がない場合はフィールドを省略

### 更新パラメータ（PATCH）

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
      description: TODOのタイトル
    projectId:
      type: string
      minLength: 1  # 空文字列禁止
      description: プロジェクトID（省略可能。値を送信する場合は1文字以上必須）
    assigneeUserId:
      type: string
      minLength: 1  # 空文字列禁止
      description: 担当者のユーザーID（省略可能。値を送信する場合は1文字以上必須）
```

**注**: PATCH統一原則により、すべてのフィールドはオプショナル（`required`は空）。

## クライアント実装パターン

### 値がない場合は省略

```typescript
// ✅ Good: 値がない場合はフィールドを省略
const params = {
  title: "新しいタスク",
  // projectIdは未設定なので省略（undefinedまたはフィールド自体を含めない）
};

await fetch('/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params),
});
```

```typescript
// ❌ Bad: 空文字列を送信
const params = {
  title: "新しいタスク",
  projectId: "",  // ❌ 空文字列は送信しない
};
```

### 値をクリア（未設定に戻す）

```typescript
// ✅ Good: フィールドを省略（既存値が維持される）
const params = {
  title: "更新されたタスク",
  // projectIdを省略すると既存値が維持される
};

await fetch(`/todos/${todoId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params),
});
```

**注**: 現在の設計では、フィールドを省略すると既存値が維持される。値をクリア（未設定に戻す）機能が必要な場合は、別途設計が必要（例: `projectId: null`を許可する）。

## Handler層での正規化

Handler層では、防御的対応として空文字列を`undefined`に変換する。

```typescript
// Handler層での正規化（防御的対応）
const parseResult = schemas.RegisterTodoParams.safeParse(rawBody);
if (!parseResult.success) {
  return c.json({ name: "ValidationError", ... }, 400);
}

const body = parseResult.data;

// 入力の正規化: 空文字列は意味を持たないのでundefinedに変換
const projectId =
  body.projectId?.trim() === "" ? undefined : body.projectId;
const assigneeUserId =
  body.assigneeUserId?.trim() === "" ? undefined : body.assigneeUserId;

const result = await useCase.execute({
  title: body.title,
  projectId,  // undefinedまたは有効な文字列
  assigneeUserId,  // undefinedまたは有効な文字列
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
  minLength: 1  # 空文字列禁止
  maxLength: 200
  description: タイトル

# オプショナルフィールド（空文字列禁止）
description:
  type: string
  minLength: 1  # 送信する場合は1文字以上必須
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

**注意**: enum定義は大文字スネークケースで統一（`10-openapi-overview.md`参照）。

## Do / Don't

### ✅ Good

```yaml
# オプショナルフィールドにminLength: 1を設定
projectId:
  type: string
  minLength: 1
  description: プロジェクトID（省略可能。値を送信する場合は1文字以上必須）

# 必須フィールドにminLength: 1を設定
title:
  type: string
  minLength: 1
  maxLength: 200
  description: タイトル

# descriptionで制約の意図を明記
assigneeUserId:
  type: string
  minLength: 1
  description: 担当者のユーザーID（省略可能。値を送信する場合は1文字以上必須）
```

```typescript
// クライアント: 値がない場合は省略
const params = {
  title: "新しいタスク",
  // projectIdは省略（undefinedまたはフィールド自体を含めない）
};
```

```typescript
// Handler層: 空文字列をundefinedに変換（防御的対応）
const projectId =
  body.projectId?.trim() === "" ? undefined : body.projectId;
```

### ❌ Bad

```yaml
# minLengthがない（空文字列が許可される）
projectId:
  type: string
  description: プロジェクトID

# minLengthが0（空文字列が許可される）
title:
  type: string
  minLength: 0  # ❌ 1以上にすべき
  maxLength: 200
```

```typescript
// 空文字列を送信
const params = {
  title: "新しいタスク",
  projectId: "",  // ❌ 省略すべき
};
```

```typescript
// Handler層で空文字列をチェックしない
const result = await useCase.execute({
  projectId: body.projectId,  // ❌ 空文字列のまま渡される可能性
});
```

## チェックリスト

```
[ ] すべての文字列フィールドにminLength: 1を設定（空文字列禁止）
[ ] 必須フィールドはrequiredに含め、minLength: 1を設定
[ ] オプショナルフィールドはrequiredに含めず、minLength: 1を設定
[ ] descriptionで制約の意図を明記
[ ] クライアントは値がない場合はフィールドを省略
[ ] Handler層で空文字列をundefinedに変換（防御的対応）
```
