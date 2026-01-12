# サーバードメイン実装ワークフロー

ドメインモデル（Entity/Value Object）とポート（外部インターフェース定義）を実装する。

## 対象スコープ

- `server/src/domain/model/` - ドメインモデル
- `server/src/domain/support/` - ポートインターフェース

## 開発モード

```
mcp__guardrails__procedure_dev(action='start', mode='full')
```

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `contracts/business/` - ビジネス契約
- `contracts/api/` - API契約
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

**実装内容:**
- Entity（識別子を持つオブジェクト）
- Value Object（不変の値オブジェクト）
- リポジトリインターフェース（データ永続化の抽象）

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 4: ポートの実装

**ポリシー:**

- `guardrails/policy/server/port/`
- `guardrails/policy/server/auth-client/`
- `guardrails/policy/server/storage-client/`
- `guardrails/policy/server/logger/`
- `guardrails/policy/server/fetch-now/`

**実装先:** `server/src/domain/support/`

**実装内容:**
- 外部サービスへのインターフェース定義
- 認証クライアントインターフェース
- ストレージクライアントインターフェース
- ロガーインターフェース
- 時刻取得インターフェース

ポリシーが存在しない新概念は、先にポリシーを起草し人間のレビューを受けること。

**完了条件:** 静的解析パス、定性レビューパス（該当ポリシーを並列実行）、コミット

---

## ステップ 5: DynamoDBスキーマの更新（必要な場合）

**実装先:**

- `server/src/util/testing-util/dynamodb.ts` - テスト用スキーマ
- `infra/terraform/modules/aws/db/tables.tf` - Terraform（同期必須）

**完了条件:** インフラ静的解析パス、コミット

---

## ステップ 6: ドメインモデルのテスト

**ポリシー:**

- `guardrails/policy/server/domain-model/50-test-overview.md`
- `guardrails/policy/server/domain-model/51-value-object-test-patterns.md`
- `guardrails/policy/server/domain-model/52-entity-test-patterns.md`

**実装先:** `server/src/domain/model/**/*.test.ts`

**テスト実行:**

```
mcp__guardrails__procedure_test(target='server', file='server/src/domain/model/')
```

**完了条件:** 静的解析パス、定性レビューパス、テスト成功、コミット

---

## ステップ 7: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. Server/Implementフェーズへの影響（リポジトリ実装の複雑性など）
2. インフラ変更の必要性（テーブル追加、GSI追加など）
3. 追加で必要になったタスク
4. 不要になったタスク

**見直しが必要な場合:**

```
mcp__guardrails__procedure_workflow(action='list')  // 現在の状態を確認
mcp__guardrails__procedure_workflow(action='set', tasks=[
  // 完了済みタスクはdone: trueで保持
  { what: "完了済みタスク", ..., done: true },
  // 新しい計画
  { what: "新タスク", ... }
])
```

**見直し不要の場合:** そのまま次フェーズへ進む

---

## ステップ 8: コミット＆PR更新

### 1. リモート同期

```bash
git fetch origin && git rebase origin/{current-branch}
```

### 2. コミット＆プッシュ

```bash
git add -A
git commit -m "feat(server): implement domain models and ports"
git push origin {current-branch}
```

### 3. PR更新

GitHub MCPサーバーでPRボディを更新（`.github/PULL_REQUEST_TEMPLATE.md` に従う）：

- 完了タスクにチェックを入れる
- 見直し結果を反映（タスクの追加・削除・修正）
- 特記事項を追記（必要な場合）

**完了条件:** コミット成功、プッシュ成功、PR更新完了

---

## 完了条件

- ドメインモデル実装完了（Entity、Value Object）
- リポジトリインターフェース定義完了
- ポートインターフェース定義完了
- ドメインモデルテスト成功
- 静的解析通過
- ポリシーレビュー通過
