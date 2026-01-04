# 契約定義

ビジネスルールとAPI契約を定義するフェーズ。

## 目的

- フロントエンドとサーバーの契約を先に定義
- 実装前に設計を確定させ、手戻りを最小化
- 型安全性の基盤を構築

---

## ビジネス契約の定義

### 作業内容

- ビジネスルールの明確化
- ドメイン用語の定義（用語集）
- ユースケースの特定

### 配置先

`contracts/business/` 配下

### ポリシーレビュー

```
mcp__guardrails__review_qualitative(
  policyId='contract/business',
  targetDirectories=['contracts/business/']
)
```

---

## API契約の定義

### 作業内容

- `contracts/api/todo.openapi.yaml` を更新
- RESTful設計原則に従う
- スキーマ、パス、リクエスト/レスポンスを定義

### 設計原則

1. **リソース指向**: 名詞でリソースを表現（`/todos`, `/projects`）
2. **HTTPメソッド**: GET/POST/PUT/PATCH/DELETE を適切に使用
3. **ステータスコード**: 200, 201, 400, 401, 403, 404, 500 を適切に返却
4. **スキーマ定義**: 詳細な型定義で型安全性を確保

### ポリシーレビュー

```
mcp__guardrails__review_qualitative(
  policyId='contract/api',
  targetDirectories=['contracts/api/']
)
```

---

## コード生成

契約定義後、型定義を生成:

**フロントエンド用:**
```
mcp__guardrails__procedure_codegen(workspace='web')
```

**サーバー用:**
```
mcp__guardrails__procedure_codegen(workspace='server')
```

---

## 契約修正について

フロントエンド実装中の契約修正は許容される。

修正フロー:
1. OpenAPI仕様を修正
2. コード再生成
3. 影響箇所を修正
4. 実装を継続

**注意**: サーバー実装開始後の契約修正は影響範囲が大きいため慎重に。

---

## 完了条件

- ビジネス契約が文書化されている
- OpenAPI仕様の初期版が定義されている
- ポリシーレビューを通過している
