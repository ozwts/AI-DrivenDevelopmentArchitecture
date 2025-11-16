# Repository実装 - データアクセス層

ドメイン層で定義されたリポジトリインターフェースの実装。DynamoDBへのデータアクセスを担当。

## 核となる設計原則

### 1. インターフェース分離原則

インターフェース定義はドメイン層、実装はインフラ層。

**依存関係の方向:**

```
ドメイン層（インターフェース）← インフラ層（実装）
```

これにより、ドメイン層はDynamoDBに依存せず、テストでモック実装に差し替え可能。

### 2. Result型での明示的エラー処理

AWS SDKの例外をキャッチしてResult型に変換。例外を投げず、戻り値で成功/失敗を表現。

```typescript
return { success: true, data: entity }; // 成功
return { success: false, error: new Error() }; // 失敗
```

### 3. アグリゲートパターン

DDDのアグリゲートパターンに従い、**アグリゲートルートのリポジトリが子エンティティも含めて管理**。

**原則:**

- アグリゲートルートのリポジトリのみ公開
- 子エンティティ専用のリポジトリは作らない
- リポジトリに子エンティティを操作するメソッドは作らない。集約として操作する（例: 子エンティティもsaveで更新すること）
- アグリゲート全体を単一トランザクションで保存
- 整合性境界を明確に保つ

**実装例: TODOアグリゲート**

```
TODO (アグリゲートルート)
├── Attachment (子エンティティ)
└── ...
```

- `TodoRepository`: TODOとAttachmentの両方を管理
- `AttachmentRepository`: **存在しない**（専用リポジトリは作らない）

**データベーススキーマ:**

複数テーブルに分散して格納しつつ、トランザクションで整合性を保証：

- `Todos` テーブル: TODOのメイン情報
- `Attachments` テーブル: 添付ファイル情報（todoIdでクエリ可能）

**保存処理:**

TransactionWriteで複数テーブルを同時更新し、ATOMIC性を保証。

**子エンティティのReplace戦略:**

アグリゲートを保存する際、子エンティティは**Replace戦略**を採用：

1. 既存の子エンティティを取得
2. 新しい子エンティティに含まれていない既存エンティティを削除
3. 新しい子エンティティを全て挿入（DynamoDBのPutは上書き）
4. すべての操作を単一トランザクションで実行

この戦略により、子エンティティの追加・更新・削除を統一的に扱える。

**DynamoDB制約への対応:**

DynamoDBのTransactWriteItemsでは、同じキーに対して複数の操作（DeleteとPutなど）を同一トランザクション内で行うことができません。そのため、削除対象から新しいエンティティに含まれるものを除外し、Putによる上書きのみを行います。

**実装例:**

```typescript
async save(props: { todo: Todo }): Promise<SaveResult> {
  // 1. 既存のattachmentsを取得
  const existingAttachmentsResult = await this.#ddbDoc.send(
    new QueryCommand({
      TableName: this.#attachmentsTableName,
      KeyConditionExpression: "todoId = :todoId",
      ExpressionAttributeValues: { ":todoId": props.todo.id },
    }),
  );

  // 2. Todosテーブルへの操作
  const todoOperation = {
    Put: { TableName: todosTable, Item: todoItem },
  };

  // 3. 新しいattachmentsのIDセット
  const newAttachmentIds = new Set(props.todo.attachments.map((att) => att.id));

  // 4. 既存のattachmentsのうち、新しいattachmentsに含まれていないものを削除
  const deleteAttachmentOperations = (existingAttachmentsResult.Items ?? [])
    .map((item) => attachmentTableItemSchema.parse(item))
    .filter((item) => !newAttachmentIds.has(item.attachmentId))
    .map((item) => ({
      Delete: {
        TableName: attachmentsTable,
        Key: { todoId: item.todoId, attachmentId: item.attachmentId },
      },
    }));

  // 5. 新しいattachmentsを挿入する操作（Putは上書き）
  const putAttachmentOperations = props.todo.attachments.map((att) => ({
    Put: { TableName: attachmentsTable, Item: attachmentItem },
  }));

  // 6. すべての操作をトランザクションで実行
  const operations = [
    todoOperation,
    ...deleteAttachmentOperations,
    ...putAttachmentOperations,
  ];

  await ddbDoc.send(new TransactWriteCommand({ TransactItems: operations }));
}
```

**Replace戦略の利点:**

- 実装がシンプル：追加・更新・削除の判別が不要
- 整合性が保証される：常に最新の状態がDBに反映される
- トランザクション境界が明確

**注意点:**

- 子エンティティが多い場合はTransactWriteItemsの100操作制限に注意
- 既存データの取得が必要（1回の追加クエリ）
- パフォーマンスより整合性を優先する設計

**取得処理:**

複数テーブルから読み込んでアグリゲート全体を構築：

```typescript
// Todosテーブルから取得
const todoResult = await ddbDoc.send(new GetCommand(...));

// Attachmentsテーブルから取得（todoIdでクエリ）
const attachmentsResult = await ddbDoc.send(new QueryCommand(...));

// アグリゲート全体を復元
const todo = new Todo({ ...todoItem, attachments });
```

**アグリゲート境界の判断基準:**

アグリゲートとして扱うべき条件：

