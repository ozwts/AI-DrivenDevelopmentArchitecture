# リポジトリのテストパターン

## 核心原則

リポジトリの**全メソッド**に対して、**正常系・子エンティティを含む正常系・異常系**のテストケースを必ず追記し、既存機能の意図せぬ破壊を防ぐ。

**関連ドキュメント**:
- **Repository概要**: `10-repository-overview.md`
- **集約の永続化**: `20-aggregate-persistence.md`
- **DynamoDBパターン**: `30-dynamodb-patterns.md`

## テストの重要性

リポジトリ実装の変更（例: テーブル構造の変更、データ変換ロジックの変更）によって、既存の機能が意図せず壊れることを防ぐため、すべてのメソッドに対してテストケースを追記することが重要。

## 基本的なテストケース

リポジトリの全メソッドに対して、以下のテストケースを必ず追記する：

### 1. 正常系

各メソッドの基本的な動作を確認する。

**例: findById**
- 存在するエンティティをIDで取得できる
- 存在しないエンティティを検索するとundefinedを返す

**例: findAll**
- 全てのエンティティを取得できる
- エンティティが存在しない場合、空配列を返す

**例: save**
- エンティティを保存できる
- 既存エンティティを上書き保存できる

**例: remove**
- エンティティを削除できる

### 2. 子エンティティを含む正常系

アグリゲートの場合、子エンティティを含むケースを確認する。

**例: findById（添付ファイル付きTODO）**
- 添付ファイル付きTODOをIDで取得し、子エンティティ（Attachment）も正しく含まれる

**例: findAll（添付ファイル付きTODO）**
- 添付ファイル付きTODOを含む全件取得で、子エンティティも正しく含まれる

**例: save（添付ファイル付きTODO）**
- 添付ファイル付きTODOを保存し、子エンティティもトランザクションで一括保存される
- 既存の添付ファイルが新しいものに置き換わる（Replace戦略）

**例: remove（添付ファイル付きTODO）**
- TODOを削除すると、関連する添付ファイルも一緒に削除される

### 3. 異常系（該当する場合）

エラーハンドリングの確認（該当する場合のみ）。

**注意**: DynamoDB統合テストでは、ネットワークエラーやDB接続エラーを再現することが難しいため、異常系テストは限定的になる。

## テストファイル命名規則

`{entity}-repository.medium.test.ts` - DynamoDB統合テスト

**例**:
- `todo-repository.medium.test.ts`
- `project-repository.medium.test.ts`
- `user-repository.medium.test.ts`

## テストケースの実装例

### TodoRepositoryのテストケース

