# Server - バックエンド

Node.js + Hono + DynamoDBを使用したサーバーレスバックエンド。クリーンアーキテクチャとDDD原則に基づいて設計。

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| Runtime | Node.js | 22.x |
| Framework | Hono | 4.x |
| DI Container | InversifyJS | 6.x |
| Database | AWS SDK v3 (DynamoDB) | 3.x |
| Validation | Zod | 3.x |
| Testing | Vitest | 4.x |
| Build | esbuild | 0.25.x |
| Logger | AWS Lambda Powertools | 2.x |

## ディレクトリ構成

```
server/
├── src/
│   ├── domain/              # ドメイン層（外部依存なし）
│   │   └── model/           # エンティティ・リポジトリIF
│   │
│   ├── application/         # アプリケーション層
│   │   ├── use-case/        # ユースケース実装
│   │   └── port/            # 外部IF（Logger, FetchNow等）
│   │
│   ├── infrastructure/      # インフラストラクチャ層
│   │   ├── repository/      # DynamoDB実装
│   │   ├── auth-client/     # Cognito実装
│   │   ├── storage-client/  # S3実装
│   │   ├── logger/          # Powertools実装
│   │   └── unit-of-work/    # トランザクション実装
│   │
│   ├── handler/             # ハンドラー層
│   │   └── hono-handler/    # Honoルーター・ハンドラ
│   │
│   ├── di-container/        # 依存性注入設定
│   ├── util/                # ユーティリティ
│   ├── generated/           # OpenAPI自動生成コード
│   │
│   └── handler/
│       ├── lambda-handler.ts       # Lambda エントリーポイント
│       └── local-handler.ts        # ローカル実行用
│
├── docker-compose.yml               # DynamoDB Local
├── esbuild.api.config.mjs          # Lambda ビルド設定
├── vitest.config.ts                # テスト設定
└── package.json
```

## 設計思想・実装ガイドライン

設計思想、実装パターン、テスト戦略については **Guardrails ポリシー** を参照：

| レイヤー | ポリシー | 概要 |
|---------|---------|------|
| ドメインモデル | `guardrails/policy/server/domain-model/` | Entity, VO, リポジトリIF |
| ユースケース | `guardrails/policy/server/use-case/` | ビジネスロジック, Result型 |
| リポジトリ | `guardrails/policy/server/repository/` | DynamoDB実装, 変換ロジック |
| ハンドラー | `guardrails/policy/server/handler/` | HTTP処理, バリデーション |
| Port層 | `guardrails/policy/server/port/` | 外部依存の抽象化 |
| Unit of Work | `guardrails/policy/server/unit-of-work/` | トランザクション境界 |
| Logger | `guardrails/policy/server/logger/` | ログ出力抽象化 |
| DIコンテナ | `guardrails/policy/server/di-container/` | 依存性解決 |

## コマンド

以下のコマンドは`server/`ディレクトリ内で実行する。

```bash
cd server
```

### 開発

```bash
# ローカルサーバー起動（ブランチ環境に接続）
npm run dev:branch

# ローカルサーバー起動（共有dev環境に接続）
npm run dev
```

### テスト

```bash
# 全テスト実行（DynamoDB Localが自動起動）
npm test

# ウォッチモード
npm run test:watch

# 特定ファイルのみ
npx vitest run src/application/use-case/todo/list-todos.test.ts
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
# Lambda関数ビルド（esbuild）
npm run api:build

# 出力: dist/lambda-handler.zip
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

## テスト戦略

| テスト種別 | 対象 | 実行方法 |
|-----------|------|----------|
| Smallテスト | Entity, VO, UseCase | モック依存、高速実行 |
| Mediumテスト | Repository | DynamoDB Local使用 |

```
*.small.test.ts  # Smallテスト（単体）
*.medium.test.ts # Mediumテスト（統合）
```

## DynamoDB Local

テスト実行時に自動で起動されるが、手動操作も可能：

```bash
# 起動
docker compose up -d

# 停止・削除
docker compose down

# ログ確認
docker compose logs
```

## トラブルシューティング

### テストが失敗する

```bash
# DynamoDB Localの状態確認
docker ps | grep dynamodb

# ポート8000が使用中か確認
lsof -i :8000

# コンテナ再起動
docker compose down && docker compose up -d
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# TypeScript検証
npm run validate:tsc
```

## 参考資料

- [Hono](https://hono.dev/)
- [InversifyJS](https://inversify.io/)
- [DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
- [Vitest](https://vitest.dev/)
- [Zod](https://zod.dev/)
- [AWS Lambda Powertools](https://docs.powertools.aws.dev/lambda/typescript/latest/)
