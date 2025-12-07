# DIコンテナ：概要

## 核心原則

DIコンテナは**Composition Root**として機能し、**インターフェース（型）に依存し実装クラスをインスタンス化**する唯一の場所である。

## 静的解析

**カスタムESLintルール**: `local-rules/di-container/interface-impl-import-pattern`

| チェック項目 | エラー時メッセージ |
| --- | --- |
| 型のみimport、Implなし | `missingImplImport` |
| Implのみimport、型なし | `missingTypeImport` |
| 型を`import type`で書いていない | `typeImportShouldUseTypeKeyword` |
| 型を`new`しようとしている | `newOnTypeNotImpl` |
| `bind<A>`と`new BImpl`の不一致 | `bindImplMismatch` |

**対象パターン**: UseCase/UseCaseImpl、Repository/RepositoryImpl

## 関連ドキュメント

| トピック | ファイル |
| --- | --- |
| UseCase層 | `../use-case/10-use-case-overview.md` |
| Repository実装 | `../repository/10-repository-overview.md` |
| Handler層 | `../handler/10-handler-overview.md` |
| カスタムLint実装 | `server/eslint-local-rules/di-container/` |

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

## ファイル構成

```
di-container/
├── service-id.ts              # サービスID定義
├── register-lambda-container.ts  # Lambda用コンテナ登録
└── env-util.ts                # 環境変数ユーティリティ
```

## サービスID命名規則

| カテゴリ | パターン | 例 |
| --- | --- | --- |
| 環境変数 | `{VARIABLE_NAME}` | `USERS_TABLE_NAME` |
| ユーティリティ | `{NAME}` | `LOGGER`, `FETCH_NOW` |
| リポジトリ | `{ENTITY}_REPOSITORY` | `USER_REPOSITORY` |
| ユースケース | `{ACTION}_{ENTITY}_USE_CASE` | `CREATE_PROJECT_USE_CASE` |
| UoWランナー | `{ACTION}_{ENTITY}_UOW_RUNNER` | `DELETE_PROJECT_UOW_RUNNER` |

## importパターン

### 必須: 型とImplを分離してimport

```typescript
// ✅ Good: 型（インターフェース）とImpl（実装）を分けてimport
import type { CreateProjectUseCase } from "@/application/use-case/project/create-project-use-case";
import { CreateProjectUseCaseImpl } from "@/application/use-case/project/create-project-use-case";

// ✅ Good: bindは型、toDynamicValueはImplを使用
container
  .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
  .toDynamicValue((ctx) => {
    return new CreateProjectUseCaseImpl({ ... });
  });
```

```typescript
// ❌ Bad: 型のみimportしてインスタンス化しようとする
import { CreateProjectUseCase } from "@/application/use-case/project/create-project-use-case";

container
  .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
  .toDynamicValue((ctx) => {
    return new CreateProjectUseCase({ ... }); // 型をnewしようとしてエラー
  });
```

**理由**:

- `CreateProjectUseCase`は**型**（インターフェース相当）
- `CreateProjectUseCaseImpl`は**クラス**（実装）
- DIコンテナはComposition Rootとして実装クラスを知る必要がある

## 登録パターン

### UseCase登録

```typescript
container
  .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
  .toDynamicValue((ctx) => {
    const projectRepository = ctx.container.get<ProjectRepository>(
      serviceId.PROJECT_REPOSITORY,
    );
    const logger = ctx.container.get<Logger>(serviceId.LOGGER);
    const fetchNow = ctx.container.get<FetchNow>(serviceId.FETCH_NOW);

    return new CreateProjectUseCaseImpl({
      projectRepository,
      logger,
      fetchNow,
    });
  })
  .inSingletonScope();
```

### Repository登録

```typescript
container
  .bind<TodoRepository>(serviceId.TODO_REPOSITORY)
  .toDynamicValue((ctx) => {
    const ddbDoc = ctx.container.get<DynamoDBDocumentClient>(serviceId.DDB_DOC);
    const todosTableName = ctx.container.get<string>(serviceId.TODOS_TABLE_NAME);
    const attachmentsTableName = ctx.container.get<string>(
      serviceId.ATTACHMENTS_TABLE_NAME,
    );
    const logger = ctx.container.get<Logger>(serviceId.LOGGER);

    return new TodoRepositoryImpl({
      ddbDoc,
      todosTableName,
      attachmentsTableName,
      logger,
      // uowは注入しない（各UseCaseで必要に応じて渡す）
    });
  })
  .inSingletonScope();
```

### 環境変数登録

```typescript
container
  .bind(serviceId.USERS_TABLE_NAME)
  .toDynamicValue(() => unwrapEnv("USERS_TABLE_NAME"))
  .inSingletonScope();
```

## スコープ

| コンポーネント | スコープ | 理由 |
| --- | --- | --- |
| Repository | Singleton | ステートレス、再利用可能 |
| UseCase | Singleton | ステートレス、再利用可能 |
| Logger | Singleton | 共有リソース |
| 環境変数 | Singleton | 不変値 |
| UoWランナー | Singleton | ファクトリとして機能 |

## Do / Don't

### Good

```typescript
// 型とImplを分けてimport
import type { GetUserUseCase } from "@/application/use-case/user/get-user-use-case";
import { GetUserUseCaseImpl } from "@/application/use-case/user/get-user-use-case";

// Propsパターンで依存を渡す
return new GetUserUseCaseImpl({
  userRepository,
  logger,
});

// ctx.container.get()で依存を取得
const userRepository = ctx.container.get<UserRepository>(
  serviceId.USER_REPOSITORY,
);
```

### Bad

```typescript
// 型のみimport（Implがない）
import { GetUserUseCase } from "@/application/use-case/user/get-user-use-case";

// 型をnewしようとする
return new GetUserUseCase(userRepository); // ❌ エラー

// 位置引数で依存を渡す
return new GetUserUseCaseImpl(userRepository, logger); // ❌ Propsパターンを使う

// ハードコードされた依存
return new GetUserUseCaseImpl({
  userRepository: new UserRepositoryImpl(...), // ❌ ctx.containerから取得
  logger: new LoggerImpl(),
});
```
