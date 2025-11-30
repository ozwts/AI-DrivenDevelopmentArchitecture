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

**重要**: `Result.then()`はEntityを返すと自動で`Result.ok()`に包むため、UseCase側では戻り値の型を意識せずにチェーンできる。

```typescript
// Result.then()はEntity/Result両方を透過的に扱える
const result = Result.ok(existing)
  .then((t) => t.clarify(input.description, now))
  .then((t) => t.reschedule(input.dueDate, now))
  .then((t) => t.complete(input.completedAt, now));

if (!result.success) {
  return result;
}
```

## エンティティ操作パターン

### パターン1: 新規作成

```typescript
// UseCase層
async execute(input: RegisterTodoUseCaseInput): Promise<Result> {
  // 1. Value Object生成
  const statusResult = TodoStatus.from({ value: input.status });
  if (!statusResult.success) {
    return Result.err(statusResult.error);
  }

  // 2. ID生成・時刻取得
  const todoId = this.#props.todoRepository.todoId();
  const now = dateToIsoString(this.#props.fetchNow());

  // 3. Entity生成（Entity.from()でインスタンス生成）
  const todoResult = Todo.from({
    id: todoId,
    title: input.title,
    description: input.description,
    status: statusResult.data,
    dueDate: input.dueDate,
    completedAt: undefined,
    userSub: input.userSub,
    createdAt: now,
    updatedAt: now,
  });
  if (!todoResult.success) {
    return Result.err(todoResult.error);
  }

  // 4. リポジトリ保存
  const saveResult = await this.#props.todoRepository.save({ todo: todoResult.data });
  if (!saveResult.success) {
    return Result.err(saveResult.error);
  }

  return Result.ok({ todo: todoResult.data });
}
```

### パターン2: 更新（ビジネスメソッド使用）

**使用条件**: 操作の前提条件チェックが必要な場合

```typescript
// UseCase層
async execute(input: CompleteTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return Result.err(new NotFoundError());
  }
  const existing = existingResult.data;

  // 2. 権限チェック
  if (existing.userSub !== input.userSub) {
    return Result.err(new ForbiddenError());
  }

  // 3. ビジネスメソッド呼び出し
  const now = dateToIsoString(this.#props.fetchNow());
  const completedResult = existing.complete(now, now);
  if (!completedResult.success) {
    return Result.err(completedResult.error);
  }

  // 4. 保存
  const saveResult = await this.#props.todoRepository.save({
    todo: completedResult.data,
  });
  if (!saveResult.success) {
    return Result.err(saveResult.error);
  }

  return Result.ok({ todo: completedResult.data });
}
```

### パターン3: PATCH更新

**参照**: `11-use-case-implementation.md` - PATCH更新パターン

**原則**:

- 送られたフィールドのみ更新（`'in'`演算子で判定）
- Result.then()でメソッドチェーン

```typescript
async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoResult> {
  // 1. 既存Entity取得・権限チェック（省略）

  const now = dateToIsoString(this.#props.fetchNow());

  // 2. Result.then()によるメソッドチェーン
  const updatedResult = Result.ok(existing)
    .then(t => 'title' in input
      ? TodoTitle.from({ title: input.title }).then(title => t.rename(title, now))
      : t
    )
    .then(t => 'dueDate' in input
      ? t.reschedule(input.dueDate, now)
      : t
    )
    .then(t => 'description' in input
      ? t.clarify(input.description, now)
      : t
    )
    .then(t => {
      if (!('status' in input)) return t;
      switch (input.status) {
        case 'COMPLETED':
          return t.complete(now, now);
        case 'PENDING':
          return t.reopen(now);
        default:
          return t;
      }
    });

  if (!updatedResult.success) {
    return updatedResult;
  }

  // 3. 永続化
  const saveResult = await this.#props.todoRepository.save({
    todo: updatedResult.data,
  });
  if (!saveResult.success) {
    return saveResult;
  }

  return Result.ok({ todo: updatedResult.data });
}
```

**ポイント**:

- `Result.then()`はEntity/Result両方を透過的に扱える
- statusのような複数の値を持つフィールドはswitchで分岐
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

| 条件                           | 例                               |
| ------------------------------ | -------------------------------- |
| ビジネス操作を表現する         | `todo.complete(now, now)`        |
| 複数フィールドが連動する       | `todo.reschedule(dueDate, now)`  |
| 状態遷移ルールがある           | `todo.reopen(now)`               |

### UseCase層で直接Entity組成を行う場合

| 条件                           | 例                               |
| ------------------------------ | -------------------------------- |
| 新規作成時                     | `Todo.from({ ... })`             |
| 単純なValue Object設定         | Value Object生成後にEntityメソッドで設定 |

**重要**: ドメインメソッドの追加・設計は`domain-model`ポリシーの責務。UseCase層はドメインメソッドを**利用する**立場。

## Do / Don't

### ✅ Good

```typescript
// Result.then()でメソッドチェーン
const result = Result.ok(existing)
  .then((t) => t.clarify(input.description, now))
  .then((t) => t.complete(input.completedAt, now));

// Entity.from()でインスタンス生成
const todoResult = Todo.from({ /* props */ });
if (!todoResult.success) {
  return todoResult;
}

// ビジネスロジックはドメイン層のメソッドに委譲
const completedResult = existing.complete(now, now);
if (!completedResult.success) {
  return completedResult;
}
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
const todo = new Todo({ /* props */ }); // ❌ Entity.from()を使うべき
```
