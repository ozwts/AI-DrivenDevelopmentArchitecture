# AI駆動開発プロジェクト

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

詳細: `guardrails/constitution/index.md`

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

## ワークフロー

新機能実装の手順: `.claude/hooks/workflow-init.sh` を参照

**概要:**

1. Goal登録
2. 実装範囲の確認（契約のみ / ポリシーまで / フロントエンドまで / 最後まで）
3. 深掘りインタビュー（Actor / Want / Because / Acceptance / Constraints）
4. 要件登録 → タスク計画 → タスク登録 → タスク実行

## コンテキスト復元

compacting等で情報が失われた場合:

```
mcp__guardrails__procedure_context
```
