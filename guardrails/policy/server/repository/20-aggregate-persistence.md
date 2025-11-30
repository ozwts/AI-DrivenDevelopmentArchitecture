# 集約の永続化パターン

## 核心原則

集約は**永続化の原子性単位**であり、集約ルートと子エンティティは**1つのトランザクションで一括保存・取得**される。

**関連ドキュメント**:

- **ドメインの集約**: `../domain-model/40-aggregate-overview.md` - 集約の設計原則
- **Repository Interface**: `../domain-model/30-repository-interface-overview.md`
- **UnitOfWork**: `../unit-of-work/10-interface.md`

## 責務

### 実施すること

1. **集約単位での永続化**: 集約ルートと子エンティティを一括で保存・取得
2. **トランザクション管理**: 集約内の整合性を保証するトランザクション
3. **データ変換**: ドメインモデル ⇔ DB形式の変換
4. **親子関係の管理**: DBにおける親子関係の実装（PK/SK等）

### 実施しないこと

1. **ドメインルール** → Domain層で実施
2. **ビジネスルール** → UseCase層で実施
3. **集約の境界定義** → Domain層で設計済み

## 設計原則

### 1. 集約として操作する

子エンティティを個別に操作するメソッドは作らない。集約全体を操作する。

```typescript
// ❌ Bad: 子エンティティを個別に操作するメソッド
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>;

  // 子エンティティを個別操作するメソッドは作らない
  addAttachment(props: {
    todoId: string;
    attachment: Attachment;
  }): Promise<SaveResult>;
  removeAttachment(props: {
    todoId: string;
    attachmentId: string;
  }): Promise<RemoveResult>;
};

// ✅ Good: 集約全体を操作
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>;
  // Todoエンティティにattachmentsが含まれているため、save()で子エンティティも一緒に保存される
};

// 使用側（UseCase）で集約ルート経由で操作
const updatedTodo = todo.addAttachment(attachment, now);
await todoRepository.save({ todo: updatedTodo });
```

**理由:**

- 集約の整合性を保証
- リポジトリの責務を単純化
- ドメインモデルの操作を集約ルートに集約

### 2. 子エンティティ専用リポジトリは作らない

基本的に子エンティティ専用のリポジトリは作らず、親の集約ルートリポジトリに統合する。

```typescript
// ❌ Bad: 子エンティティ専用リポジトリ
export type AttachmentRepository = {
  save(props: { attachment: Attachment }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
};

// ✅ Good: 親リポジトリで管理
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
  // Todoのattachmentsも一緒に保存・削除される
};
```

**理由:**

- 集約の整合性を保証（親と子が同じトランザクションで保存される）
- リポジトリの数を減らし、保守性を向上

### 3. Replace戦略で子エンティティを保存

集約を保存する際、子エンティティは**Replace戦略**を採用する。

**Replace戦略:**

1. 既存の子エンティティを取得
2. 新しい子エンティティに含まれていない既存エンティティを削除
3. 新しい子エンティティを全て挿入（DynamoDBのPutは上書き）
4. すべての操作を単一トランザクションで実行

**利点:**

- 実装がシンプル：追加・更新・削除の判別が不要
- 整合性が保証される：常に最新の状態がDBに反映される
- トランザクション境界が明確

**注意点:**

- 子エンティティが多い場合はトランザクション操作数制限に注意（DynamoDB: 最大100操作）
- 既存データの取得が必要（1回の追加クエリ）
- パフォーマンスより整合性を優先する設計

**DynamoDB制約への対応:**

DynamoDBのTransactWriteItemsには以下の制約がある：

1. **最大100操作まで**: 親1件 + 削除N件 + 挿入M件の合計が100操作以内
2. **同じキーへの複数操作不可**: 同じキーに対してDeleteとPutを同一トランザクション内で行えない

そのため、**削除対象から新しいエンティティに含まれるものを除外**し、Putによる上書きのみを行う。

