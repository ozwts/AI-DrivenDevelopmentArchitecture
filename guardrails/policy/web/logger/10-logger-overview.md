# Logger: ログ出力基盤

## 核心原則

Loggerは**可観測性を実現するための技術基盤**であり、**AIと人間がシステムの動作を理解できる状態**を維持する。

**根拠となる憲法**:
- `observability-principles.md`: 動的可観測性の実現
- `technology-selection-principles.md`: 実績と支援が豊富な技術を優先

## 可観測性の積極的活用

### なぜ積極的にログを出力するのか

**AIの自己解決速度の最大化**:
- AIがログから問題を自律的に診断・解決できる
- エラーの原因特定から修正案提示までの時間を最小化
- 人間の介入なしに開発を継続できる

**人間によるシステム責任の担保**:
- システムの動作履歴が保持され、事後検証が可能
- 問題発生時の責任の所在を明確化

### ログ出力の方針

**積極的に出力すべき場面**:
- ユーザー操作（フォーム送信、ボタンクリック、ページ遷移）
- API通信（リクエスト開始、成功、失敗）
- 状態変化（認証状態、重要なstate更新）
- エラー発生（すべてのcatch節）

**出力しない場面**:
- 頻繁に発生するイベント（スクロール、マウス移動）
- 機密情報を含む場面（パスワード、トークン、個人情報）

## 責務

### 実施すること

1. **構造化ログの出力**: メッセージ + 付加情報（key-value）
2. **ログレベルの使い分け**: debug, info, warn, error
3. **コンポーネント識別**: どのコンポーネントからのログか明示

### 実施しないこと

1. **機密情報の出力**: パスワード、トークン、個人情報
2. **文字列連結によるログ**: 構造化データを使用
3. **console.logの直接使用**: Logger経由で出力

## 型定義

```typescript
export type AdditionalData = Error | Record<string, unknown>;

export type Logger = {
  debug(message: string, data?: AdditionalData): void;
  info(message: string, data?: AdditionalData): void;
  warn(message: string, data?: AdditionalData): void;
  error(message: string, data?: AdditionalData): void;
};
```

サーバー側Loggerと同じインターフェースを維持し、一貫性を確保する。

## ログレベルの使い分け

| レベル | 用途 | 例 |
|--------|------|-----|
| debug | 開発時のデバッグ情報 | state変更、レンダリング |
| info | ユーザー操作、正常系の処理 | フォーム送信、API成功 |
| warn | 潜在的な問題、非推奨の使用 | リトライ、フォールバック |
| error | エラー状態 | API失敗、バリデーションエラー |

## レイヤー別責務

| レイヤー | ログ出力 | 内容 |
|---------|---------|------|
| Routes | ○ | ユーザー操作、ページ遷移 |
| Hooks (features) | ○ | ビジネスロジックの実行 |
| API Client (lib) | ○ | 通信の開始・成功・失敗 |
| UI Components (lib) | × | ログ出力しない |
| Utils (lib) | × | ログ出力しない |

**根拠となる憲法**:
- `observability-principles.md`: レイヤー別責務

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

### API Client層での使用

```typescript
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("ApiClient");

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    logger.debug("APIリクエスト開始", { method: "GET", url });

    const response = await fetch(url);

    if (!response.ok) {
      logger.error("APIエラー", { status: response.status, url });
      throw new ApiError(response);
    }

    logger.debug("APIリクエスト成功", { method: "GET", url });
    return response.json();
  },
};
```

## 開発環境での出力

`vite-plugin-terminal` により、ブラウザの `console.*` がViteターミナルに転送される。

```
[web] [ResetPasswordRoute] パスワードリセット開始 { email: 'user@example.com' }
[web] [ResetPasswordRoute] 確認コード送信成功 { email: 'user@example.com' }
```

**技術選定根拠**:
- `technology-selection-principles.md`: 実績と支援が豊富な技術を優先
- 作者はViteコアチームメンバー、定期的にメンテナンス
- 本番ビルドで自動除去

## Do / Don't

### ✅ Do

```typescript
// 構造化ログ
logger.info("ユーザー登録完了", { userId: user.id });

// エラーオブジェクトを渡す
logger.error("API呼び出し失敗", error);

// 適切なログレベル
logger.debug("state更新", { prevState, nextState }); // 開発用
logger.info("フォーム送信", { formId });             // 正常系
logger.warn("リトライ実行", { attempt: 2 });         // 潜在問題
logger.error("認証失敗", error);                     // エラー
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
```

## 関連ドキュメント

- `10-lib-overview.md`: 技術基盤設計概要
- `../../server/logger/10-logger-overview.md`: サーバー側Logger
- `../../../constitution/observability-principles.md`: 可観測性原則
