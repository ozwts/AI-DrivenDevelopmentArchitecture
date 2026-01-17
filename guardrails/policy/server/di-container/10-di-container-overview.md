# DIコンテナ：概要

> **Note:** DIコンテナのポリシーは横のガードレール（非機能・アーキテクチャ制約）として再編成されました。

## 横のガードレール（静的解析）

以下のポリシーは静的解析で検証されます。

| ファイル | 検証内容 |
|---------|---------|
| [`import-type-impl-pattern.ts`](../../horizontal/server/di-container/import-type-impl-pattern.ts) | 型とImpl のimportが対になっているか |
| [`service-id-naming.ts`](../../horizontal/server/di-container/service-id-naming.ts) | サービスID命名規則（SCREAMING_SNAKE_CASE） |
| [`singleton-scope-required.ts`](../../horizontal/server/di-container/singleton-scope-required.ts) | inSingletonScope()の使用 |
| [`container-get-dependency.ts`](../../horizontal/server/di-container/container-get-dependency.ts) | ctx.container.get()での依存取得 |
| [`props-injection-pattern.ts`](../../horizontal/server/di-container/props-injection-pattern.ts) | Propsパターン（オブジェクト引数）の使用 |

## 横のガードレール（セマンティックレビュー）

以下のポリシーはAI/人間によるレビューで検証されます。

| ファイル | 検証内容 |
|---------|---------|
| [`composition-root-responsibility.md`](../../horizontal/server/di-container/composition-root-responsibility.md) | Composition Rootの責務（何を実施する/しない） |

---

## 核心原則

DIコンテナは**Composition Root**として機能し、**インターフェース（型）に依存し実装クラスをインスタンス化**する唯一の場所である。

## 責務

### 実施すること

1. **依存関係の解決**: インターフェースと実装クラスの紐付け
2. **ライフサイクル管理**: Singleton/Transientスコープの制御
3. **実装クラスのインスタンス化**: Implクラスのnew
4. **環境変数の注入**: テーブル名、APIキー等

### 実施しないこと

1. **ビジネスロジック** → UseCase層で実施
2. **データ永続化** → Repository層で実施
3. **HTTPリクエスト処理** → Handler層で実施

## アーキテクチャ原則

### Composition Root

DIコンテナ登録ファイルは「Composition Root」であり、**ここだけは実装クラスを知ってよい**。

```
Handler層 → UseCase層 → Repository層
    ↑           ↑            ↑
    └───────────┴────────────┘
              DIコンテナ（Composition Root）
              - 実装クラスをimport
              - インターフェースにbind
```

### 依存性逆転の原則（DIP）

- **上位層（UseCase）はインターフェースに依存**
- **下位層（Infrastructure）は実装を提供**
- **DIコンテナが両者を接続**

## 関連ドキュメント

| トピック | ファイル |
|---------|---------|
| UseCase層 | `../use-case/10-use-case-overview.md` |
| Repository実装 | `../repository/10-repository-overview.md` |
| Handler層 | `../handler/10-handler-overview.md` |
