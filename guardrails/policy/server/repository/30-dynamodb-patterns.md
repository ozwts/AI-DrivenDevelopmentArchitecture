# DynamoDB実装パターン

## 概要

DynamoDBを使用したRepository実装の具体的なパターンを定義する。

**関連ドキュメント**:
- **Repository概要**: `10-repository-overview.md`
- **集約の永続化**: `20-aggregate-persistence.md`

## DynamoDB制約

### TransactWriteItemsの制約

**制約1: 最大100操作まで**

DynamoDBのTransactWriteItemsは最大100操作まで。子エンティティが多い場合は設計を見直す。

```typescript
// ❌ Bad: 100操作を超える可能性
const operations = [
  todoOperation,
  ...deleteAttachmentOperations,  // 50個
  ...putAttachmentOperations,      // 60個
];  // 合計111操作 → エラー

// ✅ Good: 集約のサイズを制限するか、設計を見直す
// - 子エンティティの上限を設ける
// - 2階層の集約を分割する
```

**制約2: 同じキーへの複数操作不可**

同じキーに対してDeleteとPutを同一トランザクション内で行うことができない。

```typescript
// ❌ Bad: 同じキーに対してDeleteとPut
const operations = [
  { Delete: { Key: { todoId: "123", attachmentId: "att-1" } } },
  { Put: { Item: { todoId: "123", attachmentId: "att-1", ... } } },  // エラー
];

// ✅ Good: 削除対象から新しいIDに含まれるものを除外
const newAttachmentIds = new Set(props.todo.attachments.map((att) => att.id));
const deleteOperations = existing
  .filter((item) => !newAttachmentIds.has(item.attachmentId))  // 新しいIDを除外
  .map((item) => ({ Delete: { ... } }));
```

## GSI（Global Secondary Index）制約への対応

### 空文字列禁止制約

DynamoDBのGSIキー属性には空文字列を保存できない。Repository層でDynamoDB固有の技術的制約を処理する。

```typescript
export const todoDdbItemFromTodo = (todo: Todo): TodoDdbItem => {
  // GSIキー属性の空文字列をundefinedに変換
  const projectId =
    todo.projectId === undefined ||
    todo.projectId === null ||
    todo.projectId === ""
      ? undefined
      : todo.projectId;

  const assigneeUserId =
    todo.assigneeUserId === undefined ||
    todo.assigneeUserId === null ||
    todo.assigneeUserId === ""
      ? undefined
      : todo.assigneeUserId;

  // assigneeUserIdが空の場合はエラー（必須フィールド）
  if (assigneeUserId === undefined) {
    throw new UnexpectedError("assigneeUserIdは必須です");
  }

  return {
    todoId: todo.id,
    title: todo.title,
    projectId,        // 空文字列の場合はundefined
    assigneeUserId,   // 検証済み
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
};
```

**参考**: OpenAPI層での空文字列禁止ポリシー - `../../../contract/api/15-validation-constraints.md`

## トランザクション操作

### TransactWriteCommandの使用

複数のテーブル操作を1つのトランザクションで実行する。