```typescript
// 新しいattachmentsのIDセット
const newAttachmentIds = new Set(props.todo.attachments.map((att) => att.id));

// 既存のattachmentsのうち、新しいattachmentsに含まれていないものを削除
const deleteAttachmentOperations = (existingAttachmentsResult.Items ?? [])
  .map((item) => attachmentTableItemSchema.parse(item))
  .filter((item) => !newAttachmentIds.has(item.attachmentId)) // 新しいIDに含まれないもののみ
  .map((item) => ({
    Delete: {
      TableName: this.#attachmentsTableName,
      Key: {
        todoId: item.todoId,
        attachmentId: item.attachmentId,
      },
    },
  }));
```

### 4. 集約単位での保存

リポジトリの`save()`メソッドは、集約ルートと子エンティティをまとめて保存する。

```typescript
export type TodoRepository = {
  /**
   * TODOを保存する（子エンティティも含めて保存）
   */
  save(props: { todo: Todo }): Promise<SaveResult>;
};

// 使用例（UseCase層）
const todo = new Todo({
  id: "todo-123",
  title: "タスク",
  attachments: [attachment1, attachment2], // 子エンティティも含む
  createdAt: now,
  updatedAt: now,
});

await todoRepository.save({ todo }); // 一括保存
```

### 3. 集約単位での取得

`findById()`は集約ルートと子エンティティを一括で取得する。

```typescript
export type TodoRepository = {
  /**
   * TODOを取得する（子エンティティも含めて取得）
   */
  findById(props: { id: string }): Promise<FindByIdResult>;
};

// 使用例（UseCase層）
const todoResult = await todoRepository.findById({ id: "todo-123" });
if (todoResult.success && todoResult.data) {
  const todo = todoResult.data;
  console.log(todo.attachments); // 子エンティティも含まれている
}
```

### 4. パフォーマンス最適化のための個別メソッド（オプション）

パフォーマンス上の懸念がある場合は、個別の操作メソッドを追加することも可能。

```typescript
export type TodoRepository = {
  // 基本の保存（集約全体）
  save(props: { todo: Todo }): Promise<SaveResult>;

  // 個別操作（パフォーマンス最適化）
  addAttachment(props: {
    todoId: string;
    attachment: Attachment;
  }): Promise<SaveResult>;

  removeAttachment(props: {
    todoId: string;
    attachmentId: string;
  }): Promise<RemoveResult>;
};
```

**注意:** 個別操作メソッドは、必要性が明確になってから追加する。最初から実装しない。

## 実装パターン（DynamoDB）

### データ変換スキーマ

ZodスキーマでDB形式を定義する。

```typescript
import { z } from "zod";

/**
 * Todosテーブル用のスキーマ
 */
export const todoDdbItemSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TodoDdbItem = z.infer<typeof todoDdbItemSchema>;

/**
 * Attachmentsテーブル用のスキーマ（親子関係を管理）
 */
export const attachmentTableItemSchema = z.object({
  todoId: z.string(), // PK（親のID）
  attachmentId: z.string(), // SK（子のID）
  fileName: z.string(),
  storageKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AttachmentTableItem = z.infer<typeof attachmentTableItemSchema>;
```

### ドメインモデル ← → DB変換

```typescript
/**
 * TodoDdbItem → Todo 変換（Value Object変換を含む）
 */
export const todoDdbItemToTodo = (
  todoDdbItem: TodoDdbItem,
  attachments: Attachment[], // 別テーブルから取得
): Todo => {
  // Value Object生成（from()メソッドにProps型エイリアスパターンで渡す）
  const statusResult = TodoStatus.from({ status: todoDdbItem.status });

  // データ不整合の場合はデフォルト値を使用（ログ出力推奨）
  // **参照**: `10-repository-overview.md` - なぜデフォルト値を使うべきか
  const status = statusResult.success
    ? statusResult.data
    : TodoStatus.default();

  // Entityはコンストラクタで直接生成
  // DBデータは既に整合性があると信頼（MECE原則）
  return new Todo({
    id: todoDdbItem.todoId,
    title: todoDdbItem.title,
    description: todoDdbItem.description,
    status, // Value Object（変換済み）
    attachments, // 子エンティティを渡す
    createdAt: todoDdbItem.createdAt,
    updatedAt: todoDdbItem.updatedAt,
  });
};

/**
 * Todo → TodoDdbItem 変換
 */
export const todoDdbItemFromTodo = (todo: Todo): TodoDdbItem => ({
  todoId: todo.id,
  title: todo.title,
  description: todo.description,
  status: todo.status.toString(), // Value ObjectをDB形式に変換
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
  // attachmentsは別テーブルに保存
});

/**
 * Attachment → AttachmentTableItem 変換
 */
export const attachmentTableItemFromAttachment = (
  todoId: string, // 親のID（DB用）
  attachment: Attachment,
): AttachmentTableItem => ({
  todoId, // 親のID
  attachmentId: attachment.id,
  fileName: attachment.fileName,
  storageKey: attachment.storageKey,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});
```

