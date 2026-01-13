# フロントエンド実装ワークフロー

## タスク計画ガイド

このフェーズで作成する成果物と、タスク分割の指針。

### 主要成果物

| 成果物 | 実装先 | 粒度 |
|--------|--------|------|
| コード生成 | - | 1タスク |
| モックハンドラ | `web/src/mocks/handlers/{domain}.ts` | ドメインごとに1タスク |
| モックデータ | `web/src/mocks/data/{domain}.ts` | ドメインごとに1タスク |
| ルートページ | `web/src/app/routes/{path}/page.tsx` | ルートごとに1タスク |
| Feature | `web/src/app/features/{feature}/` | 機能ごとに1タスク（3箇所以上で使用時） |
| 共有UI | `web/src/app/lib/ui/{component}.tsx` | コンポーネントごとに1タスク |
| デザインブラッシュアップ | - | 追加・修正した画面をまとめて1タスク |
| コンポーネントテスト | `*.ct.test.tsx` | 実装した画面ごとに1タスク |
| スナップショットテスト | `*.ss.test.ts` | 実装した画面ごとに1タスク |
| 最終検証 | - | 1タスク |

### タスク分割ルール

1. **モック → UI → Feature → テスト** の順序を守る
2. **ルートは1画面1タスク**: 複数ルートがある場合は分割
3. **Feature/UIは必要な場合のみ**: 3箇所以上で使用する場合に抽出
4. **テストは実装後**: コンポーネントテスト → スナップショットテストの順
5. **必須の終了タスク**: 「計画見直し」「コミット・PR更新」を最後に追加

### タスク例（プロジェクト一覧・詳細画面追加の場合）

```
1. コード生成
2. web/src/mocks/handlers/project.ts にモックハンドラを作成
3. web/src/mocks/data/project.ts にモックデータを作成
4. モックデータをレビュー
5. web/src/app/routes/projects/page.tsx（一覧画面）を実装
6. web/src/app/routes/projects/:id/page.tsx（詳細画面）を実装
7. ルート実装をレビュー
8. designerサブエージェントでデザインブラッシュアップ
9. projects/page.ct.test.tsx を実装
10. projects/:id/page.ct.test.tsx を実装
11. コンポーネントテストを実行
12. projects/route.ss.test.ts を実装
13. スナップショットを取得・確認
14. 最終検証
15. 後続フェーズの作業計画を見直す
16. Frontendフェーズの成果物をコミット・プッシュ・PR更新
```

---

## 対象スコープ

- `web/src/` 配下のフロントエンドコード

## 開発モード

```
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `contracts/business/` - ビジネス契約
- `server/src/domain/model/` - ドメインモデル
- `guardrails/policy/web/` - フロントエンドポリシー

---

## ステップ 1: コード生成

```
mcp__guardrails__procedure_codegen(workspace='web')
```

---

## ステップ 2: 影響範囲の検証

```
mcp__guardrails__review_static_analysis(
  workspace='web',
  targetDirectories=['web/src/'],
  analysisType='type-check'
)
```

---

## ステップ 3: モックデータの実装

**ポリシー:** `guardrails/policy/web/mock/`

**実装先:** `web/src/mocks/`

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 4: ルート実装

**ポリシー:**

- `guardrails/policy/web/route/`
- `guardrails/policy/web/component/`
- `guardrails/policy/web/design/`

**実装先:** `web/src/app/routes/`

**完了条件:** 静的解析パス、定性レビューパス（各ポリシーを並列実行）、コミット

---

## ステップ 5: Feature抽出（必要な場合）

**ポリシー:**

- `guardrails/policy/web/feature/`
- `guardrails/policy/web/hooks/`

**実装先:** `web/src/app/features/`

**完了条件:** 静的解析パス、定性レビューパス（各ポリシーを並列実行）、コミット

---

## ステップ 6: 共有UIコンポーネント（必要な場合）

**ポリシー:** `guardrails/policy/web/ui/`

**実装先:** `web/src/app/lib/ui/`

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 7: 基盤（lib）などの追加・修正（必要な場合）

**ポリシー:** `guardrails/policy/web/lib/`

**実装先:** `web/src/app/lib/`など

ポリシーが存在しない新概念は、先にポリシーを起草し人間のレビューを受けること。

**完了条件:** 静的解析パス、定性レビューパス（該当ポリシーを並列実行）、コミット

---

## ステップ 8: デザインブラッシュアップ

**サブエージェント:** `designer`

Playwright MCPで実際の画面を確認しながら、導線とUIをブラッシュアップする。

```
Task(
  subagent_type='designer',
  prompt='以下の画面の導線とデザインをブラッシュアップしてください: {追加・修正した画面のパス一覧}'
)
```

**チェック観点:**

- **導線（最優先）**: 到達可能性、一貫性、フィードバック、回復可能性
- `guardrails/constitution/user-first/user-first-principles.md`
- `guardrails/policy/web/design/`

**完了条件:** designerサブエージェント完了、コミット

---

## ステップ 9: コンポーネントテストの実装

**ポリシー:**

- `guardrails/policy/web/component/40-test-patterns.md`
- `guardrails/policy/web/route/40-test-patterns.md`
- `guardrails/policy/web/ui/50-test-pattern.md`

**実装先:** 各コンポーネントと同階層に `*.ct.test.tsx` を作成

**レビュー後にテスト実行:**

```
mcp__guardrails__procedure_test(target='web-component')
```

**完了条件:** 静的解析パス、定性レビューパス、テスト成功、コミット

---

## ステップ 10: スナップショットテストの実装

**ポリシー:**

- `guardrails/policy/web/component/40-test-patterns.md`
- `guardrails/policy/web/route/40-test-patterns.md`
- `guardrails/policy/web/ui/50-test-pattern.md`

**実装先:** ルートディレクトリ直下に `route.ss.test.ts` を作成

**レビュー後にスナップショット取得:**

```
mcp__guardrails__procedure_snapshot(action='update', file='...')
```

**スナップショット確認:** 取得したスナップショットファイルを読み、想定通りの内容か確認すること。

- レイアウト崩れ、不要な要素、欠落がないか
- テストケース名と内容が一致しているか
- 問題があれば修正して再取得

**完了条件:** 静的解析パス、定性レビューパス、スナップショット確認OK、コミット

---

## ステップ 11: 最終検証

```
mcp__guardrails__review_static_analysis(workspace='web', targetDirectories=['web/src/'])
mcp__guardrails__review_unused_exports(workspace='web')
mcp__guardrails__procedure_fix(workspace='web')
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

今回実装した箇所に関わる全ての観点で定性レビューを実施する（並列実行可能）。

**完了条件:** 全レビューパス、開発サーバー起動確認

---

## 契約変更が必要な場合

1. `contracts/api/` のOpenAPI仕様を修正
2. `contracts/business/` のビジネスルールを修正（必要な場合）
3. `mcp__guardrails__procedure_codegen(workspace='web')`
4. 影響箇所を修正して実装を継続

---

## ステップ 12: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. 実装中に発見した契約変更の必要性
2. バックエンドAPI設計への影響
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

## ステップ 13: コミット＆PR更新

### 1. リモート同期

```bash
git fetch origin && git rebase origin/{current-branch}
```

### 2. コミット＆プッシュ

```bash
git add -A
git commit -m "feat(web): {message}"
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

- コード生成完了
- UI実装完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
