# AI-Driven Development Architecture

AIと人間が協調して開発するためのリファレンスアーキテクチャ。

理念は [憲法（Constitution）](./guardrails/constitution/index.md) に、それを源泉とする具体的な規約は [ポリシー（Policy）](./guardrails/policy/) に定義されている。

## Claude Codeとの統合

本リポジトリは [Claude Code](https://claude.com/claude-code) での開発を前提としている。

```
Claude Code
    │
    ├─→ スラッシュコマンド（/sa, /fe, /review）
    │       │
    │       └─→ サブエージェント起動
    │               ├─→ server-architect: バックエンド実装
    │               ├─→ frontend-engineer: フロントエンド実装
    │               └─→ guardrails-reviewer: コードレビュー
    │
    └─→ MCP Server
            ├─→ guardrails: Review（呼び水）+ Procedure（テスト・デプロイ）
            ├─→ playwright: ブラウザ操作
            └─→ github: Issue/PR操作
```

### 構成要素

| 要素               | 場所                | 役割                                         |
| ------------------ | ------------------- | -------------------------------------------- |
| MCPサーバー        | `.mcp.json`         | ツール提供（guardrails, playwright, github） |
| スラッシュコマンド | `.claude/commands/` | サブエージェント起動のショートカット         |
| サブエージェント   | `.claude/agents/`   | 領域特化の実装・レビュー                     |

### MCPとサブエージェントの連携

1. **Review（呼び水）**: `review_*`ツールがサブエージェント起動を促すガイダンスを返す
2. **サブエージェント実行**: `guardrails-reviewer`がポリシーに基づきレビュー実行
3. **Procedure**: サブエージェントが`procedure_*`ツールでテスト・デプロイを実行

## 実行環境

3つの開発モードがあり、AWS接続の有無で使い分ける。

### モード1: フルモック（AWS不要）

```bash
npm run dev:mock    # Web + MSWモックAPI
npm run test        # サーバーテスト + Webテスト
npm run validate    # 静的解析
```

- APIはMSW（Mock Service Worker）がブラウザ内で応答
- サーバーのビジネスロジックはDynamoDB Localでテスト可能
- 認証はモック（ログイン不要）
- **AWSセッション不要**

### モード2: ローカルサーバー + ブランチ環境（AWS接続必要）

```bash
npm run deploy      # ブランチ専用のAWSリソースをデプロイ
npm run dev         # Server（localhost）+ Web（localhost）起動
npm run destroy     # ブランチ環境を削除
```

- デフォルトでブランチ環境に接続（dev/deploy/destroy全て）
- Web・Serverはローカルで実行
- DynamoDB・Cognito・S3などはブランチ専用のAWSリソースを使用
- ビジネスロジックの変更はデプロイ不要（ホットリロード）
- インフラ変更（テーブル追加、環境変数追加など）は再デプロイ必要
- E2Eテストはこのモードで実行
- **AWSセッション必要**

### モード3: フルクラウド（AWS接続必要）

```bash
npm run deploy          # ブランチ環境へデプロイ（デフォルト）
npm run deploy:shared   # 共有環境へデプロイ
```

- Server・Web・DB全てがAWS上で稼働
- ブランチ環境・共有環境どちらもデプロイ可能
- E2EテストはCI上で実行（将来実装予定）
- **AWSセッション必要**

### AWSセッションの取得

モード2・3を使用する場合、事前にセッションを取得する。

```bash
# セッション取得（12時間有効）
source devtools/get-aws-session-token.sh <profile> <MFA_ARN> <MFA_CODE>

# Claude Code起動（環境変数を引き継ぐ）
claude
```

**注意**: セッション取得後に新しいターミナルを開くと環境変数が失われる。同一ターミナルでClaude Codeを起動すること。

## 技術スタック

| ワークスペース | 技術                                | 役割           |
| -------------- | ----------------------------------- | -------------- |
| `web/`         | React, TanStack Query, Tailwind CSS | フロントエンド |
| `server/`      | Hono, Vitest                        | APIサーバー    |
| `infra/`       | Terraform, Trivy, TFLint            | インフラ       |
| `e2e/`         | Playwright                          | E2Eテスト      |
| `guardrails/`  | MCP Server                          | AI統治機構     |
| `contracts/`   | OpenAPI                             | API契約        |

## セットアップ

### 前提条件

- macOS
- Homebrew
- Docker Desktop
- VS Code + Claude Code拡張

### 1. [asdf](https://asdf-vm.com/)でツールをインストール

```bash
# asdfプラグイン追加
asdf plugin add nodejs
asdf plugin add terraform
asdf plugin add tflint
asdf plugin add trivy
asdf plugin add github-cli
asdf plugin add uv

# .tool-versionsに従ってインストール
asdf install
```

### 2. 依存関係をインストール

```bash
npm ci
```

### 3. DynamoDB Localを起動

```bash
cd server && docker compose up -d && cd ..
```

### 4. コード生成

```bash
npm run codegen
```

OpenAPIスキーマからAPIクライアント・型定義を生成する。サーバー起動前に必須。

### 5. 動作確認

```bash
# テスト実行
npm run test -w server

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:5173 にアクセス。

## コマンド

### 開発

```bash
npm run dev              # ローカルサーバー + Web（ブランチ環境に接続）
npm run dev:mock         # Web + MSWモックAPI
```

### バリデーション・テスト

```bash
npm run validate         # 型チェック・lint・スペルチェック
npm run fix              # 自動修正
npm run test             # server + webテスト
npm run codegen          # OpenAPIからコード生成
```

### デプロイ

```bash
npm run deploy           # ブランチ環境へデプロイ（デフォルト）
npm run deploy:api       # APIのみデプロイ
npm run deploy:web       # Webのみデプロイ
npm run destroy          # ブランチ環境を削除
npm run deploy:shared    # 共有環境へデプロイ
npm run destroy:shared   # 共有環境を削除
```

## ディレクトリ構成

```
├── contracts/         # API契約（OpenAPI）
├── server/            # APIサーバー
├── web/               # フロントエンド
├── infra/             # Terraform
├── e2e/               # E2Eテスト
├── guardrails/        # AI統治機構（MCP Server）
│   ├── constitution/  # 憲法（不変の原則）
│   ├── policy/        # 立法（領域別ルール）
│   ├── review/        # 司法（コードレビュー）
│   └── procedure/     # 行政（手順実行）
└── devtools/          # 開発ツール
```

## ワークスペース詳細

| ワークスペース | README                                         |
| -------------- | ---------------------------------------------- |
| server         | [server/README.md](./server/README.md)         |
| web            | [web/README.md](./web/README.md)               |
| infra          | [infra/README.md](./infra/README.md)           |
| e2e            | [e2e/README.md](./e2e/README.md)               |
| guardrails     | [guardrails/README.md](./guardrails/README.md) |

## AWS認証（デプロイ時）

```bash
# MFAトークン取得（12時間有効）
source devtools/get-aws-session-token.sh <profile> <MFA_ARN> <MFA_CODE>
```