### save()の実装（集約一括保存）

```typescript
async save(props: { todo: Todo }): Promise<SaveResult> {
  const todoDdbItem = todoDdbItemFromTodo(props.todo);

  try {
    // 既存のattachmentsを取得（削除のため）
    const existingAttachmentsResult = await this.#ddbDoc.send(
      new QueryCommand({
        TableName: this.#attachmentsTableName,
        KeyConditionExpression: "todoId = :todoId",
        ExpressionAttributeValues: {
          ":todoId": props.todo.id,
        },
      }),
    );

    // Todosテーブルへの操作
    const todoOperation = {
      Put: {
        TableName: this.#todosTableName,
        Item: todoDdbItem,
      },
    };

    // 新しいattachmentsのIDセット
    const newAttachmentIds = new Set(
      props.todo.attachments.map((att) => att.id),
    );

    // 既存のattachmentsのうち、新しいattachmentsに含まれていないものを削除
    const deleteAttachmentOperations = (existingAttachmentsResult.Items ?? [])
      .map((item) => attachmentTableItemSchema.parse(item))
      .filter((item) => !newAttachmentIds.has(item.attachmentId))
      .map((item) => ({
        Delete: {
          TableName: this.#attachmentsTableName,
          Key: {
            todoId: item.todoId,
            attachmentId: item.attachmentId,
          },
        },
      }));

    // 新しいattachmentsを挿入する操作
    const putAttachmentOperations = props.todo.attachments.map(
      (attachment) => ({
        Put: {
          TableName: this.#attachmentsTableName,
          Item: attachmentTableItemFromAttachment(props.todo.id, attachment),
        },
      }),
    );

    // すべての操作を結合（トランザクション）
    const operations = [
      todoOperation,
      ...deleteAttachmentOperations,
      ...putAttachmentOperations,
    ];

    if (this.#uow !== undefined) {
      // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
      for (const operation of operations) {
        this.#uow.registerOperation(operation);
      }
    } else {
      // UoWなしの場合は即座に実行
      await this.#ddbDoc.send(
        new TransactWriteCommand({
          TransactItems: operations,
        }),
      );
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    this.#logger.error("TODOの保存に失敗しました", error as Error);
    return {
      success: false,
      error: new UnexpectedError(),
    };
  }
}
```

### findById()の実装（集約一括取得）

```typescript
async findById(props: { id: string }): Promise<FindByIdResult> {
  try {
    // Todosテーブルから取得
    const todoResult = await this.#ddbDoc.send(
      new GetCommand({
        TableName: this.#todosTableName,
        Key: { todoId: props.id },
      }),
    );

    if (todoResult.Item === undefined) {
      return {
        success: true,
        data: undefined,
      };
    }

    // Attachmentsテーブルから取得
    const attachmentsResult = await this.#ddbDoc.send(
      new QueryCommand({
        TableName: this.#attachmentsTableName,
        KeyConditionExpression: "todoId = :todoId",
        ExpressionAttributeValues: {
          ":todoId": props.id,
        },
      }),
    );

    const attachmentItems = (attachmentsResult.Items ?? []).map((item) =>
      attachmentTableItemSchema.parse(item),
    );

    const attachments = attachmentItems.map((item) =>
      new Attachment({
        id: item.attachmentId,
        fileName: item.fileName,
        storageKey: item.storageKey,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }),
    );

    // TodoDdbItemをパース
    const todoDdbItem = todoDdbItemSchema.parse(todoResult.Item);

    // Todoエンティティを作成（Attachmentsテーブルから取得したattachmentsを使用）
    const todo = todoDdbItemToTodo(todoDdbItem, attachments);

    return {
      success: true,
      data: todo,
    };
  } catch (error) {
    this.#logger.error("TODOの取得に失敗しました", error as Error);
    return {
      success: false,
      error: new UnexpectedError(),
    };
  }
}
```

