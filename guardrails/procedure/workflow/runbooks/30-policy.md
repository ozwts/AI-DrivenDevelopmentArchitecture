# ポリシー管理ワークフロー（立法）

## 対象スコープ

- `guardrails/policy/` - ポリシー定義
- `guardrails/constitution/` - 憲法（参照のみ、変更不可）

---

## ステップ 0: 既存ポリシーの確認

**読むもの:**

- `guardrails/constitution/` - 憲法（設計原則）
- `guardrails/policy/` - 既存ポリシー

**利用可能なポリシー:**

| カテゴリ | ポリシー |
|---------|---------|
| server | domain-model, use-case, handler, repository, unit-of-work, di-container, port, auth-client, storage-client, logger, fetch-now |
| web | component, route, hooks, feature, ui, design, api, lib, mock, logger |
| contract | api, business |
| e2e | playwright |
| infra | terraform |

---

## ステップ 1: ポリシー修正・新設の判断

**判断基準:**

以下の場合にポリシー修正・新設を検討:

1. **新しいパターン**: 既存ポリシーにないパターンが必要
2. **制約の追加**: セキュリティ、パフォーマンス等の新しい制約
3. **ベストプラクティスの更新**: より良い方法が見つかった

**修正不要の場合:** → ステップ 5（完了）へスキップ

---

## ステップ 2: 影響調査

**確認すること:**

- 既存ポリシーとの整合性
- 依存関係（`meta.json` の `depends` フィールド）
- 影響を受ける既存コード

---

## ステップ 3: ポリシー起案

**実装先:** `guardrails/policy/{category}/{domain}/`

**作成するもの:**

- `meta.json` - メタデータ（依存関係等）
- `10-{domain}-overview.md` - 概要（核心原則、Do/Don't）
- `20-xxx.md` 以降 - 詳細ルール

**meta.json の形式:**

```json
{
  "name": "Domain Model",
  "description": "Entity, Value Object, repository interfaces",
  "depends": ["port"]
}
```

---

## ステップ 4: 人間によるレビュー

**重要:** ポリシー変更は人間のレビューが必須

> ポリシー変更は人間のレビューが必須
> — constitution/co-evolution/collaboration-principles.md

AIがポリシーを起案することはできるが、最終承認は人間が行う。

**レビュー観点（憲法との整合性）:**

1. **ユーザー第一主義**: ユーザーの利便性を最大化しているか
2. **構造的規律**:
   - シンプルさ（Simple vs Easy）
   - 境界（変更の波及を防ぐ）
   - 凝集性（変更を一箇所に集中）
   - 責任（MECE分離）
3. **共進化主義**: AI・人間が協調できるか

---

## ステップ 5: 完了確認

**修正なしの場合:**

- 既存ポリシーで対応可能であることを確認

**修正ありの場合:**

- ポリシー文書が作成されている
- 人間のレビューが完了している
- 既存コードへの影響を把握している

---

## ステップ 6: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. 新設・修正されたポリシーの影響
2. 実装パターンの変更
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

## 完了条件

- 既存ポリシーの確認完了
- ポリシー修正不要の確認、または起案完了
- 人間によるレビュー完了（修正・新設の場合）
