# FetchNow: 現在時刻取得インターフェース

## 核心原則

FetchNowは**現在時刻を取得する関数型インターフェース**であり、**テスト可能性**と**時刻制御**を実現する。

**関連ドキュメント**: `../port/10-port-overview.md`

## 責務

### 実施すること

1. **現在時刻の抽象化**: `Date`オブジェクトを返すシンプルな関数型
2. **テスト時の時刻制御**: Dummy実装で固定時刻を返す
3. **依存性注入**: UseCaseやドメインサービスに注入して使用

### 実施しないこと

1. **複雑なロジック**: FetchNowは単純に`Date`を返すのみ
2. **タイムゾーン変換**: UseCase層やドメイン層で実施
3. **日時フォーマット**: 必要に応じて呼び出し側で実施

## 型定義

```typescript
/**
 * 現在時刻を取得する関数の型
 */
export type FetchNow = () => Date;
```

## 実装パターン

### 本番環境での実装

```typescript
// infrastructure/fetch-now/fetch-now-impl.ts
import type { FetchNow } from "@/application/port/fetch-now";

/**
 * 本番環境用のFetchNow実装
 */
export const fetchNowImpl: FetchNow = () => new Date();
```

### テスト用のDummy実装

```typescript
// application/port/fetch-now/dummy.ts
import type { FetchNow } from "@/application/port/fetch-now";

/**
 * テスト用の固定日時を返すFetchNow実装を生成する
 *
 * @param fixedDate 固定する日時（デフォルト: 2024-01-01T00:00:00+09:00）
 * @returns 固定日時を返すFetchNow実装
 */
export const buildFetchNowDummy =
  (fixedDate: Date = new Date("2024-01-01T00:00:00+09:00")): FetchNow =>
  () =>
    fixedDate;
```

## 使用例

### UseCase層での使用

```typescript
export type CreateTodoUseCaseProps = {
  todoRepository: TodoRepository;
  fetchNow: FetchNow; // 依存性注入
};

export class CreateTodoUseCase
  implements UseCase<CreateTodoInput, CreateTodoOutput>
{
  readonly #todoRepository: TodoRepository;
  readonly #fetchNow: FetchNow;

  constructor(props: CreateTodoUseCaseProps) {
    this.#todoRepository = props.todoRepository;
    this.#fetchNow = props.fetchNow;
  }

  async execute(input: CreateTodoInput): Promise<CreateTodoOutput> {
    const now = this.#fetchNow().toISOString(); // 現在時刻取得

    const todo = new Todo({
      id: this.#todoRepository.todoId(),
      title: input.title,
      status: TodoStatus.todo(),
      createdAt: now,
      updatedAt: now,
    });

    return this.#todoRepository.save({ todo });
  }
}
```

### DI設定（本番環境）

```typescript
// register-lambda-container.ts
import { fetchNowImpl } from "@/infrastructure/fetch-now/fetch-now-impl";

container.bind<FetchNow>(FETCH_NOW).toConstantValue(fetchNowImpl);
```

### テストでの使用

```typescript
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";

describe("CreateTodoUseCase", () => {
  test("TODOを作成できる", async () => {
    // Arrange: 固定時刻を設定
    const fixedDate = new Date("2024-06-15T12:00:00+09:00");
    const fetchNow = buildFetchNowDummy(fixedDate);

    const useCase = new CreateTodoUseCase({
      todoRepository: new TodoRepositoryDummy(),
      fetchNow,
    });

    // Act
    const result = await useCase.execute({ title: "新しいタスク" });

    // Assert: 固定時刻が使われている
    expect(result.data?.createdAt).toBe("2024-06-15T03:00:00.000Z"); // UTC変換後
  });
});
```

## Do / Don't

### ✅ Good

```typescript
// 依存性注入で使用
export type UseCaseProps = {
  fetchNow: FetchNow;
};

// 現在時刻取得
const now = this.#fetchNow().toISOString();

// テストで固定時刻
const fetchNow = buildFetchNowDummy(new Date("2024-01-01"));
```

### ❌ Bad

```typescript
// 直接new Date()を使用（テスト不可能）
const now = new Date().toISOString(); // ❌ テストで時刻制御できない

// FetchNowをグローバル変数として使用
export const fetchNow: FetchNow = () => new Date(); // ❌ DI原則違反

// 複雑なロジックをFetchNowに含める
export const fetchNow: FetchNow = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0); // ❌ FetchNowは単純に現在時刻を返すのみ
  return date;
};
```

## buildFetchNowDummyの設計思想

### 固定日時のデフォルト値

```typescript
buildFetchNowDummy();
// → 2024-01-01T00:00:00+09:00（日本標準時の年始）
```

**理由**:

1. **決定論的テスト**: 引数なしで呼び出しても一貫した結果
2. **タイムゾーン明示**: `+09:00`で日本時間を明示
3. **わかりやすい基準日**: 年始の00:00:00は基準として理解しやすい

### カスタム日時の指定

```typescript
// 特定の日時でテストしたい場合
const fetchNow = buildFetchNowDummy(new Date("2024-06-15T14:30:00+09:00"));
```
