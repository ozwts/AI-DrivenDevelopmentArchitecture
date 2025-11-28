# ユースケーステスト戦略

## 核心原則

ユースケースは**Small Test（Dummy使用）で高速に検証**し、**Medium Test（実DB使用）でトランザクション動作を確認**する。

## テストファイル構成

| テスト種別 | ファイル名パターン | 依存 | 実行速度 | 目的 |
|-----------|------------------|------|---------|------|
| Small Test | `{action}-{entity}-use-case.small.test.ts` | Dummy実装 | 高速 | ビジネスロジック検証 |
| Medium Test | `{action}-{entity}-use-case.medium.test.ts` | 実DynamoDB | 低速 | トランザクション動作確認 |

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
          saveReturnValue: {
            success: true,
            data: undefined,
          },
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
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
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

```typescript
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
    this.#findByIdReturnValue = props?.findByIdReturnValue ?? {
      success: true,
      data: projectDummyFrom(),
    };
    this.#findAllReturnValue = props?.findAllReturnValue ?? {
      success: true,
      data: [projectDummyFrom()],
    };
    this.#saveReturnValue = props?.saveReturnValue ?? {
      success: true,
      data: undefined,
    };
    this.#removeReturnValue = props?.removeReturnValue ?? {
      success: true,
      data: undefined,
    };
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

**重要**:
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
  const result = await useCase.execute({ /* valid input */ });

  expect(result.success).toBe(true);
});
```

#### 2. ビジネスルール違反

```typescript
test("権限がない場合ForbiddenErrorを返す", async () => {
  // リソースの所有者と異なるユーザーでアクセス
  dummyRepository.setFindByIdResult({
    success: true,
    data: projectOwnedByOtherUser,
  });

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
  dummyRepository.setFindByIdResult({
    success: true,
    data: undefined,
  });

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
  dummyRepository.setFindByEmailResult({
    success: true,
    data: existingUser,
  });

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
      saveReturnValue: {
        success: false,
        error: new UnexpectedError(),
      },
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
  const attachments = Array(10).fill(null).map(() => createDummyAttachment());

  const result = await useCase.execute({
    todoId: "todo-123",
    attachments,  // ビジネスルール: 最大10ファイル
  });

  expect(result.success).toBe(true);
});

test("最大添付ファイル数を超える場合ValidationError", async () => {
  const attachments = Array(11).fill(null).map(() => createDummyAttachment());

  const result = await useCase.execute({
    todoId: "todo-123",
    attachments,  // 11ファイル（制限超過）
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
  const result = await useCase.execute({ /* invalid input */ });

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

  const result = await useCase.execute({ /* duplicate key */ });

  expect(result.success).toBe(false);
});
```

## テストヘルパーパターン

### エンティティファクトリ

```typescript
// test-util/factory/
export const createTestProject = (overrides?: Partial<Project>): Project => {
  return Project.create({
    id: ProjectId.create("test-project-id"),
    name: "Test Project",
    color: Color.create("#FF5733"),
    userSub: "test-user-sub",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  });
};
```

### 時刻モック

```typescript
const mockFetchNow = () => "2024-01-01T00:00:00.000Z";

useCase = new CreateProjectUseCaseImpl({
  projectRepository: dummyRepository,
  logger,
  fetchNow: mockFetchNow,  // 固定時刻
});
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

| タイミング | 実行テスト | 理由 |
|-----------|----------|------|
| Pull Request作成時 | Small Test | 高速フィードバック |
| mainブランチマージ時 | Small + Medium | 統合確認 |
| デプロイ前 | All Tests | 完全な検証 |

## Do / Don't

### ✅ Good

```typescript
// テストケースごとに新しいインスタンス生成
const useCase = new CreateProjectUseCaseImpl({
  projectRepository: new ProjectRepositoryDummy({
    saveReturnValue: {
      success: true,
      data: undefined,
    },
  }),
  logger: new LoggerDummy(),
  fetchNow: buildFetchNowDummy(now),
});

// Result型を正しくチェック
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.name).toBe("Expected Name");
}

// コンストラクタで戻り値を指定
const repository = new ProjectRepositoryDummy({
  findByIdReturnValue: {
    success: true,
    data: testProject,
  },
});

// エラー型を明示的に検証
expect(result.error).toBeInstanceOf(NotFoundError);
expect(result.error.message).toContain("見つかりません");
```

### ❌ Bad

```typescript
// 実DBを使用（Small Testで）
const useCase = new CreateProjectUseCaseImpl({
  projectRepository: new ProjectRepositoryImpl({ dynamoDBClient }),  // ❌ 低速
});

// Result型をチェックせずdata参照
expect(result.data.name).toBe("Expected Name");  // ❌ errorの可能性

// beforeEachで共有インスタンス（独立性低下）
let useCase: CreateProjectUseCase;
beforeEach(() => {
  useCase = new CreateProjectUseCaseImpl({ /* ... */ });  // ❌ テスト間で状態共有のリスク
});

// セッターメソッドで戻り値変更（実装に存在しない）
dummyRepository.setFindByIdResult({ /* ... */ });  // ❌ このパターンは使われていない

// エラー型を検証しない
expect(result.success).toBe(false);  // ❌ どのエラーかわからない
```

## チェックリスト

### Small Test

```
[ ] Dummyリポジトリ使用
[ ] 正常系テスト
[ ] ビジネスルール違反テスト（権限・状態遷移・ビジネス制約）
[ ] リソース未検出テスト
[ ] 重複エラーテスト
[ ] Value Object エラー伝播テスト（ドメインルール自体はDomain層でテスト済み）
[ ] リポジトリエラー伝播テスト
[ ] ビジネス固有の境界値テスト（型レベルの境界値はHandler層でテスト済み）
[ ] Result型の正しいチェック
[ ] 時刻をモック（fetchNow）
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
