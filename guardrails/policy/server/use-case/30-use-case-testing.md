# ユースケーステスト戦略

## 核心原則

1. ユースケースは**Small Test（Dummy使用）で高速に検証**し、**Medium Test（実DB使用）でトランザクション動作を確認**する
2. **全テストでDummyファクトリを使用**し、モデル変更時のテスト修正負荷を最小化する

**関連ドキュメント**:

- **Entity Dummyファクトリ**: `../domain-model/52-entity-test-patterns.md`
- **Repository Dummy**: `domain/model/{entity}/{entity}-repository.dummy.ts`
- **FetchNow Dummy**: `../../fetch-now/10-fetch-now-overview.md`

## テストファイル構成

| テスト種別  | ファイル名パターン                          | 依存       | 実行速度 | 目的                     |
| ----------- | ------------------------------------------- | ---------- | -------- | ------------------------ |
| Small Test  | `{action}-{entity}-use-case.small.test.ts`  | Dummy実装  | 高速     | ビジネスロジック検証     |
| Medium Test | `{action}-{entity}-use-case.medium.test.ts` | 実DynamoDB | 低速     | トランザクション動作確認 |

## Small Test実装パターン

### 基本構造

```typescript
describe("{Action}{Entity}UseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);
  const nowString = dateToIsoString(now);

  describe("execute", () => {
    test("{アクション}が成功する", async () => {
      const useCase = new {Action}{Entity}UseCaseImpl({
        {entity}Repository: new {Entity}RepositoryDummy({
          saveReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({ /* input */ });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ /* expected output */ });
      }
    });

    test("リソースが存在しない場合NotFoundErrorを返す", async () => {
      const useCase = new {Action}{Entity}UseCaseImpl({
        {entity}Repository: new {Entity}RepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({ /* input */ });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });
  });
});
```

**特徴**:

- テストケースごとに新しいユースケースインスタンス生成
- Dummyリポジトリはコンストラクタで戻り値指定
- `beforeEach`不要（各テストで直接生成）

### Dummyリポジトリパターン

**重要**: DummyリポジトリはEntity Dummyファクトリを使用する。

```typescript
import { projectDummyFrom } from "./project.dummy";

export type ProjectRepositoryDummyProps = {
  projectIdReturnValue?: string;
  findByIdReturnValue?: FindByIdResult;
  findAllReturnValue?: FindAllResult;
  saveReturnValue?: SaveResult;
  removeReturnValue?: RemoveResult;
};

export class ProjectRepositoryDummy implements ProjectRepository {
  readonly #projectIdReturnValue: string;
  readonly #findByIdReturnValue: FindByIdResult;
  readonly #findAllReturnValue: FindAllResult;
  readonly #saveReturnValue: SaveResult;
  readonly #removeReturnValue: RemoveResult;

  constructor(props?: ProjectRepositoryDummyProps) {
    this.#projectIdReturnValue = props?.projectIdReturnValue ?? uuid();

    // ✅ Entity Dummyファクトリを使用
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(projectDummyFrom()); // ランダム値で生成

    this.#findAllReturnValue =
      props?.findAllReturnValue ??
      Result.ok([projectDummyFrom(), projectDummyFrom()]); // 複数のランダムエンティティ

    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  projectId(): string {
    return this.#projectIdReturnValue;
  }

  async findById(_props: { id: string }): Promise<FindByIdResult> {
    return this.#findByIdReturnValue;
  }

  async save(_props: { project: unknown }): Promise<SaveResult> {
    return this.#saveReturnValue;
  }
}
```

**設計原則**:

- **Entity Dummyファクトリを使用** - `projectDummyFrom()`でランダム値生成
- コンストラクタで戻り値を設定（セッターメソッドなし）
- テストケースごとに新しいDummyインスタンスを生成
- デフォルト値を提供（省略可能）

**Dummy実装の配置**: `domain/model/{entity}/{entity}-repository.dummy.ts`

## テストカバレッジ戦略

**参照**: `guardrails/constitution/validation-principles.md` - 第3階層：ビジネスルール

UseCase層のテストは**ビジネスルール検証**に焦点を当てる。型レベル検証（Handler層）・ドメインルール検証（Domain層）のテストは各層で実施済みのため、重複しない（MECE原則）。

### Small Testでカバーすべきケース

#### 1. 正常系

```typescript
test("正常なデータで{アクション}が成功する", async () => {
  const result = await useCase.execute({
    /* valid input */
  });

  expect(result.success).toBe(true);
});
```

#### 2. ビジネスルール違反

```typescript
test("権限がない場合ForbiddenErrorを返す", async () => {
  // リソースの所有者と異なるユーザーでアクセス
  dummyRepository.setFindByIdResult(Result.ok(projectOwnedByOtherUser));

  const result = await useCase.execute({ userSub: "different-user" });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(ForbiddenError);
  }
});
```

#### 3. リソース未検出