```typescript
describe("TodoRepositoryImpl", () => {
  describe("findById", () => {
    test("[正常系] 存在するTodoをIDで取得する", async () => {
      // Arrange: テストデータを準備
      const todo = new Todo({
        id: todoRepository.todoId(),
        title: "テストTODO",
        status: TodoStatus.PENDING,
        assigneeUserId: "user-123",
        attachments: [],
        createdAt: now,
        updatedAt: now,
      });
      await todoRepository.save({ todo });

      // Act: 取得
      const result = await todoRepository.findById({ id: todo.id });

      // Assert: 正しく取得できる
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(todo.id);
      expect(result.data?.title).toBe("テストTODO");
    });

    test("[正常系] 添付ファイル付きTodoをIDで取得する", async () => {
      // Arrange: 添付ファイル付きTODOを準備
      const attachment = new Attachment({
        id: todoRepository.attachmentId(),
        fileName: "test.pdf",
        storageKey: "s3://bucket/test.pdf",
        createdAt: now,
        updatedAt: now,
      });
      const todo = new Todo({
        id: todoRepository.todoId(),
        title: "テストTODO",
        status: TodoStatus.PENDING,
        assigneeUserId: "user-123",
        attachments: [attachment],
        createdAt: now,
        updatedAt: now,
      });
      await todoRepository.save({ todo });

      // Act: 取得
      const result = await todoRepository.findById({ id: todo.id });

      // Assert: 子エンティティも含まれる
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.attachments).toHaveLength(1);
      expect(result.data?.attachments[0].fileName).toBe("test.pdf");
    });

    test("[正常系] 存在しないTodoを検索するとundefinedを返す", async () => {
      // Act: 存在しないIDで取得
      const result = await todoRepository.findById({ id: "non-existent" });

      // Assert: undefinedを返す
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe("findAll", () => {
    test("[正常系] 全てのTodoを取得する", async () => {
      // Arrange: 複数のTODOを準備
      const todo1 = new Todo({ id: todoRepository.todoId(), ... });
      const todo2 = new Todo({ id: todoRepository.todoId(), ... });
      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      // Act: 全件取得
      const result = await todoRepository.findAll();

      // Assert: 全てのTODOが取得できる
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test("[正常系] 添付ファイル付きTodoを含む全件取得", async () => {
      // Arrange: 添付ファイル付きTODOを準備
      const attachment = new Attachment({ ... });
      const todo = new Todo({ id: todoRepository.todoId(), attachments: [attachment], ... });
      await todoRepository.save({ todo });

      // Act: 全件取得
      const result = await todoRepository.findAll();

      // Assert: 子エンティティも含まれる
      expect(result.success).toBe(true);
      expect(result.data?.[0].attachments).toHaveLength(1);
    });

    test("[正常系] Todoが存在しない場合、空配列を返す", async () => {
      // Act: 空の状態で全件取得
      const result = await todoRepository.findAll();

      // Assert: 空配列を返す
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("save", () => {
    test("[正常系] Todoを保存する", async () => {
      // Arrange: TODOを準備
      const todo = new Todo({ id: todoRepository.todoId(), ... });

      // Act: 保存
      const result = await todoRepository.save({ todo });

      // Assert: 保存成功
      expect(result.success).toBe(true);

      // 保存されたことを確認
      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data).toBeDefined();
    });

    test("[正常系] 添付ファイル付きTodoを保存する", async () => {
      // Arrange: 添付ファイル付きTODOを準備
      const attachment = new Attachment({ ... });
      const todo = new Todo({ id: todoRepository.todoId(), attachments: [attachment], ... });

      // Act: 保存
      const result = await todoRepository.save({ todo });

      // Assert: 子エンティティもトランザクションで保存される
      expect(result.success).toBe(true);

      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data?.attachments).toHaveLength(1);
    });

    test("[正常系] 添付ファイルをReplace戦略で更新する", async () => {
      // Arrange: 既存の添付ファイルを持つTODOを保存
      const oldAttachment = new Attachment({ id: "att-1", fileName: "old.pdf", ... });
      const todo = new Todo({ id: todoRepository.todoId(), attachments: [oldAttachment], ... });
      await todoRepository.save({ todo });

      // Act: 新しい添付ファイルに置き換えて保存
      const newAttachment = new Attachment({ id: "att-2", fileName: "new.pdf", ... });
      const updatedTodo = new Todo({ ...todo, attachments: [newAttachment] });
      await todoRepository.save({ todo: updatedTodo });

      // Assert: 古い添付ファイルは削除され、新しいものが保存される
      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data?.attachments).toHaveLength(1);
      expect(findResult.data?.attachments[0].id).toBe("att-2");
      expect(findResult.data?.attachments[0].fileName).toBe("new.pdf");
    });
  });

  describe("remove", () => {
    test("[正常系] Todoを削除する", async () => {
      // Arrange: TODOを準備
      const todo = new Todo({ id: todoRepository.todoId(), ... });
      await todoRepository.save({ todo });

      // Act: 削除
      const result = await todoRepository.remove({ id: todo.id });

      // Assert: 削除成功
      expect(result.success).toBe(true);

      // 削除されたことを確認
      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data).toBeUndefined();
    });

    test("[正常系] 添付ファイル付きTodoを削除すると関連する添付ファイルも削除される", async () => {
      // Arrange: 添付ファイル付きTODOを準備
      const attachment = new Attachment({ ... });
      const todo = new Todo({ id: todoRepository.todoId(), attachments: [attachment], ... });
      await todoRepository.save({ todo });

      // Act: 削除
      const result = await todoRepository.remove({ id: todo.id });

      // Assert: 親と子が一緒に削除される
      expect(result.success).toBe(true);

      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data).toBeUndefined();
      // 注: 子エンティティも削除されることを確認（実装依存）
    });
  });
});
```

## テストの準備と後処理

### テストデータのクリーンアップ

各テストの前後でデータをクリーンアップする。

```typescript
describe("TodoRepositoryImpl", () => {
  let todoRepository: TodoRepository;

  beforeAll(async () => {
    // DynamoDBクライアント初期化
    todoRepository = createTodoRepository();
  });

  afterEach(async () => {
    // テスト後にテーブルをクリーンアップ
    await cleanupTodosTable();
    await cleanupAttachmentsTable();
  });
});
```

### テストヘルパー関数

テストデータの作成を簡略化するヘルパー関数を用意する。

```typescript
// テストヘルパー
function createTestTodo(overrides?: Partial<TodoProps>): Todo {
  return new Todo({
    id: todoRepository.todoId(),
    title: "テストTODO",
    status: TodoStatus.PENDING,
    assigneeUserId: "user-123",
    attachments: [],
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  });
}

function createTestAttachment(overrides?: Partial<AttachmentProps>): Attachment {
  return new Attachment({
    id: todoRepository.attachmentId(),
    fileName: "test.pdf",
    storageKey: "s3://bucket/test.pdf",
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  });
}
```

## チェックリスト

```
[ ] 全メソッドに正常系テストケースを追加
[ ] アグリゲートの場合、子エンティティを含む正常系テストケースを追加
[ ] Replace戦略の動作を確認するテストケースを追加
[ ] 存在しないデータの検索で適切に処理されることを確認
[ ] テストファイル命名規則に従っている（{entity}-repository.medium.test.ts）
[ ] テストデータのクリーンアップを実装
[ ] テストヘルパー関数を用意して可読性を向上
```
