# Logger：概要

> **Note:** Loggerのポリシーは横のガードレール（非機能・アーキテクチャ制約）として再編成されました。

## 横のガードレール（静的解析）

以下のポリシーは静的解析で検証されます。

| ファイル | 検証内容 |
|---------|---------|
| [`no-console-log.ts`](../../horizontal/web/logger/no-console-log.ts) | console.logの直接使用禁止 |
| [`no-ui-logging.ts`](../../horizontal/web/logger/no-ui-logging.ts) | UIコンポーネント層でのログ出力禁止 |

## 横のガードレール（セマンティックレビュー）

以下のポリシーはAI/人間によるレビューで検証されます。

| ファイル | 検証内容 |
|---------|---------|
| [`logger-responsibility.md`](../../horizontal/web/logger/logger-responsibility.md) | Logger使用の責務（機密情報、構造化ログ、ログレベル） |

---

## 核心原則

Loggerは**可観測性を実現するための技術基盤**であり、**AIと人間がシステムの動作を理解できる状態**を維持する。

## 責務

### 実施すること

1. **構造化ログの出力**: メッセージ + 付加情報（key-value）
2. **ログレベルの使い分け**: debug, info, warn, error
3. **コンポーネント識別**: どのコンポーネントからのログか明示
4. **日本語でログメッセージを記述**: AIと人間が迅速に理解できる

### 実施しないこと

1. **機密情報の出力** → パスワード、トークン、個人情報は出力しない
2. **文字列連結によるログ** → 構造化データを使用
3. **console.logの直接使用** → Logger経由で出力
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

サーバー側Loggerと同じインターフェースを維持し、一貫性を確保する。

## ログレベルの使い分け

| レベル | 用途 | 例 |
|--------|------|-----|
| debug | 開発時のデバッグ情報（**積極的に記録**） | state変更、レンダリング |
| info | 正常系の重要イベント | フォーム送信、API成功 |
| warn | ユーザー操作に起因する想定内エラー | バリデーション失敗、認証失敗、404 |
| error | 開発者対応が必要なシステム異常 | ネットワーク障害、500エラー、予期せぬ例外 |

**詳細**: `11-log-level-strategy.md`

## レイヤー別責務

| レイヤー | ログ出力 | 内容 |
|---------|---------|------|
| Routes | ○ | ユーザー操作、ページ遷移 |
| Hooks (features) | ○ | ビジネスロジックの実行 |
| API Client (lib) | ○ | 通信の開始・成功・失敗 |
| Hooks (lib) | ○ | エラー発生時のみ（インフラ操作） |
| UI Components (lib) | × | **ログ出力しない** |
| Utils (lib) | × | **ログ出力しない**（純粋関数） |

## 使用例

### Routes層での使用

```typescript
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("ResetPasswordRoute");

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  logger.info("パスワードリセット開始", { email });

  try {
    await resetPassword(email);
    logger.info("確認コード送信成功", { email });
  } catch (error) {
    logger.error("確認コード送信失敗", error);
  }
};
```

### Hooks層での使用

```typescript
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("useProjects");

export function useProjects() {
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      logger.debug("プロジェクト一覧取得開始");
      const result = await api.projects.list();
      logger.info("プロジェクト一覧取得成功", { count: result.length });
      return result;
    },
  });
  return query;
}
```

### appendKeysの使用

```typescript
const logger = buildLogger("TodoList");
logger.appendKeys({ sessionId: "sess-123" });

logger.info("一覧取得開始");  // sessionIdが自動付与される
logger.info("一覧取得完了", { count: 10 });  // sessionIdが自動付与される
```

## 開発環境での出力

`vite-plugin-terminal` により、ブラウザの `console.*` がViteターミナルに転送される。

```
[web] [ResetPasswordRoute] パスワードリセット開始 { email: 'user@example.com' }
[web] [ResetPasswordRoute] 確認コード送信成功 { email: 'user@example.com' }
```

## Do / Don't

### ✅ Do

```typescript
// 構造化ログ（日本語）
logger.info("ユーザー登録完了", { userId: user.id });

// エラーオブジェクトを渡す
logger.error("API呼び出し失敗", error);

// DEBUGログを積極的に記録
logger.debug("state更新", { prevState, nextState });

// 適切なログレベル
logger.info("フォーム送信", { formId });     // 正常系
logger.warn("リトライ実行", { attempt: 2 }); // 想定内エラー
logger.error("認証失敗", error);             // システム異常
```

### ❌ Don't

```typescript
// 文字列連結（NG）
logger.info(`ユーザー ${user.id} が登録されました`);

// console.log直接使用（NG）
console.log("処理開始");

// 機密情報の出力（NG）
logger.info("ログイン", { password: input.password });

// UIコンポーネントでのログ出力（NG）
function Button({ onClick }) {
  logger.debug("Buttonレンダリング"); // NG: lib/ui はログ出力しない
  return <button onClick={onClick} />;
}

// 英語でログ（NG）
logger.info("Form submitted", { formId }); // NG: 日本語で書く
```

## 関連ドキュメント

- `11-log-level-strategy.md`: ログレベル戦略
- `../../server/logger/10-logger-overview.md`: サーバー側Logger
- `../../../constitution/co-evolution/traceability-principles.md`: 追跡可能性原則
