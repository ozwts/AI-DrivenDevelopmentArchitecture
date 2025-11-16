# Consultant TODO App - Reference Architecture

コンサルタント向けTODO管理アプリケーションのリファレンス実装です。クリーンアーキテクチャとDDDの原則に基づいて設計された、モダンなWebアプリケーションの学習用プロジェクトです。

## 📚 プロジェクト構成

このモノレポは3つのワークスペースで構成されています：

- **[web/](./web/README.md)** - フロントエンド (React + Vite + TailwindCSS)
- **[server/](./server/README.md)** - バックエンド (Node.js + Hono + DynamoDB)
- **[infra/](./infra/README.md)** - インフラストラクチャ (Terraform)

各ワークスペースの詳細は、上記のリンク先READMEを参照してください。

## アーキテクチャ概要

### システム構成

![インフラ構成図](./docs/02.%20インフラ構成図/infra.drawio.svg)

### 技術スタック

- **フロントエンド**: React 18, Vite, TailwindCSS, TanStack Query
- **バックエンド**: Node.js 22, Hono, DynamoDB, InversifyJS (DI)
- **API仕様**: OpenAPI 3.1 (型安全なAPI通信)
- **コード生成**: aspida (API Client), Zod schemas (validation)
- **インフラ**: AWS (Lambda, API Gateway, DynamoDB, CloudFront, S3)
- **IaC**: Terraform 1.11.3
- **テスト**: Vitest (server), Playwright (web schema tests)
- **モック**: MSW (Mock Service Worker)

## クイックスタート

### 前提条件

- WSL2 (Windows Subsystem for Linux)
- asdf (バージョン管理ツール)
- Docker (DynamoDB Local用)
- AWS CLI (デプロイ用)

詳細な環境構築手順: [開発環境構築.md](./docs/01.%20開発環境構築/開発環境構築.md)

### セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd hands-on

# asdfでツールをインストール
asdf plugin add nodejs
asdf plugin add terraform
asdf install

# 依存関係のインストール
npm ci

# DynamoDB Localの起動（サーバーテスト用）
cd server
sudo docker compose up -d
cd ..
```

### 開発開始

```bash
# フロントエンド開発（MSWモックサーバー使用）
npm run dev:local

# フロントエンド開発（AWS APIに接続）
npm run dev

# サーバーテスト実行
npm test

# コード生成（todo.openapi.yaml → 型定義・スキーマ）
npm run codegen

# バリデーション（全ワークスペース）
npm run validate
```

## 主要コマンド

### 開発

```bash
# フロントエンド開発サーバー（MSWモック）
npm run dev:local

# フロントエンド開発サーバー（AWS API）
npm run dev

# コード生成（OpenAPI → TypeScript型 + Zod + aspida）
npm run codegen
# - server: Zodスキーマ、TypeScript型定義
# - web: aspida APIクライアント、TypeScript型定義

# バリデーション（TypeScript + ESLint + cspell）
npm run validate

# フォーマット修正
npm run fix
```

### ビルド

```bash
# フロントエンドビルド
npm run client:build

# サーバービルド
npm run server:build
```

### テスト

```bash
# サーバーテスト実行
npm test
```

### デプロイ（開発環境）

**注意**: これらのコマンドは開発環境（dev）へのデプロイです。

```bash
# MFA認証トークン取得（デプロイ前に必要）
source devtools/get-aws-session-token.sh hands-on <MFA_ARN> <MFA_CODE>

# フルデプロイ（ビルド + Terraform apply）
npm run deploy

# API + DBデプロイ（Lambda、API Gateway、DynamoDB）
npm run deploy:api

# インフラ削除（注意: データも削除されます）
npm run destroy
```

## API仕様とコード生成

このプロジェクトはOpenAPI 3.1仕様書（`todo.openapi.yaml`）を**唯一の信頼できる情報源（Single Source of Truth）**として、型安全なAPI通信を実現しています。

### OpenAPIファースト開発

**仕様書**: `todo.openapi.yaml`

すべてのAPIエンドポイント、リクエスト/レスポンスの型定義を記述。

**利点**:

- フロントエンド/バックエンドで共通の型定義
- APIドキュメントの自動生成
- 型の不整合を防ぐ
- モック実装との一貫性

### コード生成フロー

```bash
npm run codegen
```

**生成されるファイル**:

1. **サーバー側**（`server/src/generated/`）

   - TypeScript型定義（`@types/index.ts`）
   - Zodバリデーションスキーマ（リクエスト検証）

2. **フロントエンド側**（`web/src/generated/`）
   - aspida APIクライアント（型安全なHTTPリクエスト）
   - TypeScript型定義

**開発フロー**:

```bash
# 1. OpenAPI仕様を更新
vim todo.openapi.yaml

# 2. コード生成実行
npm run codegen

