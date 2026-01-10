# サーバーサイド実装ワークフロー

## 対象スコープ

- `server/src/` 配下のサーバーサイドコード

## 開発モード

```
mcp__guardrails__procedure_dev(action='start', mode='full')
```

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `contracts/business/` - ビジネス契約
- `server/src/domain/model/` - 既存ドメインモデル
- `guardrails/policy/server/` - サーバーポリシー

フロントエンドの実装が完了している場合、実装済みのAPI設計を尊重すること。

---

## ステップ 1: コード生成

```
mcp__guardrails__procedure_codegen(workspace='server')
```

---

## ステップ 2: 影響範囲の検証

```
mcp__guardrails__review_static_analysis(
  workspace='server',
  targetDirectories=['server/src/'],
  analysisType='type-check'
)
```

---

## ステップ 3: ドメインモデルの実装

**ポリシー:** `guardrails/policy/server/domain-model/`

**実装先:** `server/src/domain/model/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 4: DynamoDBスキーマの更新（必要な場合）

**実装先:**

- `server/src/util/testing-util/dynamodb.ts` - テスト用スキーマ
- `infra/terraform/modules/aws/db/tables.tf` - Terraform（同期必須）

---

## ステップ 5: リポジトリの実装

**ポリシー:** `guardrails/policy/server/repository/`

**実装先:**

- `server/src/domain/model/*/` - インターフェース
- `server/src/infrastructure/repository/` - 実装

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 6: ユースケースの実装

**ポリシー:** `guardrails/policy/server/use-case/`

**実装先:** `server/src/use-case/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 7: ハンドラとDIの実装

**ポリシー:**

- `guardrails/policy/server/handler/`
- `guardrails/policy/server/di-container/`

**実装先:**

- `server/src/handler/hono-handler/`
- `server/src/di-container/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 7b: Portの追加・修正（必要な場合）

**ポリシー:**

- `guardrails/policy/server/port/`
- `guardrails/policy/server/auth-client/`
- `guardrails/policy/server/storage-client/`
- `guardrails/policy/server/logger/`
- `guardrails/policy/server/fetch-now/`

**実装先:** `server/src/domain/support/`, `server/src/infrastructure/`

→ 修正内容に応じた観点でポリシーレビュー。ポリシーが存在しない新概念は、先にポリシーを起草し人間のレビューを受けること。

---

## ステップ 8: テストの実装

```
mcp__guardrails__procedure_test(target='server')
```

---

## ステップ 9: 最終検証

```
mcp__guardrails__review_static_analysis(workspace='server', targetDirectories=['server/src/'])
mcp__guardrails__review_unused_exports(workspace='server')
mcp__guardrails__procedure_fix(workspace='server')
mcp__guardrails__procedure_dev(action='start', mode='full')
```

今回実装した箇所に関わる全ての観点で定性レビューを実施する。
サブエージェントを使って並列実行可能。

---

## 契約変更が必要な場合

1. `contracts/api/` のOpenAPI仕様を修正
2. `contracts/business/` のビジネスルールを修正（必要な場合）
3. `mcp__guardrails__procedure_codegen(workspace='server')`
4. 影響箇所を修正して実装を継続

**フロントエンド実装済みの場合:**
契約変更はフロントエンドにも影響するため、**メインセッションに差し戻す**こと。

差し戻し時の手順:
1. 以下の引き継ぎ情報を報告:
   - 契約変更が必要な理由
   - 必要な変更内容（エンドポイント、スキーマなど）
   - 実装済み部分の概要（活用できる設計判断など）
2. メインセッションがブランチを破棄
3. メインセッションで契約修正とフロントエンド対応を調整後、再度サーバー実装を開始

---

## 完了条件

- コード生成完了
- 各レイヤー実装完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
