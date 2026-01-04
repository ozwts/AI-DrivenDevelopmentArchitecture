# ポリシー管理（立法）

ポリシーの修正・新設を行うフェーズ。

## 目的

- 新機能に適用されるポリシーを確認
- 必要に応じてポリシーを修正・新設
- 憲法の原則に従った統治を維持

---

## 既存ポリシーの確認

### 利用可能なポリシー

| カテゴリ | ポリシー |
|---------|---------|
| server | domain-model, use-case, handler, repository, unit-of-work, di-container, port, auth-client, storage-client, logger, fetch-now |
| web | component, route, hooks, feature, ui, design, api, lib, mock, logger |
| contract | api, business |
| e2e | playwright |
| infra | terraform |

### ポリシーの依存関係

ポリシーには依存関係がある。例:

- `server/handler` → `server/use-case`, `server/domain-model`, `server/port`
- `web/component` → `web/ui`, `web/design`, `web/hooks`, `web/api`

`meta.json` の `depends` フィールドで定義。

---

## ポリシー修正・新設

### 判断基準

以下の場合にポリシー修正・新設を検討:

1. **新しいパターン**: 既存ポリシーにないパターンが必要
2. **制約の追加**: セキュリティ、パフォーマンス等の新しい制約
3. **ベストプラクティスの更新**: より良い方法が見つかった

### 作業手順

1. **影響調査**: 既存ポリシーとの整合性を確認
2. **起案**: ポリシー文書を作成
3. **レビュー依頼**: 人間のレビューを必須とする

### ディレクトリ構造

```
guardrails/policy/{category}/{domain}/
├── meta.json           # メタデータ（依存関係等）
├── 10-overview.md      # 概要
├── 20-xxx.md           # 詳細ルール
└── ...
```

### meta.json の形式

```json
{
  "name": "Domain Model",
  "description": "Entity, Value Object, repository interfaces",
  "depends": ["port"]
}
```

---

## 憲法との整合性

ポリシーは憲法の原則に従う必要がある。

### 確認ポイント

1. **ユーザー第一主義**: ユーザーの利便性を最大化しているか
2. **構造的規律**:
   - シンプルさ（Simple vs Easy）
   - 境界（変更の波及を防ぐ）
   - 凝集性（変更を一箇所に集中）
   - 責任（MECE分離）
3. **共進化主義**: AI・人間が協調できるか

---

## 重要な注意事項

> ポリシー変更は人間のレビューが必須
> — constitution/co-evolution/collaboration-principles.md

AIがポリシーを起案することはできるが、最終承認は人間が行う。

---

## 完了条件

- 既存ポリシーの確認完了
- ポリシー修正不要の確認、または起案完了
- 人間によるレビュー完了（修正・新設の場合）
