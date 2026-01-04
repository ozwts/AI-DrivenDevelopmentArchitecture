# フロントエンド実装ワークフロー

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

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 4: ルート実装

**ポリシー:**
- `guardrails/policy/web/route/`
- `guardrails/policy/web/component/`
- `guardrails/policy/web/design/`

**実装先:** `web/src/app/routes/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 5: Feature抽出（必要な場合）

**ポリシー:**
- `guardrails/policy/web/feature/`
- `guardrails/policy/web/hooks/`

**実装先:** `web/src/app/features/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 6: 共有UIコンポーネント（必要な場合）

**ポリシー:** `guardrails/policy/web/ui/`

**実装先:** `web/src/app/lib/ui/`

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 6b: 基盤（lib）などの追加・修正（必要な場合）

**ポリシー:** `guardrails/policy/web/lib/`

**実装先:** `web/src/app/lib/`など

→ 修正内容に応じた観点でポリシーレビュー。ポリシーが存在しない新概念は、先にポリシーを起草し人間のレビューを受けること。

---

## ステップ 7: テストの実装

```
mcp__guardrails__procedure_test(target='web-component')
mcp__guardrails__procedure_snapshot(action='update', file='...')
```

---

## ステップ 8: 最終検証

```
mcp__guardrails__review_static_analysis(workspace='web', targetDirectories=['web/src/'])
mcp__guardrails__review_unused_exports(workspace='web')
mcp__guardrails__procedure_fix(workspace='web')
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

---

## 契約変更が必要な場合

1. `contracts/api/` のOpenAPI仕様を修正
2. `contracts/business/` のビジネスルールを修正（必要な場合）
3. `mcp__guardrails__procedure_codegen(workspace='web')`
4. 影響箇所を修正して実装を継続

---

## 完了条件

- コード生成完了
- UI実装完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
