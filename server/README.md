# Server - バックエンド

Node.js + Hono + DynamoDBを使用したサーバーレスバックエンド。クリーンアーキテクチャとDDD原則に基づいて設計。

## 技術スタック

- **Runtime**: Node.js 22.x
- **Framework**: Hono 4 (軽量Webフレームワーク)
- **DI Container**: InversifyJS 6
- **Database**: AWS SDK v3 (DynamoDB DocumentClient)
- **Validation**: Zod 3
- **Testing**: Vitest 2
- **Build**: esbuild
- **Logger**: AWS Lambda Powertools Logger

## ディレクトリ構成

```
server/
├── src/
│   ├── domain/          # ドメイン層（外部依存なし）
│   │   ├── model/       # エンティティとリポジトリインターフェース
│   │   └── support/     # Logger, FetchNowなどのインターフェース
│   │
│   ├── use-case/        # ユースケース層
│   │   └── */           # ユースケース実装とテスト
│   │
│   ├── infrastructure/  # インフラストラクチャ層
│   │   ├── repository/  # DynamoDB実装とミディアムテスト
│   │   └── */           # Logger, FetchNowなどの実装
│   │
│   ├── handler/         # ハンドラー層
│   │   └── hono-handler/  # Honoハンドラとルーティング
│   │
│   ├── di-container/    # 依存性注入設定
│   ├── util/            # テストユーティリティなど
│   ├── generated/       # OpenAPI自動生成コード
│   │
│   ├── lambda-handler.ts        # Lambda エントリーポイント
│   └── standalone-handler.ts    # ローカル実行用
│
├── docker-compose.yml          # DynamoDB Local
├── esbuild.api.config.mjs     # Lambda ビルド設定
├── vitest.config.ts           # テスト設定
└── package.json
```

## コマンド

### テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# 特定のテストファイルのみ
npx vitest run src/use-case/todo/list-todos.test.ts
```

**重要**: テスト実行前にDynamoDB Localを起動してください：

```bash
# DynamoDB Local起動
sudo docker compose up -d

# 起動確認
sudo docker ps | grep dynamodb
```

### バリデーション

```bash
# TypeScript + ESLint
npm run validate

# TypeScriptのみ
npm run validate:tsc

# ESLintのみ
npm run validate:lint
```

### ビルド

```bash
# TypeScriptビルド
npm run build

# Lambda関数ビルド（esbuild）
npm run api:build

# 出力: dist/lambda-handler.zip
```

### ローカル実行

```bash
# Standalone Hono サーバー起動
npm run start

# http://localhost:3000 でアクセス可能
```

### フォーマット

```bash
# すべて修正
npm run fix

# Prettier修正
npm run fix:format

# ESLint修正
npm run fix:lint
```

## アーキテクチャ

### クリーンアーキテクチャ - 4層構造

#### 1. Domain層 (`src/domain/`)

**責務**: ビジネスロジックとルール

**特徴**:

- 外部依存なし（Pure TypeScript）
- エンティティとインターフェースのみ定義
- 不変オブジェクト（`readonly` プロパティ）
- Result型による明示的エラーハンドリング

**詳細**: `src/domain/README.md` を参照

#### 2. UseCase層 (`src/use-case/`)

**責務**: アプリケーション固有のビジネスフロー

**特徴**:

- ドメインエンティティを組み合わせて処理
- リポジトリインターフェースを通じてデータアクセス
- `Result<T, E>` 型で明示的エラーハンドリング
- トランザクション管理（Unit of Work）

**詳細**: `src/use-case/README.md` を参照

#### 3. Infrastructure層 (`src/infrastructure/`)

**責務**: 外部システムとの接続

**特徴**:

- DynamoDB DocumentClient を使用
- ドメインインターフェースを実装
- エラーをResult型でラップ
- スキーマ変換（DynamoDB Item ⇔ エンティティ）

**詳細**: `src/infrastructure/repository/README.md` を参照

#### 4. Handler層 (`src/handler/`)

**責務**: HTTPリクエスト/レスポンス処理

**特徴**:

- Honoフレームワーク使用
- Zodでリクエストバリデーション
- DIコンテナからユースケースを取得
- エラーマッピング（ドメインエラー → HTTPステータスコード）

**詳細**: `src/handler/README.md` を参照

## 重要パターン

### Result型パターン

例外を使わない明示的エラーハンドリング。

**特徴**:

- `{ success: true, data: T }` または `{ success: false, error: E }` の2つの状態
- 型システムでエラーハンドリングを強制
- 全層で一貫したエラー処理

**実装例:**

```typescript
// Result型を定義
export type SaveResult = Result<undefined, UnexpectedError>;

