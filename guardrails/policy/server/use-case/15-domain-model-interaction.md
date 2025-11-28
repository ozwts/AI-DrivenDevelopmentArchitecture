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

**パターンA: reconstruct()使用**

条件:
- ビジネスロジックがない（Value Objectで検証完了）
- 複数フィールドの連動なし
- PATCH更新などで全フィールドを受け取る

```typescript
// UseCase層
const titleResult = TodoTitle.fromString(input.title);
if (!titleResult.success) {
  return { success: false, error: titleResult.error };
}

const statusResult = TodoStatus.fromString(input.status);
if (!statusResult.success) {
  return { success: false, error: statusResult.error };
}

// ビジネスロジックなし：reconstruct()使用
const updated = Todo.reconstruct({
  id: existing.id,
  title: titleResult.data,        // Value Objectで検証済み
  description: input.description,  // プリミティブ
  status: statusResult.data,       // Value Objectで検証済み
  userSub: existing.userSub,
  createdAt: existing.createdAt,
  updatedAt: now,
});
```

**パターンB: 個別メソッド追加**

条件:
- 複数フィールドの連動あり
- Entity全体を見た不変条件あり
- ビジネスの意図を明確にすべき操作

```typescript
// Domain層（Todo Entity）
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError> {
  // Entity全体を見た不変条件
  if (!this.dueDate) {
    return {
      success: false,
      error: new ValidationError('期限のないTODOは完了できません'),
    };
  }

  // 複数フィールド連動
  return {
    success: true,
    data: new Todo({
      ...this,
      status: TodoStatus.completed(),
      completedAt,
      updatedAt,
    }),
  };
}

// UseCase層
const result = existing.markAsCompleted(now, now);
if (!result.success) {
  return { success: false, error: result.error };
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
    return { success: false, error: titleResult.error };
  }

  const statusResult = TodoStatus.fromString(input.status);
  if (!statusResult.success) {
    return { success: false, error: statusResult.error };
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
    return { success: false, error: saveResult.error };
  }

  return { success: true, data: todo };
}
```

### パターン2: 更新（PUT/全フィールド受け取り、reconstruct使用）

**使用条件**:
- ビジネスロジックがない場合
- PUT更新（全フィールドを受け取る）

```typescript
// UseCase層
async execute(input: UpdateTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: new NotFoundError() };
  }
  const existing = existingResult.data;

  // 2. 権限チェック
  if (existing.userSub !== input.userSub) {
    return { success: false, error: new ForbiddenError() };
  }

  // 3. Value Object生成（すべてのフィールド）
  const titleResult = TodoTitle.fromString(input.title);
  if (!titleResult.success) {
    return { success: false, error: titleResult.error };
  }

  const statusResult = TodoStatus.fromString(input.status);
  if (!statusResult.success) {
    return { success: false, error: statusResult.error };
  }

  // 4. Entity再構築（全フィールド受け取り）
  const updated = Todo.reconstruct({
    id: existing.id,
    title: titleResult.data,
    description: input.description,
    status: statusResult.data,
    userSub: existing.userSub,       // 変更不可
    createdAt: existing.createdAt,   // 変更不可
    updatedAt: dateToIsoString(this.#props.fetchNow()),
  });

  // 5. 保存
  const saveResult = await this.#props.todoRepository.save({ todo: updated });
  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }

  return { success: true, data: updated };
}
```

### パターン2.5: 更新（PATCH/部分更新、reconstruct使用）

**参照**: `20-use-case-implementation.md` - PATCH更新時のマージロジック

**使用条件**:
- ビジネスロジックがない場合
- PATCH更新（部分更新、変更されたフィールドのみ受け取る）

```typescript
// UseCase層
async execute(input: UpdateTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: new NotFoundError() };
  }
  const existing = existingResult.data;

  // 2. 権限チェック
  if (existing.userSub !== input.userSub) {
    return { success: false, error: new ForbiddenError() };
  }

  // 3. 変更されたフィールドのみValue Object生成
  let title = existing.title;
  if (input.title !== undefined) {
    const titleResult = TodoTitle.fromString(input.title);
    if (!titleResult.success) return titleResult;
    title = titleResult.data;
  }

  let status = existing.status;
  if (input.status !== undefined) {
    const statusResult = TodoStatus.fromString(input.status);
    if (!statusResult.success) return statusResult;
    status = statusResult.data;
  }

  // 4. マージロジック実施（プリミティブフィールド）
  const description = input.description !== undefined
    ? input.description
    : existing.description;

  // 5. Entity再構築（全フィールドを渡す）
  const updated = Todo.reconstruct({
    id: existing.id,
    title,              // マージ済み
    description,        // マージ済み
    status,             // マージ済み
    userSub: existing.userSub,     // 変更不可
    createdAt: existing.createdAt, // 変更不可
    updatedAt: dateToIsoString(this.#props.fetchNow()),
  });

  // 6. 保存
  const saveResult = await this.#props.todoRepository.save({ todo: updated });
  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }

  return { success: true, data: updated };
}
```

**重要**:
- `??`演算子はプリミティブ型フィールドのマージに使用
- Value Objectフィールドは個別に生成・検証してからマージ
- reconstruct()は常に全フィールドを受け取る（マージ後）

### パターン3: 更新（個別メソッド使用）

**使用条件**: ビジネスロジックがある場合

```typescript
// Domain層（Todo Entity）
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError> {
  if (!this.dueDate) {
    return {
      success: false,
      error: new ValidationError('期限のないTODOは完了できません'),
    };
  }

  return {
    success: true,
    data: new Todo({
      ...this,
      status: TodoStatus.completed(),
      completedAt,
      updatedAt,
    }),
  };
}

// UseCase層
async execute(input: CompleteTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: new NotFoundError() };
  }
  const existing = existingResult.data;

  // 2. 権限チェック
  if (existing.userSub !== input.userSub) {
    return { success: false, error: new ForbiddenError() };
  }

  // 3. ビジネスメソッド呼び出し
  const now = dateToIsoString(this.#props.fetchNow());
  const completedResult = existing.markAsCompleted(now, now);
  if (!completedResult.success) {
    return { success: false, error: completedResult.error };
  }

  // 4. 保存
  const saveResult = await this.#props.todoRepository.save({
    todo: completedResult.data,
  });
  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }

  return { success: true, data: completedResult.data };
}
```

## Value Objectエラーの変換パターン

```typescript
// Value Object生成
const colorResult = ProjectColor.fromString(input.color);

if (!colorResult.success) {
  // Value Objectのエラーをそのまま伝播（新しいエラーで包まない）
  return {
    success: false,
    error: colorResult.error,
  };
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
   markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError>
   ```

3. **Entity全体を見た不変条件**
   ```typescript
   // ✅ Good: 期限の有無をチェック
   markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError> {
     if (!this.dueDate) {
       return { success: false, error: new ValidationError() };
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
   changeColor(color: string): Result<Project, ValidationError> {
     if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
       return { success: false, error: new ValidationError() };
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
  markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError> {
    if (!this.dueDate) {
      return {
        success: false,
        error: new ValidationError('期限のないTODOは完了できません'),
      };
    }
    return {
      success: true,
      data: new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt }),
    };
  }
}

// UseCase層は調整のみ
const result = existing.markAsCompleted(now, now);
if (!result.success) {
  return { success: false, error: result.error };
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
    error: new ValidationError('期限のないTODOは完了できません'),
  };
}
const updated = Todo.reconstruct({
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
