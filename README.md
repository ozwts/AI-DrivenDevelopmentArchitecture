# AI-Driven Development Architecture

AIと人間が協調して開発するためのリファレンスアーキテクチャ。

## 三権分立モデル

| 層                       | 役割                           | 参照先                         |
| ------------------------ | ------------------------------ | ------------------------------ |
| **Constitution（憲法）** | 不変の原則。AIは変更不可       | `guardrails/constitution/`     |
| **Policy（立法）**       | 領域別ルール。人のレビュー必須 | `guardrails/policy/`           |
| **Review（司法）**       | ポリシー違反を検出             | `mcp__guardrails__review_*`    |
| **Procedure（行政）**    | ポリシーに従い手順実行         | `mcp__guardrails__procedure_*` |

## 3つの柱（Constitution）

1. **ユーザー第一主義**: システムの都合ではなく、ユーザーの利便性を最大化する
2. **構造的規律**: コードの構造に規律を持ち、秩序を守り続ける
3. **共進化主義**: AIと人間、AIとAIが協調し、持続的に発展し続ける

詳細: [憲法（Constitution）](./guardrails/constitution/index.md)

## 契約

| 種類         | 内容                                     | 参照先                |
| ------------ | ---------------------------------------- | --------------------- |
| **Business** | ドメイン定義・シナリオ（ユビキタス言語） | `contracts/business/` |
| **API**      | OpenAPI仕様                              | `contracts/api/`      |

## ポリシー

| 種類         | 内容                     | 参照先                        |
| ------------ | ------------------------ | ----------------------------- |
| **Contract** | 契約定義ルール           | `guardrails/policy/contract/` |
| **Web**      | フロントエンド実装ルール | `guardrails/policy/web/`      |
| **Server**   | バックエンド実装ルール   | `guardrails/policy/server/`   |
| **Infra**    | インフラ実装ルール       | `guardrails/policy/infra/`    |
| **E2E**      | E2Eテストルール          | `guardrails/policy/e2e/`      |

## 実装の前提条件

**契約とポリシーの記載がない実装はしない。**

| 順序 | 成果物       | 説明                                                    |
| ---- | ------------ | ------------------------------------------------------- |
| 1    | Business契約 | `contracts/business/` にドメイン定義・シナリオを記載    |
| 2    | API契約      | `contracts/api/` にOpenAPI仕様を記載                    |
| 3    | ポリシー     | `guardrails/policy/` に実装ルールを記載（必要に応じて） |
| 4    | 実装         | 契約とポリシーに従ってコードを書く                      |

## Claude Codeとの統合