// 明示的な成功/失敗を返す
const result = await repository.save({ todo });
if (!result.success) {
  logger.error("保存に失敗しました", result.error);
  return { success: false, error: result.error };
}
// ここでresult.dataを使用
```

**詳細**: `src/domain/README.md`、`src/use-case/README.md` を参照

### Propsパターン

将来の拡張性を考慮したメソッド引数パターン。

**特徴**:

- オブジェクト形式でパラメータを受け取る
- パラメータ追加時に破壊的変更を回避
- 可読性の向上

**詳細**: `src/domain/README.md` を参照

### 不変エンティティパターン

エンティティの状態変更は新しいインスタンスを生成。

**特徴**:

- `readonly` プロパティ
- 更新メソッドは新インスタンスを返す
- 意図しない状態変更を防止

**詳細**: `src/domain/README.md` を参照

### 依存性注入パターン

InversifyJSによる依存性注入。

**特徴**:

- サービスIDで識別
- DIコンテナで依存を解決
- Singletonスコープ

**詳細**: `src/di-container/README.md` を参照

## データアクセスパターン

### テーブル設計

DDD（ドメイン駆動設計）の集約に則り、エンティティごとに正規化されたテーブルを使用。

**原則**:

- 各エンティティごとに専用テーブル
- リポジトリが複数テーブルを集約
- 正規化されたスキーマ設計

**詳細**: `src/infrastructure/repository/README.md` を参照

### GSI（Global Secondary Index）

別の軸での検索を実現。

**特徴**:

- 結果整合性
- ProjectionTypeの適切な設定
- 検索要件に応じた設計

**詳細**: `src/infrastructure/repository/README.md` を参照

## テスト戦略

### スモールテスト (`.small.test.ts`)

ドメインロジック、ユースケースのユニットテスト。

**特徴**:

- Dummy実装でモック
- 純粋なビジネスロジックを検証
- 高速実行

**詳細**: `src/domain/README.md`、`src/use-case/README.md` を参照

### ミディアムテスト (`.medium.test.ts`)

リポジトリ + DynamoDB Localの統合テスト。

**特徴**:

- 実際のDynamoDB操作を検証
- テーブル作成・削除を含む
- トランザクション動作確認

**セットアップ**: DynamoDB Localを `sudo docker compose up -d` で起動

**詳細**: `src/infrastructure/repository/README.md` を参照

## トラブルシューティング

### DynamoDB Localが起動しない

```bash
# コンテナ停止・削除
sudo docker compose down

# 再起動
sudo docker compose up -d

# ログ確認
sudo docker compose logs
```

### テストが失敗する

```bash
# DynamoDB Localが起動しているか確認
sudo docker ps | grep dynamodb

# ポート8000が使用中か確認
lsof -i :8000

# テーブルが正しく作成されているか確認（AWS CLI必要）
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# TypeScript検証
npm run validate:tsc

# Lambda ビルド
npm run api:build
```

### Lambda デプロイ後にエラー

CloudWatch Logsを確認：

```bash
# AWS CLI で最新のログを確認
aws logs tail /aws/lambda/<function-name> --follow
```

## サポートインターフェース

### Logger

構造化ロギングインターフェース。

**詳細**: `src/domain/support/logger/README.md` を参照

### AuthClient

認証クライアント抽象化（Cognito等）。

**詳細**: `src/domain/support/auth-client/README.md` を参照

### Unit of Work

トランザクション管理パターン。

**詳細**: `src/domain/support/unit-of-work/README.md`、`src/infrastructure/unit-of-work/README.md` を参照

### 特記事項

サポートインターフェースを追加したら、README.mdを作成してリファレンスすること

## 参考資料

- [Hono](https://hono.dev/)
- [InversifyJS](https://inversify.io/)
- [DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
- [Vitest](https://vitest.dev/)
- [Zod](https://zod.dev/)
- [AWS Lambda Powertools](https://docs.powertools.aws.dev/lambda/typescript/latest/)
