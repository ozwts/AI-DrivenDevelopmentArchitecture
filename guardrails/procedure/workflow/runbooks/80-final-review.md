# 最終レビュー

全レイヤーの実装に対して、ワークスペース全体の静的解析と定性レビューを実施する。

## タスク計画ガイド

このフェーズで作成する成果物と、タスク分割の指針。

### 主要成果物

| 成果物 | 実装先 | 粒度 |
|--------|--------|------|
| レビュー結果 | `.guardrails-mcp/reviews/` | web/server/infraごとに1ファイル |
| 違反修正 | 各レイヤーのソースコード | 優先度highを中心に対応 |

### タスク分割ルール

1. **3並列でレビュー**: web / server / infra を同時実行
2. **各領域で全観点をカバー**: 関連する全てのポリシーディレクトリをレビュー
3. **優先度highを優先対応**: 技術的負債の早期解消
4. **ループしない**: レビュー→修正→静的解析で完結
5. **必須の終了タスク**: 「コミット・プッシュ・PR更新」を最後に追加

### タスク例

```
1. ワークスペース全体の静的解析を実行
2. Web実装を一括レビュー（並列1）
3. Server実装を一括レビュー（並列2）
4. Infra実装を一括レビュー（並列3）
5. 優先度high指摘を修正
6. 静的解析で修正を確認
7. Final Reviewフェーズの成果物をコミット・プッシュ・PR更新
```

---

## 対象スコープ

ワークスペース全体。今回の実装で追加・変更されたコード全て。

---

## ステップ 1: ワークスペース全体の静的解析

**定性レビューの前に、まずワークスペース全体の静的解析を実行する。**

```
mcp__guardrails__review_static_analysis(workspace='server', targetDirectories=['/path/to/server/src'])
mcp__guardrails__review_static_analysis(workspace='web', targetDirectories=['/path/to/web/src'])
mcp__guardrails__review_infra_static_analysis(targetDirectory='/path/to/infra/terraform/environments/dev')
```

**注意**: `targetDirectories` はワークスペースのルートディレクトリを指定。

### エラーがある場合

1. `mcp__guardrails__procedure_fix` で自動修正を試みる
2. 自動修正できないエラーは手動で修正

**完了条件:** server/web/infra の静的解析がすべてパス

---

## ステップ 2: レビュー対象の特定

```bash
git diff --name-only origin/main...HEAD
```

変更されたファイルから、レビュー対象を特定する。

---

## ステップ 3: 定性レビューの実施（3並列）

**web / server / infra で3つの `guardrails-reviewer` を並列実行する。**

### Web領域（並列1）

**対象ディレクトリ:** `web/src/` 配下の変更ファイル

**レビュー観点:** `web/*` の全ポリシーID

```
Task(
  subagent_type='guardrails-reviewer',
  prompt='web/src/ 配下の変更ファイルに対して、web/* の全ポリシーIDでレビューを実施してください。
  mcp__guardrails__review_qualitative の description から web/ で始まるポリシーIDを全て使用してください。'
)
```

### Server領域（並列2）

**対象ディレクトリ:** `server/src/` 配下の変更ファイル

**レビュー観点:** `server/*` の全ポリシーID

```
Task(
  subagent_type='guardrails-reviewer',
  prompt='server/src/ 配下の変更ファイルに対して、server/* の全ポリシーIDでレビューを実施してください。
  mcp__guardrails__review_qualitative の description から server/ で始まるポリシーIDを全て使用してください。'
)
```

### Infra領域（並列3）

**対象ディレクトリ:** `infra/terraform/` 配下の変更ファイル

**レビュー観点:** `infra/*` の全ポリシーID

```
Task(
  subagent_type='guardrails-reviewer',
  prompt='infra/terraform/ 配下の変更ファイルに対して、infra/* の全ポリシーIDでレビューを実施してください。
  mcp__guardrails__review_qualitative の description から infra/ で始まるポリシーIDを全て使用してください。'
)
```

**注意:** Infraに変更がない場合はスキップ可能。

---

## ステップ 4: レビュー結果の確認

各レビュー結果ファイルを確認し、優先度別に整理する:

| 優先度 | 対応方針 |
|--------|----------|
| `high` | 技術的負債になりうるため、このフェーズで対応 |
| `medium` | 対応推奨だが、判断はメインセッションに委ねる |
| `low` | 対応任意 |

**レビュー結果ファイル:**

- `.guardrails-mcp/reviews/{timestamp}-web.jsonl`
- `.guardrails-mcp/reviews/{timestamp}-server.jsonl`
- `.guardrails-mcp/reviews/{timestamp}-infra.jsonl`

---

## ステップ 5: 違反の修正（3並列）

**web / server / infra で3つの `violation-fixer` を並列実行する。**

### Web修正（並列1）

```
Task(
  subagent_type='violation-fixer',
  prompt='以下のレビュー結果ファイルの指摘を修正してください: .guardrails-mcp/reviews/{timestamp}-web.jsonl
  優先度highを優先して修正してください。'
)
```

### Server修正（並列2）

```
Task(
  subagent_type='violation-fixer',
  prompt='以下のレビュー結果ファイルの指摘を修正してください: .guardrails-mcp/reviews/{timestamp}-server.jsonl
  優先度highを優先して修正してください。'
)
```

### Infra修正（並列3）

```
Task(
  subagent_type='violation-fixer',
  prompt='以下のレビュー結果ファイルの指摘を修正してください: .guardrails-mcp/reviews/{timestamp}-infra.jsonl
  優先度highを優先して修正してください。'
)
```

**注意:** Infraに違反がない場合はスキップ可能。

### 修正の原則

1. **優先度highを優先**: 技術的負債の早期解消
2. **ループしない**: 修正後に再レビューは実施しない
3. **静的解析で確認**: 修正後は静的解析のみ実行

---

## ステップ 6: 静的解析で修正を確認

修正後、ワークスペース全体の静的解析を再実行:

```
mcp__guardrails__review_static_analysis(workspace='server', targetDirectories=['/path/to/server/src'])
mcp__guardrails__review_static_analysis(workspace='web', targetDirectories=['/path/to/web/src'])
mcp__guardrails__review_infra_static_analysis(targetDirectory='/path/to/infra/terraform/environments/dev')
```

エラーがあれば修正:

```
mcp__guardrails__procedure_fix(workspace='server')
mcp__guardrails__procedure_fix(workspace='web')
mcp__guardrails__procedure_fix(workspace='infra')
```

**完了条件:** server/web/infra の静的解析がすべてパス

---

## ステップ 7: コミット＆PR更新

### 1. リモート同期

```bash
git fetch origin && git rebase origin/{current-branch}
```

### 2. コミット＆プッシュ

```bash
git add -A
git commit -m "refactor: address policy review findings"
git push origin {current-branch}
```

### 3. PR更新

GitHub MCPサーバーでPRボディを更新（`.github/PULL_REQUEST_TEMPLATE.md` に従う）：

- 完了タスクにチェックを入れる
- レビュー結果のサマリーを追記（対応済み/未対応の件数）

**完了条件:** コミット成功、プッシュ成功、PR更新完了

---

## 完了条件

- ワークスペース全体の静的解析が通過（server/web/infra）
- Web/Server/Infraの定性レビュー完了（3並列）
- 優先度high指摘の修正完了
- 修正後の静的解析が通過
- レビュー結果ファイルが `.guardrails-mcp/reviews/` に出力済み
