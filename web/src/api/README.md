# API クライアント

## 概要

このディレクトリには手動で実装したAPIクライアントが含まれています。

## ファイル構成

```
src/api/
├── client.ts        # APIクライアント本体（HTTP通信）
├── auth-handler.ts  # 認証処理（ヘッダー生成、401リダイレクト）
├── error-handler.ts # エラーハンドリング
├── logger.ts        # ログ出力
└── README.md
```

各モジュールは単一責任の原則に従い、責務を分離しています。

## なぜ自動生成クライアントを使わないのか

`src/generated/zod-schemas.ts` にはOpenAPIから自動生成されたZodiosクライアント（`createApiClient`）が存在しますが、以下の理由から手動実装を採用しています。

### カスタマイズ要件

- **認証ヘッダーの動的追加**: Cognitoトークンを各リクエストに付与
- **401エラー時の自動リダイレクト**: 認証切れ時にログインページへ遷移
- **開発環境でのログ出力**: リクエスト/レスポンスの詳細をコンソールに出力
- **エラーハンドリング**: 統一されたエラーメッセージ形式

### スケーラビリティ

エンドポイント数が増えても手動実装で運用可能です。

- **追加コストが低い**: 1エンドポイントあたり3〜5行程度
- **Zodスキーマは自動生成**: 型定義・バリデーションは自動生成を活用
- **共通処理は`request`メソッドに集約**: 個別メソッドは薄いラッパーのみ

```typescript
// エンドポイント追加例（3行）
async getXxx(id: string): Promise<XxxResponse> {
  return this.request(`/xxx/${id}`, schemas.XxxResponse);
}
```

自動生成クライアントの主なメリットは「エンドポイント追加の自動化」ですが、上記の通り手動でも負担は小さく、カスタマイズ性とのトレードオフでは手動実装が優位です。

## 初期化

APIクライアントはシングルトンで、アプリケーション起動時に一度だけ初期化します。

```typescript
// AuthInitializer.tsx
apiClient.initialize({ getAccessToken });
```

初期化前にAPIを呼び出すと明示的なエラーがスローされます。

## 型安全性

自動生成クライアントは使用していませんが、`src/generated/zod-schemas.ts` のZodスキーマを活用してランタイムバリデーションを行っています。

```typescript
// レスポンスをZodでバリデーション
const json: unknown = await response.json();
const result = schema.safeParse(json);
```

これにより、APIレスポンスの型安全性を保証しています。
