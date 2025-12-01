# Handler層の全体像

## 核心原則

Handler層は**外部イベント（HTTP、S3イベント等）とアプリケーション層の間の薄いアダプター**でなければならない。

## Handler層の責務

### 実施すること

1. **入力の取得と変換**: 外部イベント（HTTPリクエスト、S3イベント等）からの入力取得
2. **入力バリデーション**: Zodスキーマによる型・形式チェック
3. **ユースケース呼び出し**: ビジネスロジックの実行を委譲
4. **エラーハンドリング**: UseCase/Domain層から返されたエラーを適切な出力形式に変換
5. **レスポンス変換**: ドメインエンティティを出力形式に変換
6. **出力バリデーション**: 出力データのZodスキーマ検証（HTTP APIの場合）
7. **出力の返却**: 適切な形式での結果返却

### 実施しないこと

1. **ビジネスロジック** → UseCase層で実施
2. **ドメインルール** → Domain層（Value Object/Entity）で実施
3. **データベースアクセス** → Repository層で実施
4. **複雑な計算** → UseCase層またはDomain層で実施
5. **状態管理** → Entity層で実施

## ファイル構成

```
handler/
├── 10-handler-overview.md           # 本ファイル（全体概要）
├── 20-http-handler-overview.md      # HTTPハンドラー概要
├── 21-http-handler-implementation.md # HTTPハンドラー実装詳細
├── 22-http-validation-error.md      # バリデーション・エラーハンドリング
└── 23-http-router-patterns.md       # ルーター実装パターン
```

## ハンドラー種別

### HTTPハンドラー（Hono）

**参照**: `20-http-handler-overview.md`

HTTP API（REST）のリクエスト/レスポンスを処理する。Lambda + API Gatewayで動作。

### イベントハンドラー（将来拡張）

S3イベント、SQSメッセージ等の非同期イベントを処理する。HTTPハンドラーと同じ原則（薄いアダプター）に従う。

## レイヤー間の関係

```
外部イベント（HTTP Request, S3 Event等）
    ↓
Handler層（このドキュメント）
  - 入力取得・変換
  - 入力バリデーション（Zod）
    ↓
UseCase層
  - ビジネスロジック実行
    ↓
Domain層
  - エンティティ操作
    ↓
Infrastructure層
  - データ永続化
    ↓（Result型）
UseCase層
    ↓（Result型）
Handler層
  - レスポンス変換
  - 出力バリデーション（Zod）
  - エラー変換
    ↓
外部出力（HTTP Response, ログ出力等）
```

## バリデーション戦略（MECE原則）

**参照**: `policy/server/domain-model/11-domain-validation-strategy.md`

Handler層は**型レベルのバリデーション**のみを実施する。

| 階層 | 責務 | エラー型 |
| --- | --- | --- |
| Handler層 | 型レベル制約（必須性、型、長さ、形式、enum） | ValidationError（400） |
| Domain層 | ドメインルール（ビジネス不変条件） | DomainError（422） |
| UseCase層 | ビジネスルール（DB参照を伴う検証） | NotFoundError（404）等 |

## Do / Don't

### ✅ Good

```typescript
// 薄いアダプター: 入力取得 → バリデーション → UseCase呼び出し → レスポンス変換
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);

    const rawBody: unknown = await c.req.json();
    const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
    if (!parseResult.success) {
      return c.json({ name: "ValidationError", ... }, 400);
    }

    const result = await useCase.execute(parseResult.data);
    if (!result.isOk()) {
      return handleError(result.error, c, logger);
    }

    return c.json(convertToProjectResponse(result.data), 201);
  };
```

### ❌ Bad

```typescript
// ハンドラーでビジネスロジックを実装
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const rawBody = await c.req.json();

    // ❌ ビジネスロジックをハンドラーで実装
    if (rawBody.color === "#000000") {
      return c.json({ name: "ValidationError", message: "黒は使用できません" }, 400);
    }

    // ❌ リポジトリを直接呼び出し
    const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);
    const project = await repository.save({ ... });

    return c.json(project, 201);
  };
```

## 関連ドキュメント

- **HTTPハンドラー概要**: `20-http-handler-overview.md`
- **HTTPハンドラー実装**: `21-http-handler-implementation.md`
- **バリデーション・エラー**: `22-http-validation-error.md`
- **ルーターパターン**: `23-http-router-patterns.md`
- **バリデーション戦略**: `policy/server/domain-model/11-domain-validation-strategy.md`
- **UseCase層**: `policy/server/use-case/10-use-case-overview.md`
