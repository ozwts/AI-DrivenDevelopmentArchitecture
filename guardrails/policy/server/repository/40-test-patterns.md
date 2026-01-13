# リポジトリのテストパターン

## 核心原則

1. リポジトリの**全メソッド**に対して、**正常系・子エンティティを含む正常系・異常系**のテストケースを必ず追記
2. **全テストでDummyファクトリを使用** - `new Entity()`を直接使わず、保守性を向上

**関連ドキュメント**:

- **Repository概要**: `10-repository-overview.md`
- **集約の永続化**: `20-aggregate-persistence.md`
- **DynamoDBパターン**: `30-dynamodb-patterns.md`
- **Entity Dummyファクトリ**: `../domain-model/52-entity-test-patterns.md`

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

`{entity}.repository.medium.test.ts` - DynamoDB統合テスト

**例**:

- `todo.repository.medium.test.ts`
- `project.repository.medium.test.ts`
- `user.repository.medium.test.ts`

## テストケースの実装例

### TodoRepositoryのテストケース

**重要**: すべてのテストケースでDummyファクトリを使用する。

```typescript
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.entity.dummy";

describe("TodoRepositoryImpl", () => {
  describe("findById", () => {
    test("[正常系] 存在するTodoをIDで取得する", async () => {
      // Arrange: Dummyファクトリでテストデータを準備
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "テストTODO",
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
      // Arrange: Dummyファクトリで添付ファイル付きTODOを準備
      const attachment = attachmentDummyFrom({
        id: todoRepository.attachmentId(),
        fileName: "test.pdf",
      });
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        attachments: [attachment],
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
      // Arrange: Dummyファクトリで複数のTODOを準備
      const todo1 = todoDummyFrom({ id: todoRepository.todoId() });
      const todo2 = todoDummyFrom({ id: todoRepository.todoId() });
      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      // Act: 全件取得
      const result = await todoRepository.findAll();

      // Assert: 全てのTODOが取得できる
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test("[正常系] 添付ファイル付きTodoを含む全件取得", async () => {
      // Arrange: Dummyファクトリで添付ファイル付きTODOを準備
      const attachment = attachmentDummyFrom();
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        attachments: [attachment],
      });
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
      // Arrange: DummyファクトリでTODOを準備
      const todo = todoDummyFrom({ id: todoRepository.todoId() });

      // Act: 保存
      const result = await todoRepository.save({ todo });

      // Assert: 保存成功
      expect(result.success).toBe(true);

      // 保存されたことを確認
      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data).toBeDefined();
    });

    test("[正常系] 添付ファイル付きTodoを保存する", async () => {
      // Arrange: Dummyファクトリで添付ファイル付きTODOを準備
      const attachment = attachmentDummyFrom();
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        attachments: [attachment],
      });

      // Act: 保存
      const result = await todoRepository.save({ todo });

      // Assert: 子エンティティもトランザクションで保存される
      expect(result.success).toBe(true);

      const findResult = await todoRepository.findById({ id: todo.id });
      expect(findResult.data?.attachments).toHaveLength(1);
    });

    test("[正常系] 添付ファイルをReplace戦略で更新する", async () => {
      // Arrange: Dummyファクトリで既存の添付ファイルを持つTODOを保存
      const oldAttachment = attachmentDummyFrom({
        id: "att-1",
        fileName: "old.pdf",
      });
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        attachments: [oldAttachment],
      });
      await todoRepository.save({ todo });

      // Act: Dummyファクトリで新しい添付ファイルに置き換えて保存
      const newAttachment = attachmentDummyFrom({
        id: "att-2",
        fileName: "new.pdf",
      });
      const updatedTodo = todoDummyFrom({
        ...todo,
        attachments: [newAttachment],
      });
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
      // Arrange: DummyファクトリでTODOを準備
      const todo = todoDummyFrom({ id: todoRepository.todoId() });
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
      // Arrange: Dummyファクトリで添付ファイル付きTODOを準備
      const attachment = attachmentDummyFrom();
      const todo = todoDummyFrom({
        id: todoRepository.todoId(),
        attachments: [attachment],
      });
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

**重要**: テストヘルパー関数は使わず、Dummyファクトリを直接使用する。

```typescript
// ❌ Bad: テスト専用ヘルパー関数を作成（保守コスト増）
function createTestTodo(overrides?: Partial<TodoProps>): Todo {
  return new Todo({
    id: todoRepository.todoId(),
    title: "テストTODO", // 固定値
    status: TodoStatus.PENDING, // 固定値
    // ... モデル変更時に修正が必要
  });
}

// ✅ Good: Dummyファクトリを直接使用
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";

test("テストケース", async () => {
  const todo = todoDummyFrom({
    id: todoRepository.todoId(),
    // 必要なフィールドのみオーバーライド、他はランダム値
  });
});
```

**理由**:

- Dummyファクトリは既にランダム値生成機能を持つ
- テストファイル専用ヘルパーを作ると保守コストが倍増
- Dummyファクトリを全テストで統一して使用する方が一貫性がある

## UnitOfWorkとの統合テスト

新規リポジトリを追加した場合は、**UnitOfWorkのミディアムテスト**にも追加して、トランザクション動作を検証する。

### 追加が必要な理由

1. **トランザクション整合性の検証**: 複数のリポジトリ操作が1つのトランザクションで正しくコミット/ロールバックされることを確認
2. **UoW統合の動作確認**: `registerOperation()`メソッドが正しく呼び出されることを検証
3. **リグレッション防止**: 既存のトランザクション処理に影響を与えないことを保証

### テストファイル配置

```
infrastructure/unit-of-work/
└── dynamodb-unit-of-work.medium.test.ts  # ← ここに新規リポジトリのテストケースを追加
```

### テストケース例

**重要**: Medium TestでもLoggerDummyを使用する。デバッグ時のみ一時的にLoggerImplを使用。

```typescript
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";

describe("DynamoDBUnitOfWork with TodoRepository", () => {
  test("[正常系] UoWを使ってTodoを保存する", async () => {
    // Arrange
    const uow = new DynamoDBUnitOfWork({ ddbDoc });
    const todoRepository = new TodoRepositoryImpl({
      ddbDoc,
      todosTableName,
      attachmentsTableName,
      logger: new LoggerDummy(),  // LoggerDummyを使用
      uow,  // UoWを注入
    });

    const todo = todoDummyFrom({ id: todoRepository.todoId() });

    // Act
    await todoRepository.save({ todo });
    await uow.commit();  // トランザクションコミット

    // Assert: 保存されたことを確認
    const findResult = await todoRepository.findById({ id: todo.id });
    expect(findResult.data).toBeDefined();
  });

  test("[正常系] UoWでロールバックするとTodoは保存されない", async () => {
    // Arrange
    const uow = new DynamoDBUnitOfWork({ ddbDoc });
    const todoRepository = new TodoRepositoryImpl({
      ddbDoc,
      todosTableName,
      attachmentsTableName,
      logger: new LoggerDummy(),  // LoggerDummyを使用
      uow,
    });

    const todo = todoDummyFrom({ id: todoRepository.todoId() });

    // Act
    await todoRepository.save({ todo });
    // コミットしない（ロールバック相当）

    // Assert: 保存されていないことを確認
    const repositoryWithoutUow = new TodoRepositoryImpl({
      ddbDoc,
      todosTableName,
      attachmentsTableName,
      logger: new LoggerDummy(),
    });
    const findResult = await repositoryWithoutUow.findById({ id: todo.id });
    expect(findResult.data).toBeUndefined();
  });
});
```