```typescript
test("リソースが存在しない場合NotFoundErrorを返す", async () => {
  dummyRepository.setFindByIdResult(Result.ok(undefined));

  const result = await useCase.execute({ id: "non-existent-id" });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(NotFoundError);
  }
});
```

#### 4. 重複エラー

```typescript
test("既に存在するリソースの場合ConflictErrorを返す", async () => {
  dummyRepository.setFindByEmailResult(Result.ok(existingUser));

  const result = await useCase.execute({ email: "existing@example.com" });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(ConflictError);
  }
});
```

#### 5. Value Objectバリデーションエラー（ドメインルール検証）

```typescript
test("不正なカラー値の場合ValidationErrorを返す", async () => {
  const result = await useCase.execute({
    color: "invalid-color",
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.message).toContain("カラー");
  }
});
```

**注**: このテストはValue Object（Domain層）のエラーがUseCase層で適切に伝播することを確認する。ドメインルール自体のテストはDomain層で実施済み（MECE原則）。

#### 6. リポジトリエラーの伝播

```typescript
test("保存に失敗した場合はUnexpectedErrorを返す", async () => {
  const useCase = new CreateProjectUseCaseImpl({
    projectRepository: new ProjectRepositoryDummy({
      saveReturnValue: Result.err(new UnexpectedError()),
    }),
    logger: new LoggerDummy(),
    fetchNow,
  });

  const result = await useCase.execute({
    name: "テストプロジェクト",
    color: "#FF5733",
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(UnexpectedError);
  }
});
```

#### 7. 境界値テスト

**注意**: 型レベルの境界値テスト（文字列長など）はHandler層でテスト済み。UseCase層では**ビジネスロジック固有の境界値**のみをテストする。

```typescript
test("最大添付ファイル数（ビジネスルール）でアップロード成功", async () => {
  const attachments = Array(10)
    .fill(null)
    .map(() => createDummyAttachment());

  const result = await useCase.execute({
    todoId: "todo-123",
    attachments, // ビジネスルール: 最大10ファイル
  });

  expect(result.success).toBe(true);
});

test("最大添付ファイル数を超える場合ValidationError", async () => {
  const attachments = Array(11)
    .fill(null)
    .map(() => createDummyAttachment());

  const result = await useCase.execute({
    todoId: "todo-123",
    attachments, // 11ファイル（制限超過）
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeInstanceOf(ValidationError);
  }
});
```

## Medium Test実装パターン

### 基本構造

```typescript
describe("{Action}{Entity}UseCase Medium Test", () => {
  let useCase: {Action}{Entity}UseCase;
  let repository: {Entity}Repository;
  let dynamoDBClient: DynamoDBClient;

  beforeAll(async () => {
    // DynamoDB接続初期化
    dynamoDBClient = new DynamoDBClient({ /* config */ });
    repository = new {Entity}RepositoryImpl({
      dynamoDBClient,
      tableName: TEST_TABLE_NAME,
    });
  });

  afterAll(async () => {
    await dynamoDBClient.destroy();
  });

  beforeEach(async () => {
    // テーブルのクリーンアップ
    await cleanupTable(dynamoDBClient, TEST_TABLE_NAME);

    useCase = new {Action}{Entity}UseCaseImpl({
      {entity}Repository: repository,
      logger: new ConsoleLogger(),
      fetchNow: () => new Date().toISOString(),
    });
  });

  describe("トランザクション", () => {
    test("複数操作が原子性を持つ", async () => {
      // トランザクションテストの実装
    });
  });
});
```

### Medium Testでカバーすべきケース

#### 1. トランザクションの原子性

```typescript
test("エラー時にロールバックされる", async () => {
  // 意図的にエラーを発生させる
  const result = await useCase.execute({
    /* invalid input */
  });

  expect(result.success).toBe(false);

  // データベースに変更が反映されていないことを確認
  const checkResult = await repository.findById({ id: "some-id" });
  expect(checkResult.data).toBeUndefined();
});
```

#### 2. 実際のDB制約

```typescript
test("DynamoDB制約違反の場合エラーを返す", async () => {
  // 実際のDB制約（ユニークキーなど）に違反する操作
  await repository.save(entity1);

  const result = await useCase.execute({
    /* duplicate key */
  });

  expect(result.success).toBe(false);
});
```

## テストヘルパーパターン

### Entity Dummyファクトリ（推奨）

**重要**: テスト専用ヘルパー関数は作らず、Entity Dummyファクトリを直接使用する。

```typescript
// ✅ Good: Entity Dummyファクトリを直接使用
import { projectDummyFrom } from "@/domain/model/project/project.dummy";

const project = projectDummyFrom({
  id: "test-project-id",
  name: "Test Project",
  // 他のフィールドはランダム値で生成される
});

// ❌ Bad: テスト専用ヘルパー関数を作成（保守コスト増）
export const createTestProject = (overrides?: Partial<Project>): Project => {
  return new Project({
    id: "test-project-id",
    name: "Test Project",
    color: "#FF5733", // 固定値
    // ... モデル変更時に修正が必要
  });
};
```

**理由**:

