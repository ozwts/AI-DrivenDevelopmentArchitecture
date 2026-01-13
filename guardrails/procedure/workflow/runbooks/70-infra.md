# インフラ変更（Terraform）

## タスク計画ガイド

このフェーズで作成する成果物と、タスク分割の指針。

### 主要成果物

| 成果物 | 実装先 | 粒度 |
|--------|--------|------|
| モジュール変更 | `infra/terraform/modules/` | リソース種別ごとに1タスク |
| 環境設定変更 | `infra/terraform/environments/` | 環境ごとに1タスク |
| インフラレビュー | - | 全変更をまとめて1タスク |
| Plan確認 | - | 1タスク |
| Apply実行 | - | 1タスク |
| Destroy確認 | - | 1タスク |

### タスク分割ルール

1. **モジュール → 環境** の順序を守る
2. **リソース種別ごとに分割**: DB変更、Lambda変更、API Gateway変更は別タスク
3. **Plan → Apply → Destroy**: 全て成功を確認
4. **必須の終了タスク**: 「計画見直し」「コミット・プッシュ・PR更新」を最後に追加

### タスク例（新規DynamoDBテーブル追加の場合）

```
1. infra/terraform/modules/aws/db/tables.tf にテーブル定義を追加
2. インフラ変更をレビュー
3. Plan を実行して差分を確認
4. Apply を実行
5. Destroy を実行して削除可能性を確認
6. 最終検証（静的解析）
7. 後続フェーズの作業計画を見直す
8. Infraフェーズの成果物をコミット・プッシュ・PR更新
```

### タスク例（変更不要の場合）

```
1. インフラ変更不要を確認
2. 後続フェーズの作業計画を見直す
3. Infraフェーズの成果物をコミット・プッシュ・PR更新
```

---

## 対象スコープ

- `infra/terraform/` 配下のTerraformコード

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `guardrails/policy/infra/terraform/` - Terraformポリシー

---

## ステップ 1: 実装

**ポリシー:** `guardrails/policy/infra/terraform/`

**実装先:** `infra/terraform/`

**完了条件:** 静的解析パス、コミット

---

## ステップ 2: デプロイ

### 差分確認（Plan）

```
mcp__guardrails__procedure_deploy_dev(
  action='diff',
  useBranchEnv=true
)
```

### 適用（Apply）

```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=true,
  target='all'
)
```

### 削除（Destroy）

依存関係の確認のため、destroyも実行して正常に削除できることを確認する:

```
mcp__guardrails__procedure_deploy_dev(
  action='destroy',
  useBranchEnv=true
)
```

**完了条件:** Plan成功、Apply成功、Destroy成功

---

## ステップ 3: 最終検証

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='all'
)
mcp__guardrails__procedure_fix(workspace='infra')
```

**完了条件:** 静的解析パス

**注意:** 定性レビューはE2Eフェーズ開始前にまとめて実施。このフェーズでは静的解析のみ。

---

## ステップ 4: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. インフラ変更がE2Eテストに与える影響
2. 環境固有の設定変更
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

## ステップ 5: コミット＆PR更新

### 1. リモート同期

```bash
git fetch origin && git rebase origin/{current-branch}
```

### 2. コミット＆プッシュ

```bash
git add -A
git commit -m "infra: {message}"
git push origin {current-branch}
```

### 3. PR更新

GitHub MCPサーバーでPRボディを更新（`.github/PULL_REQUEST_TEMPLATE.md` に従う）：

- 完了タスクにチェックを入れる
- 見直し結果を反映（タスクの追加・削除・修正）
- 特記事項を追記（必要な場合）

**完了条件:** コミット成功、プッシュ成功、PR更新完了（進捗＆計画変更を反映）

---

## 完了条件

- 静的解析（format, lint, security）通過
- Plan で意図した変更のみ表示
- Apply 成功
- Destroy 成功

**注意:** 定性レビューはE2Eフェーズ開始前にまとめて実施。このフェーズでは静的解析のみ。
