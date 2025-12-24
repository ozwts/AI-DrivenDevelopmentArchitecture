# PATCH 3値セマンティクス

## 核心原則

PATCHリクエストでは**フィールド省略・null送信・値送信**の3値を区別し、JSON層の`null`はHandler層で`undefined`に変換する。

**関連ドキュメント**:
- **HTTP操作概要**: `30-http-operations-overview.md`
- **バリデーション制約**: `15-validation-constraints.md`
- **フロントエンド正規化**: `../../web/api/20-request-normalization.md`
- **Handler層実装**: `../../server/handler/21-http-handler-implementation.md`

## 3値の区別

| クライアント送信 | JSON表現                              | 意味       | TypeScript内部                                   |
| ---------------- | ------------------------------------- | ---------- | ------------------------------------------------ |
| フィールド省略   | `{}`                                  | 変更しない | プロパティなし（`'dueDate' in input === false`） |
| `null`送信       | `{"dueDate": null}`                   | クリアする | `undefined`                                      |
| 値を送信         | `{"dueDate": "2025-01-01T00:00:00Z"}` | 値を設定   | `string`                                         |

## nullable: true 設定の判断フレームワーク

**Update\*Paramsの各オプショナルフィールドについて、以下を検討する**:

```
┌─────────────────────────────────────────────────────────┐
│ Q: ユーザーが一度設定した値を「未設定」に戻したいか？   │
├─────────────────────────────────────────────────────────┤
│ YES → nullable: true を設定                             │
│ NO  → nullable: true は不要                             │
└─────────────────────────────────────────────────────────┘
```

## フィールドタイプ別の判断基準

| フィールドタイプ                                 | nullable: true | 理由・ユースケース                   |
| ------------------------------------------------ | -------------- | ------------------------------------ |
| **日付フィールド**（`dueDate`, `completedAt`等） | ✅ **必須**    | 「期限なし」「未完了」に戻したい     |
| **外部ID**（`projectId`, `assigneeUserId`等）    | ✅ **必須**    | 「未割り当て」「関連なし」に戻したい |
| **説明文**（`description`等）                    | ✅ **必須**    | 説明を削除したい                     |
| **必須フィールド**（`title`, `name`等）          | ❌ 不要        | 削除の概念がない                     |
| **enum型**（`status`, `priority`等）             | ❌ 不要        | 別の値に遷移する（削除ではない）     |
| **boolean型**                                    | ❌ 不要        | true/falseで完結（削除の概念なし）   |

## 具体例

### 日付フィールド

**ユースケース**: 「日付を設定したが、やっぱり日付なしに戻したい」

```yaml
# ✅ Good: nullable: trueを設定
Update{Entity}Params:
  properties:
    dueDate:
      type: string
      format: date
      nullable: true  # クリア操作を許可
      description: 期限日（nullで"日付なし"に設定）

# ❌ Bad: nullable: trueがない
Update{Entity}Params:
  properties:
    dueDate:
      type: string
      format: date
      # 問題: 一度設定した日付を削除できない
```

### 外部ID

**ユースケース**: 「親リソースに割り当てたが、未割り当てに戻したい」

```yaml
# ✅ Good: nullable: trueを設定
Update{Entity}Params:
  properties:
    {parentEntity}Id:
      type: string
      nullable: true  # クリア操作を許可
      description: 親リソースID（nullで"未割り当て"に設定）

# ❌ Bad: nullable: trueがない
Update{Entity}Params:
  properties:
    {parentEntity}Id:
      type: string
      # 問題: 一度割り当てた親リソースを解除できない
```

### 説明文

**ユースケース**: 「説明を書いたが、削除したい」

```yaml
# ✅ Good: nullable: trueを設定
Update{Entity}Params:
  properties:
    description:
      type: string
      maxLength: 5000
      nullable: true    # クリア操作を許可
      description: 説明（nullで"説明なし"に設定）

# ❌ Bad: nullable: trueがない
Update{Entity}Params:
  properties:
    description:
      type: string
      maxLength: 5000
      # 問題: 説明を削除できない
```

**空文字列の扱い**: API契約では空文字列を許容する。詳細は `15-validation-constraints.md` を参照。

## クライアント実装例

**参照**: `../../web/api/20-request-normalization.md` - フロントエンドでの正規化実装

```typescript
// ケース1: フィールドを変更しない（省略）
PATCH /{resources}/123
{}

// ケース2: フィールドをクリア（nullを送信）
PATCH /{resources}/123
{
  "dueDate": null,
  "projectId": null,
  "description": null
}

// ケース3: フィールドを更新（値を送信）
PATCH /{resources}/123
{
  "dueDate": "2025-01-01",
  "projectId": "parent-456",
  "description": "新しい説明"
}
```

**重要**: フロントエンドでは `dirtyFields` を使用して変更フィールドを検出し、空文字列は `null` に変換して送信する。

## TypeScript内部への変換

**参照**: `../../server/handler/21-http-handler-implementation.md` - null → undefined 変換パターン

- **API層（JSON）**: `null`を許可（`nullable: true`）
- **Handler層**: `null` → `undefined`変換を実施
- **TypeScript内部**: `undefined`のみ使用（TypeScriptベストプラクティス）

```typescript
// Handler層での3値判別
const body = parseResult.data;

const result = await useCase.execute({
  todoId,
  title: body.title,
  // キーが存在する場合のみプロパティを追加
  ...("description" in body && {
    description: body.description === null ? undefined : body.description,
  }),
  ...("dueDate" in body && {
    dueDate: body.dueDate === null ? undefined : body.dueDate,
  }),
});
```

**重要**: TypeScript内部では`null`を使用しない。`undefined`のみ使用する。

## 完全なOpenAPI定義例

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      maxLength: 200
      description: TODOのタイトル
      # nullable: true 不要（必須フィールドの概念）

    description:
      type: string
      maxLength: 5000
      nullable: true # クリア操作を許可
      description: TODOの詳細説明（nullで"説明なし"に設定）

    status:
      $ref: "#/components/schemas/TodoStatus"
      # nullable: true 不要（enum、削除ではなく遷移）

    dueDate:
      type: string
      format: date
      nullable: true # クリア操作を許可
      description: 期限日（nullで"期限なし"に設定）

    projectId:
      type: string
      nullable: true # クリア操作を許可
      description: プロジェクトID（nullで"未割り当て"に設定）

    assigneeUserId:
      type: string
      nullable: true # クリア操作を許可
      description: 担当者のユーザーID（nullで"未割り当て"に設定）
```

**注意**: `minLength: 1` の設定基準は `15-validation-constraints.md` を参照。

## Do / Don't

### ✅ Good

```yaml
# クリア可能なフィールドに nullable: true
dueDate:
  type: string
  format: date
  nullable: true

# 必須フィールドには nullable なし
title:
  type: string
  maxLength: 200
```

```typescript
// Handler層で3値を正しく判別
...("dueDate" in body && {
  dueDate: body.dueDate === null ? undefined : body.dueDate,
})
```

### ❌ Bad

```yaml
# クリア不要なのに nullable
status:
  type: string
  enum: [PENDING, COMPLETED]
  nullable: true  # ❌ enumは別の値に遷移するだけ

# クリア必要なのに nullable なし
dueDate:
  type: string
  format: date
  # ❌ 一度設定した日付を削除できない
```

```typescript
// null をそのまま渡す
const result = await useCase.execute({
  dueDate: body.dueDate,  // ❌ nullがそのまま渡される可能性
});
```
