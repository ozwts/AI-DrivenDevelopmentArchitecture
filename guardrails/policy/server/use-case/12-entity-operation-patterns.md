# ユースケース層とドメインモデルの関係性

## 核心原則

ユースケース実装時は、**常にドメインメソッドの追加・改修を検討**し、ドメインモデル貧血症を防ぐ。

**参照**: `20-refactoring-overview.md` - 貧血症防止の詳細

## ユースケース実装時の判断フロー

新しいユースケースを実装する際、以下の順で検討する:

```
1. Value Objectで表現可能か？
   → YES: Value Object内にロジックを配置

2. Entity単体で完結する操作か？
   → YES: Entity内にメソッドを追加

3. 複数Entityの協調が必要か？
   → YES: UseCase層で調整（ドメインサービスも検討）

4. データベース参照が必要か？
   → YES: UseCase層で実装
```

## Entityメソッドのパターン選択

**参照**: `../domain-model/20-entity-overview.md` - Entity設計の3つのパターン、メソッドチェーンの詳細

### メソッドチェーンパターン

**重要**: `Result.map()`はEntityを返すと自動で`Result.ok()`に包むため、UseCase側では戻り値の型を意識せずにチェーンできる。

```typescript
// Result.map()はEntity/Result両方を透過的に扱える
const result = Result.ok(existing)
  .map((t) => t.clarify(input.description, now))
  .map((t) => t.reschedule(input.dueDate, now))
  .map((t) => t.complete(input.completedAt, now));

if (!result.success) {
  return result;
}
```

## エンティティ操作パターン

### パターン1: 新規作成

```typescript
// UseCase層
async execute(input: RegisterTodoUseCaseInput): Promise<Result> {
  // 1. ID生成・時刻取得
  const todoId = this.#props.todoRepository.todoId();
  const now = dateToIsoString(this.#props.fetchNow());

  // 2. Entity生成（Entity.from()でインスタンス生成）
  // Entity.from()は直接Entityを返す（バリデーションはHandler層で済んでいる前提）
  const newTodo = Todo.from({
    id: todoId,
    title: input.title,
    description: input.description,
    status: input.status ?? TodoStatus.todo(),
    priority: input.priority ?? "MEDIUM",
    dueDate: input.dueDate,
    assigneeUserId: input.assigneeUserId,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  });

  // 3. リポジトリ保存
  const saveResult = await this.#props.todoRepository.save({ todo: newTodo });
  if (saveResult.isErr()) {
    return Result.err(saveResult.error);
  }

  return Result.ok(newTodo);
}
```

**ポイント**:

- `Entity.from()`は直接Entityを返す（Resultで包まない）
- 入力値のバリデーションはHandler層で済んでいるため、UseCase層ではバリデーション不要
- Value Objectのファクトリメソッド（例: `TodoStatus.todo()`）を使用してデフォルト値を設定

### パターン2: 更新（ビジネスメソッド使用）

**使用条件**: 単一のビジネス操作（完了、開始など）を行う場合

```typescript
// UseCase層
async execute(input: CompleteTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (existingResult.isErr()) {
    return Result.err(existingResult.error);
  }
  if (existingResult.data === undefined) {
    return Result.err(new NotFoundError("TODOが見つかりません"));
  }
  const existing = existingResult.data;

  // 2. ビジネスメソッド呼び出し（Entityを直接返す）
  const now = dateToIsoString(this.#props.fetchNow());
  const completed = existing.complete(now);

  // 3. 保存
  const saveResult = await this.#props.todoRepository.save({
    todo: completed,
  });
  if (saveResult.isErr()) {
    return Result.err(saveResult.error);
  }

  return Result.ok(completed);
}
```

**ポイント**:

- Entityのビジネスメソッドは新しいEntityを直接返す（Resultで包まない）
- `result.isErr()`でエラーチェック、`result.data`でデータアクセス

### パターン3: PATCH更新

**参照**: `11-use-case-implementation.md` - PATCH更新パターン

**原則**:

- 送られたフィールドのみ更新（`'in'`演算子で判定）
- `Result.map()`でメソッドチェーン