```typescript
async save(props: { todo: Todo }): Promise<SaveResult> {
  try {
    const operations = [
      {
        Put: {
          TableName: this.#todosTableName,
          Item: todoDdbItemFromTodo(props.todo),
        },
      },
      ...deleteAttachmentOperations,
      ...putAttachmentOperations,
    ];

    await this.#ddbDoc.send(
      new TransactWriteCommand({
        TransactItems: operations,
      }),
    );

    return { success: true, data: undefined };
  } catch (error) {
    this.#logger.error("TODOの保存に失敗しました", error as Error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

## ページネーション

### Scanのページネーション

```typescript
async findAll(): Promise<FindAllResult> {
  try {
    const todos: Todo[] = [];

    const paginator = paginateScan(
      { client: this.#ddbDoc },
      { TableName: this.#todosTableName },
    );

    for await (const page of paginator) {
      if (page.Items !== undefined && page.Items.length > 0) {
        const todoDdbItems = page.Items.map((item) =>
          todoDdbItemSchema.parse(item),
        );
        const parsedTodos = todoDdbItems.map((item) =>
          todoDdbItemToTodo(item, []),
        );
        todos.push(...parsedTodos);
      }
    }

    return { success: true, data: todos };
  } catch (error) {
    this.#logger.error("TODO一覧の取得に失敗しました", error as Error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

### Queryのページネーション（GSI使用）

```typescript
async findByStatus(props: { status: TodoStatus }): Promise<FindByStatusResult> {
  try {
    const todos: Todo[] = [];

    const paginator = paginateQuery(
      { client: this.#ddbDoc },
      {
        TableName: this.#todosTableName,
        IndexName: "StatusIndex",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": props.status,
        },
      },
    );

    for await (const page of paginator) {
      if (page.Items !== undefined && page.Items.length > 0) {
        const todoDdbItems = page.Items.map((item) =>
          todoDdbItemSchema.parse(item),
        );
        const parsedTodos = todoDdbItems.map((item) =>
          todoDdbItemToTodo(item, []),
        );
        todos.push(...parsedTodos);
      }
    }

    return { success: true, data: todos };
  } catch (error) {
    this.#logger.error("ステータス別TODO一覧の取得に失敗しました", error as Error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

## 集約の永続化（親子関係）

### 子エンティティの保存戦略

親と子を別テーブルに保存し、トランザクションで整合性を保証する。

```typescript
async save(props: { todo: Todo }): Promise<SaveResult> {
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
        Item: todoDdbItemFromTodo(props.todo),
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

    await this.#ddbDoc.send(
      new TransactWriteCommand({
        TransactItems: operations,
      }),
    );

    return { success: true, data: undefined };
  } catch (error) {
    this.#logger.error("TODOの保存に失敗しました", error as Error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

### 子エンティティの取得戦略

親を取得後、子を別途取得してドメインモデルに渡す。

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
      return { success: true, data: undefined };
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

    // Todoエンティティを作成（子エンティティを渡す）
    const todo = todoDdbItemToTodo(todoDdbItem, attachments);

    return { success: true, data: todo };
  } catch (error) {
    this.#logger.error("TODOの取得に失敗しました", error as Error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

## Value Objectの変換

### from()メソッドの失敗時の対応

DB から取得したデータが不正な場合、デフォルト値を使用する。

```typescript
export const projectDdbItemToProject = (
  projectDdbItem: ProjectDdbItem,
): Project => {
  // DynamoDBから取得したcolor文字列をProjectColorに変換
  // from()メソッドにProps型エイリアスパターンで渡す
  const colorResult = ProjectColor.from({ color: projectDdbItem.color });

  // データ不整合の場合はデフォルト値を使用（ログ出力推奨）
  const color = colorResult.success
    ? colorResult.data
    : ProjectColor.default();

  // Entityはコンストラクタで直接生成
  // DBデータは既に整合性があると信頼（MECE原則）
  return new Project({
    id: projectDdbItem.projectId,
    name: projectDdbItem.name,
    description: projectDdbItem.description,
    color,  // Value Object（変換済み）
    createdAt: projectDdbItem.createdAt,
    updatedAt: projectDdbItem.updatedAt,
  });
};
```

### Value Object → DB形式（文字列等）

```typescript
export const projectDdbItemFromProject = (
  project: Project,
): ProjectDdbItem => ({
  projectId: project.id,
  name: project.name,
  description: project.description,
  color: project.color.toString(),  // ProjectColorをDB形式に変換
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});
```

## Do / Don't

### ✅ Good

```typescript
// GSIキー属性の空文字列をチェック
const projectId = todo.projectId === "" ? undefined : todo.projectId;

// TransactWriteCommandでトランザクション
await this.#ddbDoc.send(
  new TransactWriteCommand({
    TransactItems: operations,
  }),
);

// paginateScan/paginateQueryでページネーション
const paginator = paginateScan(
  { client: this.#ddbDoc },
  { TableName: this.#todosTableName },
);
for await (const page of paginator) { ... }

// 子エンティティを別途取得して親に渡す
const attachments = await this.fetchAttachments(todoId);
const todo = todoDdbItemToTodo(todoDdbItem, attachments);

// Value Object変換失敗時はデフォルト値（default()がビジネス意味を持つ場合）
const colorResult = ProjectColor.from({ color });
if (!colorResult.success) {
  return ProjectColor.default();
}
```

### ❌ Bad

```typescript
// 空文字列をそのままGSIキーに保存
const projectId = todo.projectId;  // 空文字列の可能性

// 複数操作を個別に実行（トランザクションなし）
await this.#ddbDoc.send(new PutCommand({ ... }));
await this.#ddbDoc.send(new PutCommand({ ... }));

// ページネーションなしでScan
const result = await this.#ddbDoc.send(
  new ScanCommand({ TableName: this.#todosTableName }),
);

// 子エンティティを取得せずに親のみ返す
const todo = todoDdbItemToTodo(todoDdbItem, []);  // attachmentsが空

// Value Object変換失敗時に例外をthrow
const colorResult = ProjectColor.from({ color });
if (!colorResult.success) {
  throw new Error("Invalid color");  // Result型を使うべき
}

// インラインpropsパターンを使用（Props型エイリアスを使うべき）
const colorResult = ProjectColor.from(color);  // ❌ Props型エイリアスパターンを使うべき

// 直接キャストでValue Object変換をスキップ
const project = new Project({
  color: projectDdbItem.color as ProjectColor,  // ❌ from()で変換すべき
});
```

## テーブル設計

### 基本方針

DDDの集約に則り、エンティティごとに正規化されたテーブルを使用。

**原則:**
- 各エンティティごとに専用テーブル
- リポジトリが複数テーブルを集約
- 正規化されたスキーマ設計
- トランザクション境界を明確に

### キー設計

**基本パターン:**
- `PK` (Partition Key): エンティティの一意識別子
- `SK` (Sort Key): 子エンティティの識別子（集約の場合）

**例: Todosテーブル**
```
PK: todoId
SK: なし（集約ルート）
```

**例: Attachmentsテーブル**
```
PK: todoId（親のID）
SK: attachmentId（子のID）
```

### GSI設計

検索要件に応じて定義。

**例: ステータス別検索**
```
GSI名: StatusIndex
PK: status
SK: なし
```

**注意:** GSIは結果整合性のため、強い整合性が必要な場合は使用不可。

## チェックリスト

```
[ ] TransactWriteItemsは100操作以下
[ ] 同じキーへの複数操作を避けている
[ ] GSIキー属性の空文字列をチェックしている
[ ] TransactWriteCommandでトランザクションを実装
[ ] paginateScan/paginateQueryでページネーションを実装
[ ] 子エンティティを別途取得して親に渡している
[ ] Value Object変換にfrom(props: XxxProps)パターンを使用
[ ] Props型エイリアスパターンを使用（インラインpropsは使わない）
[ ] Value Object変換失敗時はdefault()を使用（ビジネス意味を持つ場合）
[ ] Value Object → DB形式にtoString()を使用
[ ] ExpressionAttributeNamesで予約語を回避
[ ] Zodスキーマでパースしている
[ ] エンティティごとに専用テーブルを使用
[ ] 正規化されたスキーマ設計
```
