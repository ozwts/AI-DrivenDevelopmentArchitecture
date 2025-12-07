# Server - バックエンド

Node.js + Hono + DynamoDBを使用したサーバーレスバックエンド。クリーンアーキテクチャとDDD原則に基づいて設計。

## 技術スタック

- **Runtime**: Node.js 22.x
- **Framework**: Hono 4 (軽量Webフレームワーク)
- **DI Container**: InversifyJS 6
- **Database**: AWS SDK v3 (DynamoDB DocumentClient)
- **Validation**: Zod 3
- **Testing**: Vitest 2
- **Build**: esbuild
- **Logger**: AWS Lambda Powertools Logger

## ディレクトリ構成

```
server/
├── src/
│   ├── domain/          # ドメイン層（外部依存なし）
│   │   └── model/       # エンティティとリポジトリインターフェース
│   │
│   ├── application/     # アプリケーション層
│   │   ├── use-case/    # ユースケース実装とテスト
│   │   └── port/        # Logger, FetchNowなどのインターフェース
│   │
│   ├── infrastructure/  # インフラストラクチャ層
│   │   ├── repository/  # DynamoDB実装とミディアムテスト
│   │   └── */           # Logger, FetchNowなどの実装
│   │
│   ├── handler/         # ハンドラー層
│   │   └── hono-handler/  # Honoハンドラとルーティング
│   │
│   ├── di-container/    # 依存性注入設定
│   ├── util/            # テストユーティリティなど
│   ├── generated/       # OpenAPI自動生成コード
│   │
│   ├── lambda-handler.ts        # Lambda エントリーポイント
│   └── standalone-handler.ts    # ローカル実行用
│
├── docker-compose.yml          # DynamoDB Local
├── esbuild.api.config.mjs     # Lambda ビルド設定
├── vitest.config.ts           # テスト設定
└── package.json
```

## 設計思想・実装ガイドライン

設計思想、実装パターン、テスト戦略については **Guardrails ポリシー** を参照してください：

- **ドメインモデル**: `guardrails/policy/server/domain-model/`
- **ユースケース**: `guardrails/policy/server/use-case/`
- **リポジトリ**: `guardrails/policy/server/repository/`
- **ハンドラー**: `guardrails/policy/server/handler/`
- **Port層（Logger, FetchNow等）**: `guardrails/policy/server/port/`
- **Unit of Work**: `guardrails/policy/server/unit-of-work/`
- **Logger**: `guardrails/policy/server/logger/`

## コマンド

### テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# 特定のテストファイルのみ
npx vitest run src/application/use-case/todo/list-todos.test.ts
```

**重要**: テスト実行前にDynamoDB Localを起動してください：

```bash
# DynamoDB Local起動
sudo docker compose up -d

# 起動確認
sudo docker ps | grep dynamodb
```

### バリデーション

```bash
# TypeScript + ESLint
npm run validate

# TypeScriptのみ
npm run validate:tsc

# ESLintのみ
npm run validate:lint
```

### ビルド

```bash
# TypeScriptビルド
npm run build

# Lambda関数ビルド（esbuild）
npm run api:build

# 出力: dist/lambda-handler.zip
```

### ローカル実行

```bash
# Standalone Hono サーバー起動
npm run start

# http://localhost:3000 でアクセス可能
```

### フォーマット

```bash
# すべて修正
npm run fix

# Prettier修正
npm run fix:format

# ESLint修正
npm run fix:lint
```

## トラブルシューティング

### DynamoDB Localが起動しない

```bash
# コンテナ停止・削除
sudo docker compose down

# 再起動
sudo docker compose up -d

# ログ確認
sudo docker compose logs
```

### テストが失敗する

```bash
# DynamoDB Localが起動しているか確認
sudo docker ps | grep dynamodb

# ポート8000が使用中か確認
lsof -i :8000

# テーブルが正しく作成されているか確認（AWS CLI必要）
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# TypeScript検証
npm run validate:tsc

# Lambda ビルド
npm run api:build
```

### Lambda デプロイ後にエラー

CloudWatch Logsを確認：

```bash
# AWS CLI で最新のログを確認
aws logs tail /aws/lambda/<function-name> --follow
```

## 参考資料

- [Hono](https://hono.dev/)
- [InversifyJS](https://inversify.io/)
- [DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
- [Vitest](https://vitest.dev/)
- [Zod](https://zod.dev/)
- [AWS Lambda Powertools](https://docs.powertools.aws.dev/lambda/typescript/latest/)