## Do / Don't

### ✅ Good

```typescript
// 集約単位での保存
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>;
};

// 集約単位での取得
const todoResult = await todoRepository.findById({ id: "todo-123" });
if (todoResult.success && todoResult.data) {
  const todo = todoResult.data;
  console.log(todo.attachments); // 子エンティティも含まれている
}

// トランザクションで親と子を一括保存
const operations = [
  todoOperation,
  ...deleteAttachmentOperations,
  ...putAttachmentOperations,
];
await this.#ddbDoc.send(
  new TransactWriteCommand({ TransactItems: operations }),
);

// データ変換関数でドメインモデル ⇔ DB形式を変換
const todoDdbItem = todoDdbItemFromTodo(todo);
const todo = todoDdbItemToTodo(todoDdbItem, attachments);
```

### ❌ Bad

```typescript
// 子エンティティ専用リポジトリを作る
export type AttachmentRepository = {
  save(props: { attachment: Attachment }): Promise<SaveResult>;
};

// 親と子を別々に保存（整合性が保証されない）
await todoRepository.save({ todo });
for (const attachment of todo.attachments) {
  await attachmentRepository.save({ attachment }); // トランザクションが分かれる
}

// findById()で子エンティティを取得しない
async findById(props: { id: string }): Promise<FindByIdResult> {
  const todoResult = await this.#ddbDoc.send(new GetCommand({ ... }));
  const todo = todoDdbItemToTodo(todoResult.Item, []); // attachmentsを渡していない
  return { success: true, data: todo };
}
```

## アグリゲート境界の判断基準

アグリゲートとして扱うべき条件と、別のアグリゲートとして分離すべき条件。

### アグリゲートとして扱うべき条件

以下のすべてを満たす場合は、同じアグリゲートとして扱う：

1. **ライフサイクルが同じ**: 親が削除されたら子も削除される
2. **整合性が必要**: 常に一貫した状態を保つ必要がある
3. **同時更新が多い**: 親と子を同時に更新する操作が多い
4. **ビジネスルールで密結合**: ドメインロジックで強い依存関係がある

**例: TODOとAttachment**

- ライフサイクル: TODOが削除されたらAttachmentも削除
- 整合性: Attachmentは常にTODOに紐づく
- 同時更新: TODOとAttachmentを同時に操作することが多い
- ビジネスルール: AttachmentはTODOの一部として扱われる

### 別のアグリゲートとして扱うべき条件

以下のいずれかを満たす場合は、別のアグリゲートとして分離する：

1. **独立したライフサイクル**: 親が削除されても子は残る
2. **参照関係のみ**: 弱い結合で、IDによる参照のみ
3. **別のビジネスコンテキスト**: 異なるドメインモデルとして扱われる
4. **大規模な子エンティティ**: 子エンティティが多すぎる（100操作制限）

**例: TODOとProject**

- ライフサイクル: TODOが削除されてもProjectは残る
- 参照関係: TODOはprojectIdで参照するだけ
- ビジネスコンテキスト: ProjectはTODOとは独立したエンティティ

### トランザクション操作数制限への対応

DynamoDBのTransactWriteItemsは最大100操作まで。子エンティティが多い場合は設計を見直す：

1. **子エンティティの上限を設ける**: ビジネスルールで制限（例: 添付ファイルは最大50件まで）
2. **アグリゲートを分割する**: 大きすぎるアグリゲートは複数に分割
3. **別テーブルで管理**: 参照関係のみで管理し、別のリポジトリで扱う

