# シナリオ例外とエラーハンドリングの一致検証

## @what

シナリオの「例外」セクションで定義された例外ケースがユースケースでエラーとして返されるか検証

## @why

シナリオで定義した異常系とコードの実装が一致することで、エラーハンドリングの漏れを防ぐため

## @failure

以下のパターンを検出した場合に警告:
- シナリオの「例外」で定義されたケースがエラーハンドリングされていない
- シナリオにないエラーケースが実装されている

---

## 核心原則

**シナリオが異常系の仕様**: UseCaseのエラーハンドリングはシナリオの「例外」セクションを厳密に実装する。

**参照**:
- `guardrails/constitution/structural-discipline/responsibility-principles.md`（単一の真実の情報源）
- `guardrails/constitution/co-evolution/traceability-principles.md`（追跡可能性）

---

## シナリオ「例外」セクションの読み方

各例外ケースは以下のいずれかのエラー型にマッピングされる:

| シナリオの記述             | エラー型            | HTTPステータス |
| -------------------------- | ------------------- | -------------- |
| 存在しない                 | NotFoundError       | 404            |
| 権限がない                 | ForbiddenError      | 403            |
| 重複している               | ConflictError       | 409            |
| 制約違反                   | DomainError         | 422            |
| 形式が不正                 | ValidationError     | 400            |
| 認証されていない           | UnauthorizedError   | 401            |

---

## 例

### Good: 一致している

**シナリオ**: `contracts/business/todo/scenario/update-todo.md`
```markdown
## 例外
- 存在しないTODOは更新できない
- 他人のTODOは更新できない
```

**UseCase実装**: `server/use-case/todo/update-todo-use-case.ts`
```typescript
export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
    // 既存TODO取得
    const findResult = await this.#props.todoRepository.findById({ id: input.id });

    if (findResult.isErr()) {
      return findResult;
    }

    // ✅ 例外1: 存在しないTODOは更新できない
    if (findResult.data === undefined) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    const existing = findResult.data;

    // ✅ 例外2: 他人のTODOは更新できない
    if (existing.assigneeId !== input.userId) {
      return Result.err(new ForbiddenError("このTODOを更新する権限がありません"));
    }

    // ... 更新処理
  }
}
```

**検証結果**: ✅ PASS
- シナリオの「例外」の2項目がすべてエラーハンドリングされている
- エラー型が適切（NotFoundError, ForbiddenError）

---

### Bad: 不一致（例外ケースの欠落）

**シナリオ**: `contracts/business/todo/scenario/update-todo.md`
```markdown
## 例外
- 存在しないTODOは更新できない
- 他人のTODOは更新できない
```

**UseCase実装**: `server/use-case/todo/update-todo-use-case.ts`
```typescript
export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
    const findResult = await this.#props.todoRepository.findById({ id: input.id });

    if (findResult.isErr()) {
      return findResult;
    }

    // ✅ 例外1: 存在チェック
    if (findResult.data === undefined) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    const existing = findResult.data;

    // ❌ 例外2の権限チェックがない
    // if (existing.assigneeId !== input.userId) {
    //   return Result.err(new ForbiddenError("このTODOを更新する権限がありません"));
    // }

    // ... 更新処理
  }
}
```

**検証結果**: ❌ FAIL
- シナリオの「他人のTODOは更新できない」がエラーハンドリングされていない

**理由**: シナリオで定義された例外ケースはすべて実装すべき

---

### Bad: 不一致（余分なエラーケース）

**シナリオ**: `contracts/business/todo/scenario/update-todo.md`
```markdown
## 例外
- 存在しないTODOは更新できない
```

**UseCase実装**: `server/use-case/todo/update-todo-use-case.ts`
```typescript
export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
    const findResult = await this.#props.todoRepository.findById({ id: input.id });

    if (findResult.isErr()) {
      return findResult;
    }

    if (findResult.data === undefined) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    const existing = findResult.data;

    // ❌ シナリオにないエラーケース
    if (existing.status.value === "COMPLETED") {
      return Result.err(new DomainError("完了済みTODOは更新できません"));
    }

    // ... 更新処理
  }
}
```

**検証結果**: ❌ FAIL
- シナリオにない「完了済みTODOは更新できません」が実装されている

**理由**: ビジネスルールの例外ケースはシナリオに明記すべき。実装時に気づいた例外は、シナリオに追加してから実装する。

---

## 暗黙のエラーハンドリング

以下のエラーハンドリングはシナリオに明記されていなくても実装可能:

| エラーケース             | エラー型          | 理由                       |
| ------------------------ | ----------------- | -------------------------- |
| データベース接続エラー   | UnexpectedError   | インフラ層の異常           |
| タイムアウト             | UnexpectedError   | インフラ層の異常           |
| 予期しない例外           | UnexpectedError   | 技術的な異常               |
| ドメイン不変条件違反     | DomainError       | Domain層で自動検証         |

これらは**技術的異常**であり、ビジネスシナリオに明記する必要がない。

---

## 冪等性の扱い

冪等な操作では、既に条件を満たしている場合にエラーを返さない:

**シナリオ**: `contracts/business/todo/scenario/delete-todo.md`
```markdown
## 例外
- 存在しないTODOは削除をスキップ（冪等）
```

**UseCase実装**: `server/use-case/todo/delete-todo-use-case.ts`
```typescript
export class DeleteTodoUseCaseImpl implements DeleteTodoUseCase {
  async execute(input: DeleteTodoUseCaseInput): Promise<DeleteTodoUseCaseResult> {
    const deleteResult = await this.#props.todoRepository.delete({ id: input.id });

    if (deleteResult.isErr()) {
      return deleteResult;
    }

    // ✅ 存在しない場合もエラーとせず、成功として扱う（冪等）
    return Result.ok(undefined);
  }
}
```

**検証結果**: ✅ PASS
- シナリオで「冪等」と明記されている場合、存在チェックでエラーを返さない

---

## レビュー時のチェックリスト

- [ ] シナリオの「例外」のすべての項目がエラーハンドリングされているか？
- [ ] シナリオにないエラーケースが実装されていないか？（暗黙のエラーを除く）
- [ ] エラー型（NotFoundError, ForbiddenError等）が適切に選択されているか？
- [ ] 冪等性が必要な操作でシナリオに明記されているか？
- [ ] 実装時に気づいた例外ケースをシナリオに追加したか？

---

## 関連ドキュメント

- **責務の原則**: `guardrails/constitution/structural-discipline/responsibility-principles.md`
- **追跡可能性の原則**: `guardrails/constitution/co-evolution/traceability-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **エラーハンドリング**: `guardrails/policy/server/use-case/11-use-case-implementation.md`
