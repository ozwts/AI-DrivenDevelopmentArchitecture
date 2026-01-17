# シナリオ入力とUseCaseInputの一致検証

## @what

シナリオの「何を」セクションとUseCaseInputの型定義が一致しているか検証

## @why

シナリオで定義した入力値とコードの実装が一致することで、仕様と実装の乖離を防ぐため

## @failure

以下のパターンを検出した場合に警告:
- シナリオにない入力項目がUseCaseInputに存在する
- シナリオで必須とされている入力項目がUseCaseInputにない
- 入力項目の型がシナリオの説明と一致しない

---

## 核心原則

**シナリオが真実の情報源**: UseCaseInputはシナリオの「何を」セクションから導出される。シナリオにない入力を独自に追加してはならない。

**参照**:
- `guardrails/constitution/structural-discipline/responsibility-principles.md`（単一の真実の情報源）
- `guardrails/constitution/co-evolution/traceability-principles.md`（追跡可能性）

---

## シナリオ「何を」セクションの読み方

| シナリオの記述       | UseCaseInputへの反映 |
| -------------------- | -------------------- |
| タイトル（必須）     | `title: string`      |
| 説明                 | `description?: string` |
| 優先度               | `priority?: Priority` |
| プロジェクトID       | `projectId?: string` |

**ルール**:
- 「必須」明記 → 必須プロパティ（`?`なし）
- 記載なし → オプショナル（`?`付き）
- 型はビジネス契約の定義に従う

---

## 例

### Good: 一致している

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
# TODOを登録する

## 何を
- タイトル（必須）
- 説明
- 優先度
- 期限
- プロジェクト
```

**UseCaseInput**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export type RegisterTodoUseCaseInput = {
  readonly title: string;          // ✅ 必須（シナリオで必須明記）
  readonly description?: string;   // ✅ オプショナル
  readonly priority?: Priority;    // ✅ オプショナル
  readonly dueDate?: Date;         // ✅ オプショナル（期限）
  readonly projectId?: string;     // ✅ オプショナル（プロジェクト）
};
```

**検証結果**: ✅ PASS
- シナリオの「何を」とUseCaseInputが一致
- 必須・オプショナルの区別が正しい

---

### Bad: 不一致（余分な項目）

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
## 何を
- タイトル（必須）
- 説明
```

**UseCaseInput**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export type RegisterTodoUseCaseInput = {
  readonly title: string;
  readonly description?: string;
  readonly createdBy: string;      // ❌ シナリオにない項目
  readonly tags: string[];         // ❌ シナリオにない項目
};
```

**検証結果**: ❌ FAIL
- `createdBy`と`tags`はシナリオの「何を」に記載なし
- シナリオで定義されていない入力を独自に追加してはならない

**理由**: シナリオが仕様の真実の情報源であるべき

---

### Bad: 不一致（必須項目の欠落）

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
## 何を
- タイトル（必須）
- 説明
- 優先度
```

**UseCaseInput**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export type RegisterTodoUseCaseInput = {
  readonly title: string;
  readonly description?: string;
  // ❌ 優先度が欠落
};
```

**検証結果**: ❌ FAIL
- シナリオに記載された「優先度」がUseCaseInputに存在しない

**理由**: シナリオで定義された入力はすべてUseCaseInputに反映すべき

---

## 暗黙の入力項目

以下の項目はシナリオに明記されていなくても追加可能:

| 項目      | 型       | 理由                         |
| --------- | -------- | ---------------------------- |
| userId    | string   | 認証済みユーザーの識別子     |
| timestamp | Date     | 操作時刻（fetchNowから取得） |

これらは**ビジネスコンテキスト**として全UseCaseで共通であり、シナリオに明記する必要がない。

---

## PATCH更新の特殊ケース

PATCH更新では、すべての入力項目がオプショナル（`?`付き）になる:

**シナリオ**: `contracts/business/todo/scenario/update-todo.md`
```markdown
## 何を
- タイトル
- 説明
- ステータス
- 優先度
- 期限
- プロジェクト
- 担当者
```

**UseCaseInput**: `server/use-case/todo/update-todo-use-case.ts`
```typescript
export type UpdateTodoUseCaseInput = {
  readonly id: string;            // ✅ ID(必須)
  readonly title?: string;        // ✅ すべてオプショナル
  readonly description?: string;
  readonly status?: TodoStatus;
  readonly priority?: Priority;
  readonly dueDate?: Date;
  readonly projectId?: string;
  readonly assigneeId?: string;
};
```

**理由**: 「部分更新」のため、すべてのフィールドが送信されるとは限らない

---

## レビュー時のチェックリスト

- [ ] シナリオの「何を」セクションにある項目がすべてUseCaseInputに存在するか？
- [ ] UseCaseInputにシナリオにない項目がないか？（暗黙の項目を除く）
- [ ] 必須・オプショナルの区別がシナリオと一致しているか？
- [ ] 型がビジネス契約の定義と一致しているか？
- [ ] PATCH更新の場合、すべての項目がオプショナルか？

---

## 関連ドキュメント

- **責務の原則**: `guardrails/constitution/structural-discipline/responsibility-principles.md`
- **追跡可能性の原則**: `guardrails/constitution/co-evolution/traceability-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **PATCH更新パターン**: `guardrails/policy/server/use-case/11-use-case-implementation.md`