```typescript
async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoResult> {
  // 1. 既存Entity取得
  const todoResult = await todoRepository.findById({ id: input.todoId });
  if (todoResult.isErr()) {
    return Result.err(todoResult.error);
  }
  if (todoResult.data === undefined) {
    return Result.err(new NotFoundError("TODOが見つかりません"));
  }

  const now = dateToIsoString(fetchNow());

  // 2. Result.map()によるメソッドチェーン
  const updatedResult = Result.ok(todoResult.data)
    .map((t: Todo) =>
      "title" in input && input.title !== undefined
        ? t.retitle(input.title, now)
        : t,
    )
    .map((t: Todo) =>
      "description" in input ? t.clarify(input.description, now) : t,
    )
    .map((t: Todo) => {
      if (!("status" in input) || input.status === undefined) return t;
      if (input.status.isTodo()) return t.reopen(now);
      if (input.status.isInProgress()) return t.start(now);
      if (input.status.isCompleted()) return t.complete(now);
      return t;
    })
    .map((t: Todo) =>
      "priority" in input && input.priority !== undefined
        ? t.prioritize(input.priority, now)
        : t,
    );

  if (updatedResult.isErr()) {
    return updatedResult;
  }

  // 3. 永続化
  const saveResult = await todoRepository.save({ todo: updatedResult.data });
  if (saveResult.isErr()) {
    return Result.err(saveResult.error);
  }

  return Result.ok(updatedResult.data);
}
```

**ポイント**:

- `Result.map()`はEntity/Result両方を透過的に扱える
- `'in'`演算子でフィールドの存在を判定し、undefinedチェックも併用
- statusのようなValue Objectはメソッド（例: `isTodo()`）で状態を判定
- エラーが発生した時点でチェーンが中断され、エラーが伝播する

## Value Objectエラーの伝播パターン

```typescript
// Value Object生成
const colorResult = ProjectColor.fromString(input.color);

if (!colorResult.success) {
  // Value Objectのエラーをそのまま伝播（新しいエラーで包まない）
  return Result.err(colorResult.error);
}

// 型安全に使用
const color = colorResult.data;
```

**重要**: Value Objectのエラーは変換せず、そのまま伝播させる。

## ドメインメソッド利用の判断

**参照**: `../domain-model/20-entity-overview.md` - ドメインメソッド設計の詳細

### UseCase層での判断基準

ドメインメソッドを**使用すべき**場合（Entity層に既にメソッドがある前提）:

| 条件                     | 例                              |
| ------------------------ | ------------------------------- |
| ビジネス操作を表現する   | `todo.complete(now, now)`       |
| 複数フィールドが連動する | `todo.reschedule(dueDate, now)` |
| 状態遷移ルールがある     | `todo.reopen(now)`              |

### UseCase層で直接Entity組成を行う場合

| 条件                   | 例                                       |
| ---------------------- | ---------------------------------------- |
| 新規作成時             | `Todo.from({ ... })`                     |
| 単純なValue Object設定 | Value Object生成後にEntityメソッドで設定 |

**重要**: ドメインメソッドの追加・設計は`domain-model`ポリシーの責務。UseCase層はドメインメソッドを**利用する**立場。

## Do / Don't

### ✅ Good

```typescript
// Result.map()でメソッドチェーン
const result = Result.ok(existing)
  .map((t) => t.clarify(input.description, now))
  .map((t) => t.complete(now));

// Entity.from()でインスタンス生成（直接Entityを返す）
const newTodo = Todo.from({
  /* props */
});

// ビジネスロジックはドメイン層のメソッドに委譲（直接Entityを返す）
const completed = existing.complete(now);
```

### ❌ Bad

```typescript
// ビジネスロジックがUseCase層に漏れ出す（貧血ドメインモデル）
if (!existing.dueDate) {
  return Result.err(new DomainError("期限のないTODOは完了できません"));
}
const updated = new Todo({
  ...existing,
  status: TodoStatus.completed(),
  completedAt: now,
});
// ❌ UseCase層でEntity状態を直接操作

// new Entity()で直接インスタンス生成
const todo = new Todo({
  /* props */
}); // ❌ Entity.from()を使うべき

// Result.then()を使用（thenable問題）
const result = Result.ok(existing).then((t) => t.complete(now)); // ❌ thenはTypeScriptでthenable扱いされる
```