- ライフサイクルが同じ（親が削除されたら子も削除）
- 整合性が必要（常に一貫した状態を保つ）
- 同時更新が多い
- ビジネスルールで密結合

別のアグリゲートとして扱うべき条件：

- 独立したライフサイクル
- 参照関係のみ
- 別のビジネスコンテキスト

**制約:**

- DynamoDBのTransactWriteItemsは最大100操作まで
- 子エンティティが多い場合は設計を見直す

### 4. Unit of Work統合

トランザクション対応のため、Unit of Workパターンを実装。

- コンストラクタで `uow?: DynamoDBUnitOfWork` を受け取る
- 保存・削除時に `uow` があればトランザクションアイテムとして追加
- `uow` がなければ即座に実行

## リポジトリ実装パターン

### 基本構造

**必須の依存:**

- `DynamoDBDocumentClient` - DynamoDB操作クライアント
- テーブル名（環境変数から注入）
- `Logger` - ロギング
- `uow?: DynamoDBUnitOfWork` - Unit of Work（オプション）

**スキーマ定義:**

- Zodスキーマで型定義（`{entity}DdbItemSchema`）
- 変換関数で相互変換（`{entity}DdbItemFrom{Entity}`, `{entity}DdbItemTo{Entity}`）

### DI設定

**サービスID命名規則:** `{ENTITY}_REPOSITORY`

**登録パターン:**

1. `service-id.ts` にサービスID追加
2. `register-lambda-container.ts` にバインディング追加
3. DynamoDBクライアント、テーブル名、Loggerを注入
4. Singleton スコープで登録

## テーブル設計方針

DDDの集約に則り、エンティティごとに正規化されたテーブルを使用。

**原則:**

- 各エンティティごとに専用テーブル
- リポジトリが複数テーブルを集約
- 正規化されたスキーマ設計
- トランザクション境界を明確に

**キー設計:**

- `PK` (Partition Key): エンティティの一意識別子
- `SK` (Sort Key): 子エンティティの識別子（アグリゲートの場合）

**GSI（Global Secondary Index）:**

検索要件に応じて定義（例: ステータスによる検索）。

**注意:** GSIは結果整合性のため、強い整合性が必要な場合は使用不可。

### ⚠️ DynamoDB GSI制約への対応

**制約:** DynamoDBのGSIキー属性に**空文字列（`""`）を含めることはできません**。

**対応パターン:**

リポジトリ層の変換関数（`{entity}DdbItemFrom{Entity}`）でGSIキー属性の空文字列を防御的に処理：

```typescript
export const entityDdbItemFromEntity = (entity: Entity): EntityDdbItem => {
  // 任意のGSIキー属性: 空文字列をundefinedに変換
  const optionalGsiKey =
    entity.field === undefined || entity.field === null || entity.field === ""
      ? undefined
      : entity.field;

  // 必須のGSIキー属性: 空文字列の場合はエラー
  const requiredGsiKey =
    entity.field === undefined || entity.field === null || entity.field === ""
      ? undefined
      : entity.field;
  if (requiredGsiKey === undefined) {
    throw new UnexpectedError("フィールド名は必須です");
  }

  return { ...entity, optionalGsiKey, requiredGsiKey };
};
```

**設計原則:**

- **インフラ層の責務**: DynamoDB固有の技術的制約を処理（最終防御）
- **ハンドラ層の責務**: 入力の正規化とサニタイズ（早期検出）
- **多層防御**: 両方の層で対応することで堅牢性を確保

**参考:**

- ハンドラ層での対応: `../../handler/README.md`
- GSIキーを持つ属性の確認方法: Terraformのテーブル定義参照

## テスト方針

### リポジトリのテストケース

リポジトリの全メソッドに対して、以下のテストケースを必ず追記すること：

**基本的なテストケース:**

1. **正常系**: 各メソッドの基本的な動作を確認
2. **子エンティティを含む正常系**: アグリゲートの場合、子エンティティ（例: 添付ファイル）を含むケースを確認
3. **異常系**: エラーハンドリングの確認（該当する場合）

**重要性:**

リポジトリ実装の変更（例: テーブル構造の変更）によって、既存の機能が意図せず壊れることを防ぐため、すべてのメソッドに対してテストケースを追記することが重要。

**テストファイル命名規則:**

- `{entity}-repository.medium.test.ts` - DynamoDB統合テスト

**例: TodoRepositoryのテストケース**

```typescript
describe("TodoRepositoryImpl", () => {
  describe("findById", () => {
    test("[正常系] 存在するTodoをIDで取得する", ...);
    test("[正常系] 添付ファイル付きTodoをIDで取得する", ...);
    test("[正常系] 存在しないTodoを検索するとundefinedを返す", ...);
  });

  describe("findAll", () => {
    test("[正常系] 全てのTodoを取得する", ...);
    test("[正常系] 添付ファイル付きTodoを含む全件取得", ...);
    test("[正常系] Todoが存在しない場合、空配列を返す", ...);
  });

  // 他のメソッドも同様にテストケースを追記
});
```

## 参考

- ドメイン層のインターフェース定義: `../../domain/model/{entity}/{entity}-repository.ts`
- Unit of Work: `../unit-of-work/README.md`
- DI設定: `../../di-container/README.md`
