# ユースケース層とドメインモデルの関係性

## 核心原則

ユースケース実装時は、**常にドメインメソッドの追加・改修を検討**し、ドメインモデル貧血症を防ぐ。

## ドメインモデル貧血症を防ぐ

### 貧血ドメインモデルとは

**定義**: ドメインモデルがデータの入れ物（getter/setterのみ）となり、ビジネスロジックがUseCase層やService層に漏れ出す状態。

**問題点**:
- ビジネスロジックが分散し、保守性が低下
- ドメインの知識がコードに表現されない
- 同じバリデーションや計算が複数箇所に重複
- テストが困難（ロジックの所在が不明確）

### 良いドメインモデルの特徴

**Rich Domain Model**:
- ビジネスロジックがEntity/Value Objectに集約
- ユビキタス言語を反映したメソッド名
- 不変条件がドメイン層で保護される
- UseCase層はドメインオブジェクトの組み立てに専念

## ユースケース実装時の判断フロー

### ステップ1: ビジネスロジックの所在を判断

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

### ステップ2: Entityメソッドのパターン選択

**参照**: `20-entity-overview.md` - Entity設計の3つのパターン、メソッドチェーンの詳細

**パターンA: 単純なデータ変換メソッド（Entity返却、メソッドチェーン可能）**

条件:
- ビジネスロジックがない（Value Objectで検証完了）
- 単一フィールドの更新
- メソッドチェーンを活用したい

```typescript
// UseCase層 - Result.then()でメソッドチェーン
const titleResult = TodoTitle.from({ title: input.title });
if (!titleResult.success) {
  return Result.err(titleResult.error);
}

const statusResult = TodoStatus.from({ status: input.status });
if (!statusResult.success) {
  return Result.err(statusResult.error);
}

const now = dateToIsoString(this.#props.fetchNow());

// Result.ok()で包んでメソッドチェーン開始
const result = Result.ok(existing)
  .then(t => t.changeTitle(titleResult.data, now))
  .then(t => t.changeStatus(statusResult.data, now))
  .then(t => repository.save(t));

if (!result.success) {
  return result;
}
```

**パターンB: 複雑なバリデーションメソッド（Result型返却）**

条件:
- 複数フィールドの連動あり
- Entity全体を見た不変条件あり
- ビジネスの意図を明確にすべき操作

```typescript
// Domain層（Todo Entity）
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  // Entity全体を見た不変条件
  if (!this.dueDate) {
    return {
      success: false,
      error: new DomainError('期限のないTODOは完了できません'),
    };
  }

  // 複数フィールド連動
  return Result.ok(new Todo({
    ...this,
    status: TodoStatus.completed(),
    completedAt,
    updatedAt,
  }));
}

// UseCase層
const result = existing.markAsCompleted(now, now);
if (!result.success) {
  return Result.err(result.error);
}
const completed = result.data;
```

## エンティティ操作パターン

### パターン1: 新規作成

```typescript
// UseCase層
async execute(input: RegisterTodoUseCaseInput): Promise<Result> {
  // 1. Value Object生成
  const titleResult = TodoTitle.fromString(input.title);
  if (!titleResult.success) {
    return Result.err(titleResult.error);
  }

  const statusResult = TodoStatus.fromString(input.status);
  if (!statusResult.success) {
    return Result.err(statusResult.error);
  }

  // 2. ID生成
  const todoId = this.#props.todoRepository.todoId();
  const now = dateToIsoString(this.#props.fetchNow());

  // 3. Entity生成
  const todo = new Todo({
    id: todoId,
    title: titleResult.data,
    description: input.description,
    status: statusResult.data,
    userSub: input.userSub,
    createdAt: now,
    updatedAt: now,
  });

  // 4. リポジトリ保存
  const saveResult = await this.#props.todoRepository.save({ todo });
  if (!saveResult.success) {
    return Result.err(saveResult.error);
  }

  return Result.ok(todo);
}
```

### パターン2: PATCH更新（Result.then()メソッドチェーン）

