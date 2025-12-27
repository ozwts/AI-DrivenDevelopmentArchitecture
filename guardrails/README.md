# Guardrails - AI駆動開発の統治機構

AIの自律性と安全性を両立するMCPサーバー。三権分立でAIの行動を統治する。

## 核心原則

**AIが自律的に行動しながら、人間の意図から逸脱しない構造を作る。**

## 三権分立

| 権力 | 役割 | 実装 |
|-----|------|-----|
| **Constitution（憲法）** | 不変の原則を定義 | `constitution/` |
| **Policy（立法）** | 領域別のルールを制定 | `policy/` |
| **Review（司法）** | ポリシーに基づきコードを審査 | `review/` |
| **Procedure（行政）** | ポリシーに従い手順を実行 | `procedure/` |

## ディレクトリ構成

```
guardrails/
├── index.ts                # MCPサーバーエントリーポイント
├── constitution/           # 憲法（不変の原則）
│   ├── index.md
│   ├── user-first/         # ユーザー第一主義
│   ├── structural-discipline/  # 構造的規律
│   └── co-evolution/       # 共進化主義
├── policy/                 # 立法（領域別ルール）
│   ├── server/             # サーバーサイドポリシー
│   ├── web/                # フロントエンドポリシー
│   ├── contract/           # API契約ポリシー
│   ├── e2e/                # E2Eテストポリシー
│   └── infra/              # インフラポリシー
├── review/                 # 司法（コードレビュー）
│   ├── qualitative/        # 定性的レビュー
│   ├── static-analysis/    # 静的解析（型・lint）
│   └── unused-exports/     # 未使用export検出
└── procedure/              # 行政（手順実行）
    ├── dev/                # 開発サーバー管理
    ├── test/               # テスト実行
    ├── deploy/             # デプロイ実行
    ├── codegen/            # コード生成
    └── fix/                # 自動修正
```

## 憲法の3つの柱

| 柱 | 原則 |
|----|------|
| **ユーザー第一主義** | システムの都合ではなく、ユーザーの利便性を最大化する |
| **構造的規律** | コードの構造に規律を持ち、秩序を守り続ける |
| **共進化主義** | AIと人間、AIとAIが協調し、持続的に発展し続ける |

## MCPツール

### Review（司法）

ポリシーに基づくコードレビュー。`policy/`配下の`meta.json`から動的に登録。

```
review_server_domain_model    # ドメインモデルレビュー
review_server_use_case        # ユースケースレビュー
review_server_handler         # ハンドラレビュー
review_web_component          # コンポーネントレビュー
review_web_hooks              # フックレビュー
review_static_analysis        # 静的解析（型チェック・ESLint）
review_unused_exports         # 未使用export検出
...
```

### Procedure（行政）

ポリシーに従った手順実行。

```
procedure_dev_start           # 開発サーバー起動
procedure_dev_stop            # 開発サーバー停止
procedure_dev_status          # 状態確認
procedure_dev_logs            # ログ取得
procedure_test_server         # サーバーテスト実行
procedure_test_web            # Webテスト実行
procedure_test_e2e            # E2Eテスト実行
procedure_deploy_dev          # 開発環境デプロイ
...
```

## ポリシーの追加

新しいレビューポリシーを追加する場合：

1. `policy/{category}/{subdomain}/`にディレクトリを作成
2. `meta.json`を配置（label, description）
3. ポリシーファイル（`.md`）を配置
4. 自動的にMCPツールとして登録される

```json
// policy/server/new-domain/meta.json
{
  "label": "New Domain",
  "description": "新ドメインのポリシー"
}
```

## 設計思想

### なぜ三権分立か

AIが自律的に行動するには、明確なルールと審査機構が必要。

- **Constitution**: 人間が定めた不変の原則。AIはこれを変更できない。
- **Policy**: 原則に基づく具体的ルール。AIと人間が共同で進化させる。
- **Review**: ポリシー違反を検出。AIの行動を事後チェック。
- **Procedure**: ポリシーに従った安全な操作。AIが自律的に実行。

### なぜMCPか

MCPはAIとツールの標準インターフェース。

- ツールの発見・実行を統一
- 複数のAIエージェントが同じツールを使用可能
- 責務ごとにツールを分離し、権限を制御

## コマンド

```bash
# 開発モードで起動
npm run dev

# バリデーション
npm run validate

# フォーマット・lint修正
npm run fix
```