# 3. 生成されたコードを使用
# - server: Zodスキーマでリクエストバリデーション
# - web: aspidaクライアントで型安全なAPI呼び出し

# 4. バリデーション
npm run validate
```

### 型安全性の保証

**サーバー側**（Hono + Zod）:

```typescript
// 自動生成されたZodスキーマを使用
import { schemas } from "@/generated/zod-schemas";

app.post("/todos", async (c) => {
  const body = await c.req.json();
  const result = schemas.CreateTodoRequest.safeParse(body);
  // OpenAPI仕様と一致しないリクエストは自動的にバリデーションエラー
});
```

**フロントエンド側**（aspida）:

```typescript
// 自動生成されたAPIクライアントを使用
import api from "@/api/client";

const todo = await api.todos.post({
  body: { title: "新規TODO" }, // 型安全: OpenAPI仕様と一致しない型はコンパイルエラー
});
```

**詳細**: CLAUDE.mdの「OpenAPI Code Generation」セクションを参照

## Claude Code サブエージェント

このプロジェクトはClaude Codeのサブエージェント機能を活用して開発効率を向上させています。

### `/fe` - Frontend Engineer Agent

フロントエンド実装専用エージェント（OpenAPI更新 → コード生成 → モック実装 → スキーマバリデーション → UI実装）

```bash
/fe TODOをプロジェクトごとに管理できる機能を追加してください
```

**実装範囲:** `web/src/` - React, MSWモック, Yupスキーマ, Tailwind CSS

詳細: [.claude/agents/frontend-engineer.md](./.claude/agents/frontend-engineer.md)

### `/sa` - Server Architect Agent

サーバーサイド実装専用エージェント（ドメイン → リポジトリ → ユースケース → ハンドラ → テスト）

```bash
/sa TODOをプロジェクトごとに管理できる機能を追加してください。フロントエンドの実装を参照してください
```

### `/rd` - Requirements Designer Agent

要件定義・設計専用エージェント を検討中。以下は素案
後工程（Server Architect Agent、Frontend Engineer Agent）に渡すためのドキュメントを作成する
git worktreeによりClaude Codeを並列実行することを念頭にドキュメントは機能カットで分割したい
https://qiita.com/yonaka15/items/9b0260de6dabaadf13d8

**実装範囲:** `server/src/` - Domain, UseCase, Infrastructure, Handler, DI, Tests

詳細: [.claude/agents/server-architect.md](./.claude/agents/server-architect.md)

### 使い分け

**フロントエンドのみ:**

```bash
/fe ステータスバッジの色を変更
```

**バックエンドのみ:**

```bash
/sa TODO削除時のバリデーション追加
```

**新機能の実装（推奨フロー）:**

```bash
# 1. フロントエンド先行開発（MSWモックで動作確認）
/fe プロジェクトごとにTODOを管理する機能を追加してください

# 動作確認: npm run dev:local でUIを確認

# 2. バックエンド実装（フロントエンドの仕様に合わせて）
/sa プロジェクトごとにTODOを管理する機能を追加してください。フロントエンドの実装を参考にしてください

# 3. API+DBデプロイ: npm run deploy:api でバックエンドとDBを開発環境にデプロイ

# 4. 統合確認: npm run dev でAWS APIと接続してローカルで動作確認

# 5. デプロイ: npm run deploy で開発環境にデプロイ
```

**推奨理由:**

- MSWモックで先にUIを完成させることで、仕様を早期に確定できる
- バックエンドは確定したUI仕様に合わせて実装するため手戻りが少ない
- フロントエンドエンジニアとバックエンドエンジニアが並行作業可能

## アーキテクチャパターン

### クリーンアーキテクチャ

4層に分離したアーキテクチャ:

1. **Domain層** - ビジネスロジック、エンティティ（外部依存なし）
2. **UseCase層** - アプリケーションロジック、ビジネスフロー
3. **Infrastructure層** - DynamoDB、ロギング、外部システム連携
4. **Handler層** - HTTP、リクエスト/レスポンス変換

詳細: [server/README.md](./server/README.md#アーキテクチャ)

### 主要パターン

- **依存性注入 (DI)**: InversifyJSによる疎結合
- **リポジトリパターン**: データアクセスの抽象化
- **Result型パターン**: 例外を使わない明示的エラーハンドリング
- **Propsパターン**: 将来の拡張性を考慮したパラメータ設計
- **イミュータブルエンティティ**: 不変性による安全性

## デプロイ（開発環境）

### 前提条件

1. **IAMユーザー作成**（AdministratorAccess権限）※ IAM Identity Centerを利用できる場合はアクセストークンを利用ください
2. **MFAデバイス設定**（IAMコンソールで設定）
3. **AWS CLI設定**

   ```bash
   aws configure --profile hands-on
   # Access Key ID, Secret Access Key, Region (ap-northeast-1) を設定
   ```

4. **Terraformバックエンド用S3バケット作成**（初回のみ）

   Terraformのstateファイルを保存するS3バケットを事前に作成する必要があります：

   **ステップ1: S3バケット作成**

   ```bash
   # 任意のバケット名を設定（グローバルでユニークな名前が必要）
   export TERRAFORM_STATE_BUCKET="your-terraform-state-bucket"

   # S3バケット作成（東京リージョン）
   aws s3 mb s3://${TERRAFORM_STATE_BUCKET} --region ap-northeast-1 --profile hands-on

   # バージョニング有効化（推奨）
   aws s3api put-bucket-versioning \
     --bucket ${TERRAFORM_STATE_BUCKET} \
     --versioning-configuration Status=Enabled \
     --region ap-northeast-1 \
     --profile hands-on
   ```

   **ステップ2: Terraform設定ファイル更新**

   `infra/terraform/environments/dev/providers.tf` のバケット名を更新：

   ```hcl
   backend "s3" {
     bucket = "your-terraform-state-bucket" # ← ここを作成したバケット名に変更
     key    = "terraform/dev.tfstate"
     region = "ap-northeast-1"
   }
   ```

### デプロイ手順

#### 1. MFA認証トークン取得（12時間有効）

```bash
# スクリプトに実行権限付与（初回のみ）
chmod +x devtools/get-aws-session-token.sh

