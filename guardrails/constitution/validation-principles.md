# バリデーション原則

## 最高原則

バリデーションはMECE（Mutually Exclusive and Collectively Exhaustive、相互排他的かつ網羅的）に実施する。

- **Mutually Exclusive（相互排他的）**: 同じバリデーションを複数箇所で重複して行わない
- **Collectively Exhaustive（網羅的）**: すべての入力に対して適切な検証を行う

## 責務の分離

### 1. OpenAPI自動生成Zodスキーマ（最優先）

**責務**: 型レベルの基本的なバリデーション

- **型の正しさ**: string, number, boolean等
- **必須フィールド**: required/optional
- **基本的な制約**: minLength, maxLength, pattern, minimum, maximum等
- **列挙型**: enum（"TODO" | "IN_PROGRESS" | "DONE"）

**実施箇所**:

- フロントエンド: フォームバリデーション（react-hook-form + Zod）
- サーバー: Honoハンドラー（Zodバリデーター）

**原則**: OpenAPIで定義できるバリデーションは、**必ずOpenAPIに記述する**

```yaml
# todo.openapi.yaml
components:
  schemas:
    RegisterTodoParams:
      type: object
      required:
        - title
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
        priority:
          type: string
          enum: [LOW, MEDIUM, HIGH]
        dueDate:
          type: string
          format: date-time
```

**自動生成されるZod:**

```typescript
// 自動生成: server/src/generated/zod-schemas.ts
export const RegisterTodoParamsSchema = z.object({
  title: z.string().min(1).max(200),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime().optional(),
});
```

### 2. Value Object（ドメインルール）

**責務**: ドメイン固有の形式・制約

- **複雑な形式**: 正規表現パターン（メールアドレス、URL、カラーコード等）
- **ドメイン固有の制約**: ビジネス上の値の範囲や形式
- **値の整合性**: 関連する値同士の整合性

**実施箇所**: `domain/model/{entity}/{value-object}.ts`

**条件**: OpenAPIで表現できない複雑なバリデーションルールがある場合のみ

```typescript
// Value Object: OpenAPIでは表現できない複雑なルール
export class ProjectColor {
  static fromString(value: string): Result<ProjectColor, ValidationError> {
    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorPattern.test(value)) {
      return { success: false, error: new ValidationError(...) };
    }
    return { success: true, data: new ProjectColor(value) };
  }
}
```

**注意**: 単純な長さ制約や必須チェックはOpenAPIで定義するため、Value Objectでは不要

### 3. UseCase（ビジネスルール）

**責務**: ビジネスロジック上のバリデーション

- **権限チェック**: ユーザーが操作可能か
- **状態チェック**: エンティティの現在状態で操作可能か
- **関連チェック**: 関連エンティティの存在確認
- **ビジネス制約**: 「完了したTODOは編集不可」等

**実施箇所**: `use-case/{entity}/{use-case}.ts`

**条件**: リクエスト時点では判断できない、データベース参照が必要なルール

```typescript
// UseCase: ビジネスルール
export class UpdateTodoUseCaseImpl {
  async execute(input: UpdateTodoUseCaseInput) {
    // 1. Zodで基本バリデーション済み（ハンドラー層で実施）

    // 2. ビジネスルール: 存在確認
    const todoResult = await this.todoRepository.findById({ id: input.id });
    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: new NotFoundError("TODO not found") };
    }

    // 3. ビジネスルール: 権限チェック
    if (todoResult.data.assigneeUserId !== currentUserId) {
      return { success: false, error: new ForbiddenError("Not authorized") };
    }

    // 4. ビジネスルール: 状態チェック
    if (todoResult.data.status === "DONE") {
      return {
        success: false,
        error: new ValidationError("Cannot update completed TODO"),
      };
    }

    // ...
  }
}
```

### 4. Entity（構造的整合性）

**責務**: エンティティの構造的な整合性（最小限）

- **集約ルールの保護**: 親子関係の整合性
- **不変条件**: エンティティが常に満たすべき条件

**実施箇所**: `domain/model/{entity}/{entity}.ts`

**条件**: エンティティの内部状態の整合性を保つ場合のみ

```typescript
// Entity: 構造的整合性のみ（基本的にバリデーションしない）
export class Todo {
  constructor(props: {
    id: string;
    title: string;
    // ...
  }) {
    // バリデーションはハンドラー（Zod）とUseCaseで完了しているため、
    // ここでは何もしない
    this.id = props.id;
    this.title = props.title;
  }
}
```

## レイヤー別バリデーション戦略

### フロントエンド

```
ユーザー入力
  ↓
フォームバリデーション（react-hook-form + 自動生成Zod）
  ↓ OK
API呼び出し
```

**必須**: すべてのフォームで自動生成Zodスキーマを使用

### サーバー

```
HTTPリクエスト
  ↓
ハンドラー（Honoバリデーター + 自動生成Zod）← 必須
  ↓ OK
UseCase（ビジネスルール）
  ↓ OK
Repository（データ永続化）
```

**必須**: すべてのハンドラーで自動生成Zodスキーマを使用

## 重複禁止の具体例

### ❌ 悪い例: バリデーションの重複

```yaml
# OpenAPI
title:
  type: string
  minLength: 1
  maxLength: 200
```

```typescript
// ❌ UseCase: OpenAPIと重複
if (input.title.length === 0 || input.title.length > 200) {
  return { success: false, error: new ValidationError(...) };
}
```

**問題**:

- OpenAPIで定義済みなのに、UseCaseで重複チェック
- メンテナンスコストが2倍
- 整合性が取れなくなるリスク

### ✅ 良い例: 責務の分離

```yaml
# OpenAPI: 型レベルの制約
title:
  type: string
  minLength: 1
  maxLength: 200
```

```typescript
// ✅ ハンドラー: Zodで自動バリデーション
app.post(
  "/todos",
  zValidator("json", schemas.RegisterTodoParamsSchema),
  async (c) => {
    const body = c.req.valid("json"); // すでにバリデーション済み
    // ...
  },
);
```

```typescript
// ✅ UseCase: ビジネスルールのみ
export class RegisterTodoUseCaseImpl {
  async execute(input: RegisterTodoUseCaseInput) {
    // 型レベルのバリデーションはハンドラーで完了

    // ビジネスルール: ユーザー存在確認のみ
    const userResult = await this.userRepository.findBySub({
      sub: input.userSub,
    });
    if (!userResult.success || !userResult.data) {
      return { success: false, error: new NotFoundError("User not found") };
    }

    // ...
  }
}
```

## 実装チェックリスト

新しいAPI追加時の確認事項：

- [ ] OpenAPIにすべての型制約を定義（required, minLength, maxLength, pattern, enum等）
- [ ] フロントエンドフォームで自動生成Zodスキーマを使用
- [ ] サーバーハンドラーで自動生成Zodバリデーターを使用
- [ ] UseCaseでは型レベルのバリデーションを重複実装しない
- [ ] UseCaseではビジネスルールのみを実装
- [ ] Value Objectは複雑なドメインルールがある場合のみ作成
- [ ] Entityのコンストラクタではバリデーションしない

## 関連ポリシー

- `policy/server/domain-model/20-entity-design.md` - Value Objectの詳細
- `policy/server/domain-model/10-domain-model-overview.md` - Result型パターン
- OpenAPI仕様書: `todo.openapi.yaml` - 唯一の真実の情報源（Single Source of Truth）
