# Logger: ログ出力インターフェース

## 核心原則

Loggerは**ログ出力の抽象インターフェース**であり、**技術非依存**かつ**構造化ログ**をサポートする。

**関連ドキュメント**: `../port/10-port-overview.md`

## 責務

### 実施すること

1. **ログ出力の抽象化**: 技術非依存のログインターフェースを提供
2. **構造化ログのサポート**: 付加情報（AdditionalData）を受け取る
3. **ログレベルの定義**: debug, info, warn, error

### 実施しないこと

1. **ログ出力先の決定** → Infrastructure層で実施
2. **ログフォーマットの決定** → Infrastructure層で実施
3. **ビジネスロジック** → UseCase層で実施

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

| レベル | 用途                                                   |
| ------ | ------------------------------------------------------ |
| debug  | デバッグのためのメッセージ                             |
| info   | ユーザアクション、システム操作                         |
| warn   | 将来的にエラーになる可能性（廃止警告、リソース不足等） |
| error  | すべてのエラー状態                                     |

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
      this.#logger.error("Todo削除失敗", result.error);
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
// 構造化ログ
logger.info("ユーザー作成", { userId: user.id, email: user.email });

// エラーオブジェクトを渡す
logger.error("処理失敗", error);

// appendKeysでコンテキスト追加
logger.appendKeys({ traceId: context.traceId });
```

### ❌ Bad

```typescript
// 文字列連結でログ
logger.info(`ユーザー作成: ${user.id}`); // ❌ 構造化されていない

// console.logの直接使用
console.log("処理開始"); // ❌ ロガー経由で出力すべき
```