# MFA認証トークン取得
source devtools/get-aws-session-token.sh hands-on <MFA_ARN> <MFA_CODE>
#      ^^^^^^ 重要: source コマンドを使用

# 例: source devtools/get-aws-session-token.sh hands-on arn:aws:iam::123456789012:mfa/hands-on-deployer 123456
```

**MFA ARN**: IAMコンソールの「セキュリティ認証情報」タブで確認

#### 2. 初回デプロイ実行

```bash
# フルデプロイ（ビルド + インフラデプロイ）
npm run deploy
```

デプロイ完了後、以下が表示されます：

```
Outputs:
api_endpoint = "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com"
cloudfront_url = "https://xxxxx.cloudfront.net"
cognito_user_pool_id = "ap-northeast-1_xxxxxxx"
cognito_app_client_id = "xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### 3. 設定ファイルの更新（初回のみ）

初回デプロイ後、Terraformの出力値を `web/src/config.dev.ts` に反映する必要があります：

```typescript
export const config: Config = {
  apiUrl: "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com", // api_endpoint の値
  mockedApi: false,
  auth: {
    userPoolId: "ap-northeast-1_xxxxxxx", // cognito_user_pool_id の値
    userPoolClientId: "xxxxxxxxxxxxxxxxxx", // cognito_app_client_id の値
    region: "ap-northeast-1",
  },
};
```

**注**: `web/src/config.ts` へのコピーはビルドスクリプトで自動的に行われます。

#### 4. フロントエンド再デプロイ

設定ファイル更新後、フロントエンドのみ再デプロイして設定を反映：

```bash
npm run deploy:web
```

**注**: `config.dev.ts`の変更はフロントエンドのみに影響するため、webのデプロイだけで十分です。

#### 5. 動作確認

CloudFront URLでアプリケーションにアクセス：

```
https://xxxxx.cloudfront.net
```

### トラブルシューティング

**MFA認証エラー**

```bash
# エラー: AccessDenied when calling GetSessionToken
```

→ MFAコード、MFA ARN、時刻同期を確認

**トークン期限切れ（12時間後）**

```bash
# エラー: The security token included in the request is expired
```

→ 再度MFA認証を実行

詳細: [infra/README.md](./infra/README.md#デプロイ手順)

## トラブルシューティング

### DynamoDB Localが起動しない

```bash
cd server
sudo docker compose down
sudo docker compose up -d
sudo docker ps | grep dynamodb
```

### テストが失敗する

```bash
# DynamoDB Localが起動しているか確認
sudo docker ps | grep dynamodb

# ポート8000が使用中か確認
lsof -i :8000
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# バリデーション実行
npm run validate
```

## ドキュメント

- [開発環境構築](./docs/01.%20開発環境構築/開発環境構築.md)
- [フロントエンド開発ガイド](./web/README.md)
- [サーバー開発ガイド](./server/README.md)
- [インフラ管理ガイド](./infra/README.md)
- [Frontend Engineer Agent](../.claude/agents/frontend-engineer.md)
- [Server Architect Agent](../.claude/agents/server-architect.md)

## 参考資料

- [クリーンアーキテクチャ](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [DDD (Domain-Driven Design)](https://en.wikipedia.org/wiki/Domain-driven_design)
- [AWS Lambda ベストプラクティス](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB ベストプラクティス](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## ライセンス

MIT