- Entity Dummyファクトリは既にランダム値生成機能を持つ
- テスト専用ヘルパーを作ると保守コストが倍増
- プロジェクト全体でDummyファクトリを統一使用する方が一貫性がある

### 時刻モック（buildFetchNowDummy使用）

**参照**: `../../fetch-now/10-fetch-now-overview.md`

```typescript
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";

// ✅ Good: buildFetchNowDummy使用
const fixedDate = new Date("2024-01-01T00:00:00+09:00");
const fetchNow = buildFetchNowDummy(fixedDate);

useCase = new CreateProjectUseCaseImpl({
  projectRepository: dummyRepository,
  logger,
  fetchNow, // 固定時刻
});

// ❌ Bad: インラインで関数作成（標準パターン不使用）
const fetchNow = () => new Date("2024-01-01T00:00:00.000Z");
```

## テスト実行戦略

### 実行コマンド

```bash
# Small Testのみ（高速、CI/CDで常時実行）
npm run test:small

# Medium Testのみ（低速、リリース前に実行）
npm run test:medium

# 全テスト実行
npm test
```

### CI/CDでの使い分け

| タイミング           | 実行テスト     | 理由               |
| -------------------- | -------------- | ------------------ |
| Pull Request作成時   | Small Test     | 高速フィードバック |
| mainブランチマージ時 | Small + Medium | 統合確認           |
| デプロイ前           | All Tests      | 完全な検証         |

## Do / Don't

### ✅ Good

```typescript
// ✅ Entity Dummyファクトリを使用
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";

const fixedDate = new Date("2024-01-01T00:00:00+09:00");
const fetchNow = buildFetchNowDummy(fixedDate);

// ✅ テストケースごとに新しいインスタンス生成
const useCase = new CreateProjectUseCaseImpl({
  projectRepository: new ProjectRepositoryDummy({
    saveReturnValue: Result.ok(undefined),
  }),
  logger: new LoggerDummy(),
  fetchNow,
});

// ✅ Result型を正しくチェック
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.name).toBe("Expected Name");
}

// ✅ DummyリポジトリでEntity Dummyファクトリを使用
const testProject = projectDummyFrom({ name: "Test Project" });
const repository = new ProjectRepositoryDummy({
  findByIdReturnValue: Result.ok(testProject),
});

// ✅ エラー型を明示的に検証
expect(result.error).toBeInstanceOf(NotFoundError);
expect(result.error.message).toContain("見つかりません");
```

### ❌ Bad

```typescript
// ❌ テスト専用ヘルパー関数を作成（保守コスト増）
const createTestProject = (overrides?: Partial<Project>) => {
  return new Project({
    /* ... 固定値 */
  });
};

// ✅ 代わりにEntity Dummyファクトリを使用
const project = projectDummyFrom({ name: "Test Project" });

// ❌ インラインで時刻モック作成
const fetchNow = () => new Date("2024-01-01");

// ✅ 代わりにbuildFetchNowDummy使用
const fetchNow = buildFetchNowDummy(new Date("2024-01-01"));

// ❌ 実DBを使用（Small Testで）
const useCase = new CreateProjectUseCaseImpl({
  projectRepository: new ProjectRepositoryImpl({ dynamoDBClient }), // ❌ 低速
});

// ❌ Result型をチェックせずdata参照
expect(result.data.name).toBe("Expected Name"); // ❌ errorの可能性

// ❌ beforeEachで共有インスタンス（独立性低下）
let useCase: CreateProjectUseCase;
beforeEach(() => {
  useCase = new CreateProjectUseCaseImpl({
    /* ... */
  }); // ❌ テスト間で状態共有のリスク
});

// ❌ セッターメソッドで戻り値変更（実装に存在しない）
dummyRepository.setFindByIdResult({
  /* ... */
}); // ❌ このパターンは使われていない

// ❌ エラー型を検証しない
expect(result.success).toBe(false); // ❌ どのエラーかわからない
```

## チェックリスト

### Small Test

```
[ ] Dummyリポジトリ使用
[ ] DummyリポジトリでEntity Dummyファクトリを使用
[ ] buildFetchNowDummyで時刻をモック
[ ] テスト専用ヘルパー関数を作らない（Dummyファクトリで十分）
[ ] 正常系テスト
[ ] ビジネスルール違反テスト（権限・状態遷移・ビジネス制約）
[ ] リソース未検出テスト
[ ] 重複エラーテスト
[ ] Value Object エラー伝播テスト（ドメインルール自体はDomain層でテスト済み）
[ ] リポジトリエラー伝播テスト
[ ] ビジネス固有の境界値テスト（型レベルの境界値はHandler層でテスト済み）
[ ] Result型の正しいチェック
[ ] 型レベルバリデーションテストを含めない（MECE原則違反）
```

### Medium Test

```
[ ] 実DynamoDB使用
[ ] テーブルクリーンアップ（beforeEach）
[ ] トランザクション原子性テスト
[ ] DB制約違反テスト
[ ] 接続解放（afterAll）
```
