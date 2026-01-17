# シナリオ振る舞いと実装の一致検証

## @what

シナリオの「どうなる」セクションで定義された振る舞いがユースケースで実装されているか検証

## @why

シナリオで定義した期待動作とコードの実装が一致することで、仕様と実装の乖離を防ぐため

## @failure

以下のパターンを検出した場合に警告:
- シナリオの「どうなる」で定義された振る舞いが実装されていない
- シナリオにない振る舞いが実装されている
- 振る舞いの順序がシナリオと異なる

---

## 核心原則

**シナリオが仕様**: UseCaseの実装はシナリオの「どうなる」セクションを厳密に実装する。シナリオにない振る舞いを独自に追加してはならない。

**参照**:
- `guardrails/constitution/structural-discipline/responsibility-principles.md`（単一の真実の情報源）
- `guardrails/constitution/co-evolution/traceability-principles.md`（追跡可能性）

---

## シナリオ「どうなる」セクションの読み方

各項目は以下のいずれかのアクションに分類される:

| アクション種別   | 実装パターン                           | 例                                   |
| ---------------- | -------------------------------------- | ------------------------------------ |
| 作成             | Entity.from() + repository.save()      | TODOが作成される                     |
| 更新             | entity.method() + repository.save()    | TODOのステータスが更新される         |
| 削除             | repository.delete()                    | TODOが削除される                     |
| 状態変更         | entity.method()                        | ステータスが「完了」になる           |
| 関連付け         | entity.method() + repository.save()    | プロジェクトに紐付けられる           |
| 計算・導出       | ビジネスロジック                       | 期限が計算される                     |
| 通知・イベント   | eventPublisher.publish()               | メール通知が送信される               |

---

## 例

### Good: 一致している

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
## どうなる
- TODOが作成される
- 作成者が担当者として設定される
- ステータスは未着手で初期化される
- 優先度は中で初期化される（指定がない場合）
```

**UseCase実装**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
  async execute(input: RegisterTodoUseCaseInput): Promise<RegisterTodoUseCaseResult> {
    // ✅ 1. TODOが作成される
    const todoResult = Todo.from({
      ...input,
      // ✅ 2. 作成者が担当者として設定される
      assigneeId: input.userId,
      // ✅ 3. ステータスは未着手で初期化される
      status: TodoStatus.notStarted(),
      // ✅ 4. 優先度は中で初期化される（指定がない場合）
      priority: input.priority ?? Priority.medium(),
    });

    if (todoResult.isErr()) {
      return todoResult;
    }

    const saveResult = await this.#props.todoRepository.save({
      todo: todoResult.data,
    });

    if (saveResult.isErr()) {
      return saveResult;
    }

    return Result.ok({ todo: saveResult.data });
  }
}
```

**検証結果**: ✅ PASS
- シナリオの「どうなる」の4項目すべてが実装されている
- 実装の順序がシナリオと一致している

---

### Bad: 不一致（振る舞いの欠落）

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
## どうなる
- TODOが作成される
- 作成者が担当者として設定される
- ステータスは未着手で初期化される
- 優先度は中で初期化される（指定がない場合）
```

**UseCase実装**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
  async execute(input: RegisterTodoUseCaseInput): Promise<RegisterTodoUseCaseResult> {
    const todoResult = Todo.from({
      ...input,
      // ❌ 作成者を担当者として設定する処理がない
      // assigneeId: input.userId, // 欠落
      status: TodoStatus.notStarted(),
      priority: input.priority ?? Priority.medium(),
    });

    // ...
  }
}
```

**検証結果**: ❌ FAIL
- シナリオの「作成者が担当者として設定される」が実装されていない

**理由**: シナリオで定義された振る舞いはすべて実装すべき

---

### Bad: 不一致（余分な振る舞い）

**シナリオ**: `contracts/business/todo/scenario/register-todo.md`
```markdown
## どうなる
- TODOが作成される
```

**UseCase実装**: `server/use-case/todo/register-todo-use-case.ts`
```typescript
export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
  async execute(input: RegisterTodoUseCaseInput): Promise<RegisterTodoUseCaseResult> {
    const todoResult = Todo.from({ ...input });

    if (todoResult.isErr()) {
      return todoResult;
    }

    const saveResult = await this.#props.todoRepository.save({
      todo: todoResult.data,
    });

    if (saveResult.isErr()) {
      return saveResult;
    }

    // ❌ シナリオにない振る舞い
    await this.#props.notificationService.sendEmail({
      to: input.userId,
      subject: "TODOが作成されました",
      body: `TODO「${input.title}」が作成されました`,
    });

    return Result.ok({ todo: saveResult.data });
  }
}
```

**検証結果**: ❌ FAIL
- シナリオにない「メール通知送信」が実装されている

**理由**: シナリオで定義されていない振る舞いを独自に追加してはならない。通知が必要なら、シナリオに追加すべき。

---

## 暗黙の振る舞い

以下の振る舞いはシナリオに明記されていなくても実装可能:

| 振る舞い             | 理由                             |
| -------------------- | -------------------------------- |
| バリデーション       | ドメイン不変条件の検証           |
| エラーハンドリング   | 異常系の処理                     |
| トランザクション管理 | データ整合性の担保               |
| ログ記録             | 運用のための記録                 |

これらは**技術的関心事**であり、ビジネスシナリオに明記する必要がない。

---

## 副作用の扱い

副作用（データ変更、外部API呼び出し、イベント発行等）はシナリオに明記すべき:

| 副作用種別         | シナリオでの記述例                   |
| ------------------ | ------------------------------------ |
| データ作成         | 「TODOが作成される」                 |
| データ更新         | 「ステータスが更新される」           |
| データ削除         | 「TODOが削除される」                 |
| 外部API呼び出し    | 「メール通知が送信される」           |
| イベント発行       | 「TODO作成イベントが発行される」     |
| ファイル操作       | 「ファイルがストレージに保存される」 |

**原則**: 副作用がある場合は、必ずシナリオに明記する。

---

## レビュー時のチェックリスト

- [ ] シナリオの「どうなる」のすべての項目が実装されているか？
- [ ] シナリオにない振る舞いが実装されていないか？（暗黙の振る舞いを除く）
- [ ] 振る舞いの順序がシナリオと一致しているか？
- [ ] 副作用（データ変更、外部呼び出し）がシナリオに明記されているか？
- [ ] 技術的関心事（バリデーション、エラーハンドリング）は暗黙的に実装されているか？

---

## 関連ドキュメント

- **責務の原則**: `guardrails/constitution/structural-discipline/responsibility-principles.md`
- **追跡可能性の原則**: `guardrails/constitution/co-evolution/traceability-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **UseCase実装**: `guardrails/policy/server/use-case/11-use-case-implementation.md`
