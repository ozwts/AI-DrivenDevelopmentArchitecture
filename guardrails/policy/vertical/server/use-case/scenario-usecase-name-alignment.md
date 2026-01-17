# シナリオとユースケース名の一致検証

## @what

シナリオファイル名とユースケースファイル名・クラス名が一致しているか検証

## @why

シナリオとユースケースの対応関係を明確にし、追跡可能性を担保するため

## @failure

以下のパターンを検出した場合に警告:
- シナリオファイル名とユースケースファイル名が一致しない
- シナリオタイトルとユースケースクラス名が一致しない

---

## 核心原則

**シナリオとユースケースの1対1対応**: 各シナリオには対応するユースケースが1つ存在し、名前により対応関係が追跡可能である。

**参照**: `guardrails/constitution/co-evolution/traceability-principles.md`

---

## 命名規則

### ファイル名の対応

| 対象       | 命名規則                      | 例                           |
| ---------- | ----------------------------- | ---------------------------- |
| シナリオ   | `{action}-{entity}.md`        | `register-todo.md`           |
| ユースケース | `{action}-{entity}-use-case.ts` | `register-todo-use-case.ts` |

**検証ルール**:
- シナリオ: `contracts/business/{entity}/scenario/{action}-{entity}.md`
- ユースケース: `server/use-case/{entity}/{action}-{entity}-use-case.ts`
- 両者の`{action}-{entity}`部分が一致すること

### クラス名の対応

| 対象         | 命名規則                          | 例                           |
| ------------ | --------------------------------- | ---------------------------- |
| シナリオタイトル | `{Entity}を{Action}する`      | `TODOを登録する`             |
| ユースケースクラス | `{Action}{Entity}UseCaseImpl` | `RegisterTodoUseCaseImpl`    |

**検証ルール**:
- シナリオタイトル: 「{Entity}を{Action}する」形式
- クラス名: `{Action}{Entity}UseCaseImpl`（PascalCase）
- 両者の意味が一致すること

---

## 例

### Good: 一致している

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
# TODOを登録する

## 目的
やるべきタスクを記録し、管理対象にする。

## 誰が
ユーザー
...
```

**ユースケース**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
  async execute(input: RegisterTodoUseCaseInput): Promise<RegisterTodoUseCaseResult> {
    // ...
  }
}
```

**検証結果**: ✅ PASS
- ファイル名: `register-todo.md` ↔ `register-todo-use-case.ts` （一致）
- クラス名: 「TODOを登録する」 ↔ `RegisterTodoUseCaseImpl` （一致）

---

### Bad: 不一致

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
# TODOを登録する
...
```

**ユースケース**: `server/use-case/todo/create-todo-use-case.ts`
```typescript
// ❌ シナリオはregisterなのにcreateを使用
export class CreateTodoUseCaseImpl implements CreateTodoUseCase {
  async execute(input: CreateTodoUseCaseInput): Promise<CreateTodoUseCaseResult> {
    // ...
  }
}
```

**検証結果**: ❌ FAIL
- ファイル名: `register-todo.md` ↔ `create-todo-use-case.ts` （不一致）
- アクション名: register ↔ create （不一致）

**理由**: シナリオとユースケースの対応関係が追跡不可能

---

## アクション名の使い分け

シナリオとユースケースで統一すべきアクション名:

| アクション | 意味                 | 例                   |
| ---------- | -------------------- | -------------------- |
| register   | 新規登録             | register-user        |
| create     | 作成                 | create-project       |
| get        | 単一取得             | get-todo             |
| list       | 一覧取得             | list-todos           |
| update     | 更新                 | update-todo          |
| delete     | 削除                 | delete-todo          |
| prepare-*  | 準備処理（非同期）   | prepare-upload       |
| complete-* | 完了処理             | complete-upload      |

**参照**: `guardrails/policy/server/use-case/10-use-case-overview.md`

---

## レビュー時のチェックリスト

- [ ] シナリオファイル名とユースケースファイル名が一致しているか？
- [ ] シナリオタイトルとユースケースクラス名が一致しているか？
- [ ] アクション名が適切に使い分けられているか？
- [ ] 1つのシナリオに対して1つのユースケースが存在するか？

---

## 関連ドキュメント

- **追跡可能性の原則**: `guardrails/constitution/co-evolution/traceability-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **アクション命名規則**: `guardrails/policy/vertical/semantic/server/use-case/action-naming-appropriateness.md`