**参照**: `20-use-case-implementation.md` - PATCH更新時の個別メソッド更新

**使用条件**:
- PATCH更新（部分更新、送られたフィールドのみ受け取る）
- 複雑なビジネスロジックがない場合

**原則**:
- 送られたフィールドのみ更新（`'in'`演算子で判定）
- 送られなかったフィールドは既存値のまま = 自然にマージ
- Result.then()でメソッドチェーン

**実装詳細**: `20-use-case-implementation.md` - PATCH更新時の個別メソッド更新パターン参照

### パターン3: 更新（ビジネスメソッド使用）

**使用条件**: ビジネスロジックがある場合

```typescript
// Domain層（Todo Entity）
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  if (!this.dueDate) {
    return {
      success: false,
      error: new DomainError('期限のないTODOは完了できません'),
    };
  }

  return Result.ok(new Todo({
    ...this,
    status: TodoStatus.completed(),
    completedAt,
    updatedAt,
  }));
}

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
  const completedResult = existing.markAsCompleted(now, now);
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

  return Result.ok(completedResult.data);
}
```

## Value Objectエラーの変換パターン

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

## ドメインメソッド追加のタイミング

### 追加すべき場合

1. **ビジネスの意図を表現**
   ```typescript
   // ✅ Good: 意図が明確
   todo.markAsCompleted(now, now)
   todo.postpone(newDueDate, now)
   todo.assignTo(userId, now)
   ```

2. **複数フィールドの連動**
   ```typescript
   // ✅ Good: 完了時にstatusとcompletedAtを同時変更
   markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError>
   ```

3. **Entity全体を見た不変条件**
   ```typescript
   // ✅ Good: 期限の有無をチェック
   markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
     if (!this.dueDate) {
       return Result.err(new DomainError());
     }
     // ...
   }
   ```

### 追加すべきでない場合

1. **将来使うかもしれない**（YAGNI原則違反）
   ```typescript
   // ❌ Bad: 現在使われていない
   markAsPending(updatedAt: string): Todo
   markAsInProgress(updatedAt: string): Todo
   ```

2. **Value Objectで表現可能**
   ```typescript
   // ❌ Bad: Value Objectで検証すべき
   changeColor(color: string): Result<Project, DomainError> {
     if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
       return Result.err(new DomainError());
     }
     // ...
   }

   // ✅ Good: ProjectColor Value Objectで検証
   changeColor(color: ProjectColor, updatedAt: string): Project {
     return new Project({ ...this, color, updatedAt });
   }
   ```

## Do / Don't

### ✅ Good

```typescript
// ビジネスロジックをドメイン層に配置
class Todo {
  markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
    if (!this.dueDate) {
      return Result.err(new DomainError('期限のないTODOは完了できません'));
    }
    return Result.ok(new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt }));
  }
}

// UseCase層は調整のみ
const result = existing.markAsCompleted(now, now);
if (!result.success) {
  return Result.err(result.error);
}
```

### ❌ Bad

```typescript
// ビジネスロジックがUseCase層に漏れ出す（貧血ドメインモデル）
class Todo {
  // データの入れ物のみ
  readonly status: TodoStatus;
  readonly completedAt?: string;
}

// UseCase層にビジネスロジック
if (!existing.dueDate) {
  return {
    success: false,
    error: new DomainError('期限のないTODOは完了できません'),
  };
}
const updated = new Todo({
  ...existing,
  status: TodoStatus.completed(),
  completedAt: now,
  updatedAt: now,
});
```

## チェックリスト

ユースケース実装時、以下を確認する:

```
[ ] Value Objectで表現できるロジックはないか？
[ ] Entity内に配置すべきビジネスロジックはないか？
[ ] 複数フィールドの連動があるか？
[ ] Entity全体を見た不変条件があるか？
[ ] ビジネスの意図を表現する個別メソッドが必要か？
[ ] YAGNI原則に反する未使用メソッドを追加していないか？
[ ] Value Objectエラーをそのまま伝播しているか？
```
