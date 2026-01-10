# 契約定義ワークフロー

## 対象スコープ

- `contracts/business/` - ビジネス契約
- `contracts/api/` - API契約（OpenAPI）

---

## ステップ 0: 要件定義の確認

**読むもの:**

- `contracts/business/glossary.md` - 用語集
- `contracts/business/` - 既存ビジネス契約
- `contracts/api/todo.openapi.yaml` - 既存API契約

---

## ステップ 1: ビジネス契約の定義

**ポリシー:** `guardrails/policy/contract/business/`

**実装先:** `contracts/business/{domain}/`

**作成するもの:**

- `definition.md` - エンティティ定義（属性、制約）
- `scenario/{action}.md` - ユースケースシナリオ

**用語集の更新:**

新しいドメイン用語がある場合は `contracts/business/glossary.md` を更新

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 2: API契約の定義

**ポリシー:** `guardrails/policy/contract/api/`

**実装先:** `contracts/api/`

**作成するもの:**

- `{domain}/components.yaml` - スキーマ定義
- `{domain}/{resource}.paths.yaml` - エンドポイント定義
- `entry.yaml` への参照追加

**設計原則:**

1. **リソース指向**: 名詞でリソースを表現（`/todos`, `/projects`）
2. **HTTPメソッド**: GET/POST/PUT/PATCH/DELETE を適切に使用
3. **ステータスコード**: 200, 201, 400, 401, 403, 404, 500 を適切に返却

→ 修正内容に応じた観点でポリシーレビュー

---

## ステップ 3: コード生成

```
mcp__guardrails__procedure_codegen(workspace='all')
```

---

## ステップ 4: 影響範囲の検証

```
mcp__guardrails__review_static_analysis(
  workspace='server',
  targetDirectories=['server/src/'],
  analysisType='type-check'
)

mcp__guardrails__review_static_analysis(
  workspace='web',
  targetDirectories=['web/src/'],
  analysisType='type-check'
)
```

---

## 契約修正について

フロントエンド実装中の契約修正は許容される。

**修正フロー:**

1. OpenAPI仕様を修正
2. コード再生成
3. 影響箇所を修正
4. 実装を継続

**注意**: サーバー実装開始後の契約修正は影響範囲が大きいため慎重に。

---

## 完了条件

- ビジネス契約が文書化されている
- OpenAPI仕様が定義されている
- コード生成が完了している
- 型チェックを通過している
- ポリシーレビューを通過している
