# ドメインモデルテスト戦略：概要

## 核心原則

ドメインモデルは**外部依存ゼロ**のため**Small Testのみで完全に検証**し、**全テストでDummyファクトリを使用**する。

## 関連ドキュメント

| トピック              | ファイル                       |
| --------------------- | ------------------------------ |
| Value Objectテスト    | `51-value-object-test-patterns.md` |
| Entityテスト          | `52-entity-test-patterns.md`       |
| バリデーション戦略    | `11-domain-validation-strategy.md` |
| 共通Dummyヘルパー     | `server/src/util/testing-util/dummy-data.ts` |

## テスト方針

| 観点       | 特徴                                 | テスト方針         |
| ---------- | ------------------------------------ | ------------------ |
| 外部依存   | なし（純粋TypeScript）               | Small Testのみ     |
| 実行速度   | 高速                                 | 全テストを毎回実行 |
| テスト対象 | ドメインルール、不変条件、データ変換 | 網羅的にテスト     |
| モック     | 不要                                 | 実装のみテスト     |

## ファイル構成

```
domain/model/{entity}/
├── {entity}.entity.ts              # Entity本体
├── {entity}.entity.small.test.ts   # Entityテスト
├── {entity}.entity.dummy.ts        # テスト用ファクトリ
├── {value-object}.vo.ts            # Value Object本体
├── {value-object}.vo.small.test.ts # Value Objectテスト
├── {value-object}.vo.dummy.ts      # VO Dummyファクトリ
└── {entity}.repository.ts          # リポジトリIF
```

## MECE原則との整合性

**参照**: `11-domain-validation-strategy.md`

ドメインモデルのテストは**第2階層：ドメインルール**のテストである。

| 階層        | テスト対象             | テスト場所       |
| ----------- | ---------------------- | ---------------- |
| 第1階層     | 型レベルバリデーション | Handler層テスト  |
| **第2階層** | **ドメインルール**     | **Domain層テスト** |
| 第3階層     | ビジネスルール         | UseCase層テスト  |

**重要**: 型レベルバリデーション（文字列長、形式等）はHandler層でテスト済みのため、ドメイン層テストで重複しない。

## Do / Don't

### Good

```typescript
// Dummyファクトリを使用（Entityテスト）
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
const todo = todoDummyFrom({ title: "テスト" });

// Value Objectテストでは静的ファクトリメソッドで生成
const status = TodoStatus.todo();
const completed = TodoStatus.completed();

// Entity Dummyファクトリ内ではVO Dummyファクトリを使用し、from()を呼ぶ
import { todoStatusDummyFrom } from "./todo-status.vo.dummy";
export const todoDummyFrom = (overrides?: Partial<TodoProps>): Todo => {
  const result = Todo.from({
    status: overrides?.status ?? todoStatusDummyFrom(),
    // ...
  });
  if (!result.success) throw new Error("Dummy creation failed");
  return result.data;
};

// Result型を正しくチェック
const result = TodoStatus.from({ status: "TODO" });
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.isTodo()).toBe(true);
}

// エラー型とメッセージを検証
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error).toBeInstanceOf(DomainError);
  expect(result.error.message).toContain("Invalid");
}

// イミュータブル性を検証
const original = todoDummyFrom({ title: "元のタスク" });
const updated = original.rename("新しいタイトル", now);
expect(original.title).toBe("元のタスク"); // 不変
expect(updated.title).toBe("新しいタイトル"); // 新しいインスタンス
```

### Bad

```typescript
// テストで直接new Entity()を使用（保守性が低い）
const todo = new Todo({
  id: "todo-1",
  title: "タスク",
  status: TodoStatus.todo(),
  // ... モデル変更時に全テストを修正する必要がある
}); // ❌ Dummyファクトリを使用すべき

// Result型をチェックせずdata参照
expect(result.data.isTodo()).toBe(true); // ❌ errorの可能性

// エラー型を検証しない
expect(result.success).toBe(false); // ❌ どのエラーかわからない

// 外部依存を使用
const useCase = new CreateTodoUseCaseImpl({ ... }); // ❌ ドメイン層のテストではない

// 型レベルバリデーションのテスト（Handler層の責務）
const colorResult = ProjectColor.from("#FF5733000"); // ❌ OpenAPIで検証すべき
```
