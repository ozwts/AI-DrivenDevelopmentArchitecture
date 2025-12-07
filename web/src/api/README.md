# API クライアント

## ファイル構成

```
src/api/
├── api-client.ts      # APIクライアント（基盤 + 統合エントリポイント）
├── auth-handler.ts    # 認証処理（ヘッダー生成、401リダイレクト）
├── error-handler.ts   # エラーハンドリング
├── logger.ts          # ログ出力
├── endpoints/
│   ├── health.ts      # Health Check API
│   ├── todos.ts       # Todo API
│   ├── projects.ts    # Project API
│   ├── users.ts       # User API
│   └── attachments.ts # Attachment API
└── README.md
```

## 設計方針

### 責務分離

各モジュールは単一責任の原則に従い分離しています。

- **api-client.ts**: HTTP通信の基盤とエンドポイントの統合
- **auth-handler.ts**: 認証ヘッダー生成、401時のリダイレクト
- **error-handler.ts**: HTTPエラー、バリデーションエラーの処理
- **logger.ts**: 開発環境でのリクエスト/レスポンスログ
- **endpoints/**: ドメインごとのAPIエンドポイント定義

### エンドポイントの分離

エンドポイントはドメインごとにファイルを分割しています。

```typescript
// endpoints/todos.ts
export const createTodoEndpoints = (request, requestVoid) => ({
  getTodos: async (filters) => { ... },
  createTodo: async (data) => { ... },
  ...
});
```

新しいエンドポイントを追加する場合:

1. `endpoints/` に新しいファイルを作成
2. `api-client.ts` でインポートしてスプレッド

## なぜ自動生成クライアントを使わないのか

`src/generated/zod-schemas.ts` にはOpenAPIから自動生成されたZodiosクライアントが存在しますが、以下の理由から手動実装を採用しています。

### カスタマイズ要件

- **認証ヘッダーの動的追加**: Cognitoトークンを各リクエストに付与
- **401エラー時の自動リダイレクト**: 認証切れ時にログインページへ遷移
- **開発環境でのログ出力**: リクエスト/レスポンスの詳細をコンソールに出力
- **エラーハンドリング**: 統一されたエラーメッセージ形式

### スケーラビリティ

エンドポイント数が増えても手動実装で運用可能です。

- **追加コストが低い**: 1エンドポイントあたり3〜5行程度
- **Zodスキーマは自動生成**: 型定義・バリデーションは自動生成を活用
- **ドメインごとにファイル分割**: 見通しが良く並行開発しやすい

## 初期化

APIクライアントはアプリケーション起動時に一度だけ初期化します。

```typescript
// AuthInitializer.tsx
apiClient.initialize({ getAccessToken });
```

初期化前にAPIを呼び出すと明示的なエラーがスローされます。

## 型安全性

`src/generated/zod-schemas.ts` のZodスキーマを活用してランタイムバリデーションを行っています。

```typescript
const json: unknown = await response.json();
const result = schema.safeParse(json);
```

これにより、APIレスポンスの型安全性を保証しています。

## テスト戦略とDI

### なぜDIを採用しないのか

APIクライアントはモジュールレベルの状態を持つシンプルな設計を採用しています。DI（依存性注入）によるクライアント差し替えは行いません。

```typescript
// ❌ DIパターン（採用しない）
const Component = ({ apiClient }: { apiClient: ApiClient }) => { ... };

// ✅ 現在のパターン
import { apiClient } from "@/api/api-client";
const Component = () => { ... };
```

### モックサーバー方式

テスト時はMSW（Mock Service Worker）を使用してHTTPリクエストをインターセプトします。

```typescript
// src/utils/testing-utils/mock.ts
import { setupWorker, rest } from "msw";

export const TodosResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/todos"), (req, res, ctx) => {
    return res(
      ctx.json(todos satisfies TodosResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

export const startMockServer = async () => {
  const worker = setupWorker(...handlers);
  await worker.start();
  return worker;
};
```

Playwrightテストからハンドラーを動的に切り替えることも可能です：

```typescript
// window.mswを通じてハンドラーを切り替え
window.msw.setHandlers("EMPTY"); // 空データでテスト
window.msw.setHandlers("HAS_ALL"); // ダミーデータありでテスト
```

### モックサーバー方式のメリット

- **実際のHTTP通信をテスト**: ヘッダー、URLエンコーディングなどのバグを検出
- **リファクタリング耐性**: 内部実装を変えてもテストは壊れない
- **シンプルな設計を維持**: DIコンテナやインターフェース抽象化が不要
- **E2Eとの一貫性**: 単体テストからE2Eまで同じパターン

### 関連ファイル

- `src/utils/testing-utils/mock.ts`: MSWハンドラー定義とモックサーバー起動
- `src/utils/testing-utils/mock-data.ts`: テスト用ダミーデータ
