# Composition Root責務のセマンティックレビュー

## 検証観点

DIコンテナ（Composition Root）が適切な責務のみを担っているか、以下の観点でレビューする。

---

## 実施すること（✅ 許可）

### 1. 依存関係の解決

インターフェースと実装クラスの紐付け。

```typescript
// ✅ Good: インターフェースにImplをbind
container
  .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
  .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }));
```

### 2. ライフサイクル管理

Singleton/Transientスコープの制御。

```typescript
// ✅ Good: Singletonスコープを明示
.inSingletonScope();
```

### 3. 実装クラスのインスタンス化

Implクラスのnewはここでのみ許可。

```typescript
// ✅ Good: Composition Rootでのみnew XImpl()
return new CreateProjectUseCaseImpl({ ... });
```

### 4. 環境変数の注入

テーブル名、APIキー等の環境依存値の取得。

```typescript
// ✅ Good: 環境変数の取得と注入
container
  .bind(serviceId.USERS_TABLE_NAME)
  .toDynamicValue(() => unwrapEnv("USERS_TABLE_NAME"));
```

### 5. 環境別の分岐

ローカル/本番環境での接続先切り替え。

```typescript
// ✅ Good: 環境による分岐（接続先）
if (stageName === "LOCAL") {
  return new S3Client({ endpoint: "http://127.0.0.1:4566", ... });
}
return new S3Client({ region });
```

---

## 実施しないこと（❌ 禁止）

### 1. ビジネスロジック

**検出パターン:**
- if文による業務判断
- データの加工・変換
- バリデーション

```typescript
// ❌ Bad: ビジネスロジックをDIコンテナに実装
container
  .bind<DiscountCalculator>(serviceId.DISCOUNT_CALCULATOR)
  .toDynamicValue((ctx) => {
    const user = ctx.container.get<User>(serviceId.CURRENT_USER);
    // ❌ ビジネスロジック
    if (user.isPremium) {
      return new PremiumDiscountCalculator();
    }
    return new StandardDiscountCalculator();
  });
```

**修正方法:** UseCase層またはファクトリパターンで実装。

### 2. データ永続化

**検出パターン:**
- DBへの直接アクセス
- ファイル操作

```typescript
// ❌ Bad: DIコンテナでデータを取得
container
  .bind<Config>(serviceId.CONFIG)
  .toDynamicValue(async (ctx) => {
    const ddb = ctx.container.get<DynamoDBDocumentClient>(serviceId.DDB_DOC);
    // ❌ データ永続化
    const result = await ddb.send(new GetCommand({ ... }));
    return result.Item as Config;
  });
```

**修正方法:** Repository層で実装。

### 3. HTTPリクエスト処理

**検出パターン:**
- リクエストパラメータの参照
- レスポンスの構築

```typescript
// ❌ Bad: リクエスト処理
// そもそもtoDynamicValue内でリクエスト情報にアクセスする設計は不適切
```

**修正方法:** Handler層で実装。

### 4. 外部API呼び出し

**検出パターン:**
- 初期化時の外部API呼び出し
- 設定の動的取得

```typescript
// ❌ Bad: 初期化時にAPIを呼び出し
container
  .bind<FeatureFlags>(serviceId.FEATURE_FLAGS)
  .toDynamicValue(async (ctx) => {
    // ❌ 外部API呼び出し
    const response = await fetch("https://config-service/flags");
    return response.json();
  });
```

**修正方法:** Port経由で抽象化し、UseCase層で呼び出し。

---

## アーキテクチャ原則

### 依存性逆転の原則（DIP）

```
Handler層 → UseCase層 → Repository層
    ↑           ↑            ↑
    └───────────┴────────────┘
              DIコンテナ（Composition Root）
              - 実装クラスをimport
              - インターフェースにbind
```

- **上位層（UseCase）はインターフェースに依存**
- **下位層（Infrastructure）は実装を提供**
- **DIコンテナが両者を接続**

### Composition Rootの特権

DIコンテナは「実装クラスを知ってよい唯一の場所」。

- Handler層は`container.get<UseCase>()`で取得
- UseCase層は引数でRepositoryを受け取る
- どちらも実装クラスを直接importしない

---

## レビューチェックリスト

| チェック項目 | 確認内容 |
|------------|---------|
| ビジネスロジックがない | if文が環境分岐のみ |
| データアクセスがない | DBクエリ、ファイル操作がない |
| 外部API呼び出しがない | fetch、httpクライアント呼び出しがない |
| すべてSingletonスコープ | ステートレスなコンポーネントはSingleton |
| Propsパターンを使用 | 位置引数でなくオブジェクト引数 |
| ctx.container.get()で依存取得 | new XImpl()のネストがない |
