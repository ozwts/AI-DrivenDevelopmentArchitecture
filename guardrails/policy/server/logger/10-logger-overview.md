# Logger: ログ出力インターフェース

## 核心原則

Loggerは**ログ出力の抽象インターフェース**であり、**技術非依存**かつ**構造化ログ**をサポートする。

## 責務

### 実施すること

1. **ログ出力の抽象化**: 技術非依存のログインターフェースを提供
2. **構造化ログのサポート**: 付加情報（AdditionalData）を受け取る
3. **ログレベルの定義**: debug, info, warn, error
4. **日本語でログメッセージを記述**: AIと人間が迅速に理解できる

### 実施しないこと

1. **ログ出力先の決定** → Infrastructure層で実施
2. **ログフォーマットの決定** → Infrastructure層で実施
3. **ビジネスロジック** → UseCase層で実施
4. **英語でのログメッセージ** → 日本語で記述する

**参照**: `observability-principles.md`（可観測性の理念・ベネフィット）

## 型定義

```typescript
export type AdditionalData = Error | Record<string, unknown>;

export type Logger = {
  debug(message: string, data?: AdditionalData): void;
  info(message: string, data?: AdditionalData): void;
  warn(message: string, data?: AdditionalData): void;
  error(message: string, data?: AdditionalData): void;
  appendKeys(params: Record<string, unknown>): void;
};
```

## ログレベルの使い分け

| レベル | 用途 | 例 |
|--------|------|-----|
| debug | 開発時のデバッグ情報（**積極的に記録**） | リポジトリ操作詳細、クエリ結果 |
| info | 正常系の重要イベント | ユースケース開始・完了、データ操作成功 |
| warn | クライアント操作に起因する想定内エラー | バリデーション失敗、リソース未存在、認可失敗 |
| error | 開発者対応が必要なシステム異常 | DB接続失敗、外部API障害、予期せぬ例外 |

**詳細**: `11-log-level-strategy.md`

## レイヤー別責務

| レイヤー | ログ出力 | 内容 |
|---------|---------|------|
| Handler | ○ | リクエスト受信、レスポンス送信、入力バリデーション |
| UseCase | ○ | ビジネスロジックの実行開始・完了・失敗 |
| Repository | ○ | データ操作の詳細（DEBUG中心） |
| Domain | × | **ログ出力しない**（純粋なビジネスルール） |

## 使用例

### UseCase層での使用

```typescript
export class DeleteTodoUseCase {
  readonly #logger: Logger;
  readonly #todoRepository: TodoRepository;

  constructor(props: { logger: Logger; todoRepository: TodoRepository }) {
    this.#logger = props.logger;
    this.#todoRepository = props.todoRepository;
  }

  async execute(input: DeleteTodoInput): Promise<DeleteTodoOutput> {
    this.#logger.info("Todo削除開始", { todoId: input.todoId });

    const result = await this.#todoRepository.delete({ id: input.todoId });

    if (!result.success) {
      this.#logger.warn("Todo削除失敗", { error: result.error.type });
      return result;
    }

    this.#logger.info("Todo削除完了", { todoId: input.todoId });
    return result;
  }
}
```

### appendKeysの使用

```typescript
// リクエストスコープで共通のキーを追加
logger.appendKeys({ requestId: "req-123", userId: "user-456" });

logger.info("処理開始");
// => { requestId: "req-123", userId: "user-456", message: "処理開始" }
```

## テストでの使用

テストでは**常にLoggerDummyを使用**する。

```typescript
const useCase = new CreateTodoUseCaseImpl({
  todoRepository: new TodoRepositoryDummy(),
  logger: new LoggerDummy(),
  fetchNow: buildFetchNowDummy(),
});
```

**デバッグ時のみ**一時的にLoggerImpl使用可（コミット前に戻すこと）。

## Dummy実装

```typescript
export class LoggerDummy implements Logger {
  debug(_message: string, _additionalData?: AdditionalData): void {}
  info(_message: string, _additionalData?: AdditionalData): void {}
  warn(_message: string, _additionalData?: AdditionalData): void {}
  error(_message: string, _additionalData?: AdditionalData): void {}
  appendKeys(_params: Record<string, unknown>): void {}
}
```

## Do / Don't

### ✅ Good

```typescript
// 構造化ログ（日本語）
logger.info("ユーザー作成", { userId: user.id, email: user.email });

// エラーオブジェクトを渡す
logger.error("処理失敗", error);

// appendKeysでコンテキスト追加
logger.appendKeys({ traceId: context.traceId });

// DEBUGログを積極的に記録
logger.debug("リポジトリ操作開始", { operation: "save", entity: "todo" });
```

### ❌ Bad

```typescript
// 文字列連結でログ
logger.info(`ユーザー作成: ${user.id}`); // ❌ 構造化されていない

// console.logの直接使用
console.log("処理開始"); // ❌ ロガー経由で出力すべき

// 英語でログ
logger.info("User created", { userId: user.id }); // ❌ 日本語で書く

// ドメイン層でログ出力
class TodoEntity {
  complete() {
    logger.info("完了"); // ❌ ドメイン層はログ出力しない
  }
}
```

## 関連ドキュメント

- `../port/10-port-overview.md`: Port層概要
- `11-log-level-strategy.md`: ログレベル戦略
- `../../web/logger/10-logger-overview.md`: Web側Logger
- `../../../constitution/observability-principles.md`: 可観測性原則