本リポジトリは [Claude Code](https://claude.com/claude-code) での開発を前提としている。

```
Claude Code
    │
    ├─→ サブエージェント（.claude/agents/）
    │       ├─→ guardrails-reviewer: ポリシー違反レビュー
    │       ├─→ violation-fixer: 違反修正
    │       ├─→ workflow-planner: タスク計画
    │       ├─→ designer: UIデザイン
    │       ├─→ e2e-test-planner: E2Eテスト計画
    │       ├─→ e2e-test-generator: E2Eテスト生成
    │       └─→ e2e-test-healer: E2Eテスト修復
    │
    └─→ MCP Server（.mcp.json）
            ├─→ guardrails: Review + Procedure（テスト・デプロイ・ワークフロー）
            ├─→ playwright: ブラウザ操作
            ├─→ playwright-test: E2Eテスト実行
            └─→ github: Issue/PR操作
```

### 構成要素

| 要素             | 場所              | 役割                     |
| ---------------- | ----------------- | ------------------------ |
| MCPサーバー      | `.mcp.json`       | ツール提供               |
| サブエージェント | `.claude/agents/` | 領域特化の実装・レビュー |

### MCPとサブエージェントの連携

1. **Review（呼び水）**: `review_*`ツールがサブエージェント起動を促すガイダンスを返す
2. **サブエージェント実行**: `guardrails-reviewer`がポリシーに基づきレビュー実行
3. **Procedure**: `procedure_*`ツールでテスト・デプロイ・ワークフロー管理を実行

### MCPツール構成

#### guardrails（自作MCP Server）

**Review（司法）**:

| ツール                         | 説明                                             |
| ------------------------------ | ------------------------------------------------ |
| `review_qualitative`           | ポリシー違反の定性的レビュー                     |
| `review_static_analysis`       | 静的解析（TypeScript型チェック、ESLint）         |
| `review_unused_exports`        | 未使用export検出（knip）                         |
| `review_infra_static_analysis` | インフラ静的解析（terraform fmt、TFLint、Trivy） |

**Procedure（行政）**:

| ツール                 | 説明                                        |
| ---------------------- | ------------------------------------------- |
| `procedure_dev`        | 開発サーバー管理（start/stop/status/logs）  |
| `procedure_test`       | テスト実行（server/web/e2e）                |
| `procedure_snapshot`   | スナップショット管理（update/refresh）      |
| `procedure_e2e_setup`  | E2Eセットアップ（Cognitoユーザー/ブラウザ） |
| `procedure_fix`        | 自動修正（ESLint/Prettier/knip）            |
| `procedure_codegen`    | コード生成（OpenAPIから型生成）             |
| `procedure_deploy_dev` | 開発環境デプロイ（diff/deploy/destroy）     |
| `procedure_workflow`   | ワークフロー管理（plan/set/done/list）      |
| `procedure_context`    | コンテキスト復元（compacting対策）          |

#### playwright

ブラウザ操作（snapshot/click/type/navigate等）

#### playwright-test

E2Eテスト実行・管理（test*list/test_run/test_debug/generator*_/planner\__）

#### github

Issue/PR操作（issue_read/create_pull_request/merge_pull_request等）

## ワークフロー

新機能実装の手順:

1. **Goal登録**: ユーザーの発言をそのままGoalとして記録
2. **実装範囲の確認**: 契約のみ / ポリシーまで / フロントエンドまで / 最後まで
3. **深掘りインタビュー**: Actor / Want / Because / Acceptance / Constraints を明確化
4. **要件登録** → **タスク計画** → **タスク登録** → **タスク実行**

詳細: `.claude/hooks/workflow-init.sh`

### 例: 機能追加の指示

```
プロジェクトに他のユーザーを招待し、共同でTodoを管理できる機能を追加したい
```

この指示から、AIが深掘りインタビューで要件を明確化し、Business契約→API契約→実装の順で開発を進める。

## アーキテクチャ図

![インフラ構成](./infra.drawio.svg)

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
- ブランチ環境のE2Eテストはローカルで実施し、共有環境はCI上で実行を想定
- **AWSセッション必要**

### AWSセッションの設定

モード2・3（バックエンド実装）を使用する場合、事前にAWSセッショントークンを環境変数にエクスポートしておくこと。

```bash
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_SESSION_TOKEN=xxx
```

**注意**: Claude Codeは起動時の環境変数を引き継ぐ。セッション設定後に同一ターミナルでClaude Codeを起動すること。

## 技術スタック

| ワークスペース | 技術                                | 役割                   |
| -------------- | ----------------------------------- | ---------------------- |
| `contracts/`   | OpenAPI, Markdown                   | Business契約 + API契約 |
| `web/`         | React, TanStack Query, Tailwind CSS | フロントエンド         |
| `server/`      | Hono, Vitest                        | APIサーバー            |
| `infra/`       | Terraform, Trivy, TFLint            | インフラ               |
| `e2e/`         | Playwright                          | E2Eテスト              |
| `guardrails/`  | MCP Server (TypeScript)             | AI統治機構             |

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
├── contracts/         # 契約
│   ├── business/      # Business契約（ユビキタス言語）
│   └── api/           # API契約（OpenAPI）
├── server/            # APIサーバー
├── web/               # フロントエンド
├── infra/             # Terraform
├── e2e/               # E2Eテスト
├── guardrails/        # AI統治機構（MCP Server）
│   ├── constitution/  # 憲法（不変の原則）
│   ├── policy/        # 立法（領域別ルール）
│   ├── review/        # 司法（コードレビュー）
│   └── procedure/     # 行政（手順実行）
└── .claude/           # Claude Code設定
    ├── agents/        # サブエージェント定義
    └── hooks/         # フック（初期化処理等）
```

## ワークスペース詳細

| ワークスペース | README                                         |
| -------------- | ---------------------------------------------- |
| server         | [server/README.md](./server/README.md)         |
| web            | [web/README.md](./web/README.md)               |
| infra          | [infra/README.md](./infra/README.md)           |
| e2e            | [e2e/README.md](./e2e/README.md)               |
| guardrails     | [guardrails/README.md](./guardrails/README.md) |
