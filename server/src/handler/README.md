# Handler層 - HTTPリクエスト/レスポンス処理

HTTP通信を担当する最外層。Honoフレームワークを使用してリクエストを受け取り、ユースケースを実行し、レスポンスを返す。

## 責務

- **HTTPリクエスト受信**: APIエンドポイントの定義
- **リクエストバリデーション**: Zodスキーマでの入力検証
- **ユースケース呼び出し**: ビジネスロジックの実行
- **レスポンス生成**: 型安全なJSON生成とZodバリデーション
- **エラーマッピング**: ドメインエラーをHTTPステータスコードに変換

## ディレクトリ構成

```
handler/
├── hono-handler/                           # Honoハンドラ実装
│   ├── {entity}/                           # エンティティごとにディレクトリ
│   │   ├── {action}-{entity}-handler.ts    # ハンドラ実装
│   │   ├── {entity}-router.ts              # ルーター定義
│   │   └── {entity}-handler-util.ts        # 変換ユーティリティ
│   ├── constants.ts                        # 共通定数
│   └── client-side-app.ts                  # メインアプリケーション
└── hono-handler-util/                      # ハンドラ共通ユーティリティ
    └── error-handler.ts                    # エラーハンドリング
```

**命名パターン:**

- ハンドラファイル: `{action}-{entity}-handler.ts`
- ハンドラビルダー: `build{Action}{Entity}Handler`
- ルーター: `build{Entity}Router`
- ユーティリティ: `{entity}-handler-util.ts`

## 核となる設計原則

### 1. ビルダーパターン

ハンドラはビルダー関数で生成。

**パターン:**

```
export const build{Action}{Entity}Handler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    // ハンドラ実装
  };
```

**利点:**

- DIコンテナを注入可能
- テスト時にモックコンテナを渡せる
- 関数のクロージャで依存を保持

### 2. 型安全なバリデーション

入力と出力をZodスキーマでバリデーション。

**入力バリデーション:**

- OpenAPI仕様から自動生成されたZodスキーマを使用
- リクエストボディ、パスパラメータ、クエリパラメータを検証
- バリデーションエラーは400 Bad Requestで返す

**出力バリデーション:**

- レスポンスもZodスキーマで検証
- スキーマ不一致は500 Internal Server Errorで返す（開発時バグ検出）
- 本番環境での予期しないデータ送信を防止

### 3. 明示的エラーハンドリング

ユースケースのResult型をHTTPステータスコードに変換。

**エラーマッピング:**

- `NotFoundError` → 404 Not Found
- `ValidationError` → 400 Bad Request
- `ConflictError` → 409 Conflict
- `UnexpectedError` → 500 Internal Server Error

**error-handler.ts:**

- `handleError()` 関数で一元的にエラー処理
- エラー型に応じた適切なステータスコードを返す
- ログ出力も統一的に実施

### 4. 認証コンテキストの管理

認証ミドルウェアでトークン検証し、コンテキストに設定。

**Honoコンテキストキー:**

- `USER_SUB` - Cognito User Sub
- `USER_EMAIL` - メールアドレス
- `USER_EMAIL_VERIFIED` - メール検証状態

**Current Userパターン:**

- `/users/me` エンドポイントでコンテキストから`USER_SUB`を取得
- URLパラメータではなくトークンから取得（セキュリティ）

## ハンドラ実装パターン

### 基本構造

**処理フロー:**

1. DIコンテナからLogger、ユースケースを取得
2. try-catchで全体をラップ
3. リクエストパラメータの取得とバリデーション
4. ユースケース実行
5. Result型の成功/失敗チェック
6. レスポンス生成とZodバリデーション
7. JSONレスポンス返却

**エラーハンドリング:**

- ユースケースの失敗は`handleError()`でマッピング
- 予期しない例外はtry-catchでキャッチして500エラー
- すべてのエラーをログ出力

### GET - 単一リソース取得

**処理パターン:**

1. パスパラメータ（ID）を取得
2. バリデーション（必須チェック、形式チェック）
3. ユースケース実行（`Get{Entity}UseCase`）
4. NotFoundErrorは404で返す
5. 成功時はエンティティをレスポンス型に変換
6. Zodバリデーション後にJSON返却

**Current Userの場合:**

- コンテキストから`USER_SUB`を取得
- パスパラメータは使用しない
- `Get{Entity}UseCase` ではなく `GetCurrent{Entity}UseCase`

### GET - リスト取得

**処理パターン:**

1. クエリパラメータ（ページネーション、フィルタ）を取得
2. バリデーション（オプショナルパラメータの型チェック）
3. ユースケース実行（`List{Entity}sUseCase`）
4. 空配列も正常系として処理
5. エンティティリストをレスポンス型配列に変換
6. Zodバリデーション後にJSON返却

**ページネーション:**

- `cursor` - 次ページ取得用のカーソル
- `limit` - 取得件数制限
- レスポンスに`nextCursor`を含める（ページング継続用）

### POST - リソース作成

**処理パターン:**

1. リクエストボディを取得
2. Zodスキーマでバリデーション（OpenAPI生成）
3. バリデーションエラーは400で返す
4. ユースケース実行（`Register{Entity}UseCase`）
5. ConflictErrorは409で返す（重複時）
6. 成功時は201 Createdで返す
7. Locationヘッダーに作成リソースのURL設定（オプション）

**Current Userの場合:**

- コンテキストから`USER_SUB`、`USER_EMAIL`等を取得
- ボディには含めない（トークンから取得）

### PUT/PATCH - リソース更新

**処理パターン:**

1. パスパラメータ（ID）を取得
2. リクエストボディを取得
3. Zodスキーマでバリデーション
4. ユースケース実行（`Update{Entity}UseCase`）
5. NotFoundErrorは404で返す
6. 成功時は200 OKで更新後エンティティを返す

**Current Userの場合:**

- コンテキストから`USER_SUB`を取得
- パスパラメータは使用しない

### DELETE - リソース削除

**処理パターン:**

1. パスパラメータ（ID）を取得
2. ユースケース実行（`Delete{Entity}UseCase`）
3. NotFoundErrorは404で返す
4. 成功時は204 No Contentまたは200 OKで返す

**Current Userの場合:**

- コンテキストから`USER_SUB`を取得
- 自分自身のアカウント削除のみ許可

## ルーター定義パターン

### エンティティルーター

**ファイル**: `{entity}-router.ts`

**パターン:**

```
export const build{Entity}Router = ({ container }) => {
  const router = new Hono();

  router.get("/", build List handler);
  router.post("/", build Register handler);
  router.get("/:id", build Get handler);
  router.put("/:id", build Update handler);
  router.delete("/:id", build Delete handler);

  return router;
};
```

**Current Userエンドポイント:**

- `GET /me` - 自分の情報取得
- `POST /me` - 初回登録
- `PUT /me` - 自分の情報更新
- `DELETE /me` - 自分のアカウント削除

### メインアプリケーション

**ファイル**: `client-side-app.ts`

**責務:**

- 各エンティティルーターを統合
- 認証ミドルウェアの適用
- CORSミドルウェアの適用
- グローバルエラーハンドリング

**パターン:**

```
1. Honoインスタンス生成
2. CORSミドルウェア設定
3. 認証ミドルウェア適用（特定パスのみ）
4. 各エンティティルーターをマウント
5. 404ハンドラー設定
```

## ハンドラユーティリティ

### 変換関数

**ファイル**: `{entity}-handler-util.ts`

**責務:**

- ドメインエンティティ → レスポンス型への変換
- リクエスト型 → ユースケース入力型への変換
- 日付フォーマット、列挙型変換等の共通処理

**命名規則:**

- `convertTo{Entity}Response(entity)` - エンティティ→レスポンス
- `convertTo{Entity}Input(request)` - リクエスト→ユースケース入力

### エラーハンドラー

**ファイル**: `error-handler.ts`

**責務:**

- ドメインエラーをHTTPステータスコードにマッピング
- エラーレスポンス生成
- エラーログ出力

**関数:**

- `handleError(error, context, logger)` - エラー型に応じた処理

## 認証パターン

### 認証ミドルウェア

**処理フロー:**

1. Authorizationヘッダーからトークン抽出
2. `Bearer {token}` 形式の検証
3. AuthClient.decodeToken()でトークン検証
4. payloadから`userSub`、`email`、`email_verified`を取得
5. Honoコンテキストに設定
6. 次のミドルウェア/ハンドラーに処理を渡す

**適用範囲:**

- 認証が必要なエンドポイントにのみ適用
- 公開エンドポイント（ヘルスチェック等）は除外

### コンテキストアクセス

**取得パターン:**

```
const userSub = c.get(USER_SUB);
const userEmail = c.get(USER_EMAIL);
const emailVerified = c.get(USER_EMAIL_VERIFIED);
```

**バリデーション:**

- `typeof userSub !== "string"` チェック
- 空文字チェック
- バリデーション失敗時は500エラー（認証ミドルウェアの設定ミス）

## レスポンス生成

### 成功レスポンス

**パターン:**

- 200 OK - 取得、更新成功
- 201 Created - 作成成功
- 204 No Content - 削除成功（ボディなし）

**ボディ:**

- OpenAPI仕様で定義されたレスポンス型
- Zodスキーマで検証済み
- JSON形式

### エラーレスポンス

**形式:**

```
{
  "name": "NotFoundError",
  "message": "エラーメッセージ"
}
```

**ステータスコード:**

- 400 Bad Request - バリデーションエラー
- 404 Not Found - リソースが見つからない
- 409 Conflict - リソース重複
- 500 Internal Server Error - 予期しないエラー

## ロギング

### ログ出力のタイミング

- **リクエスト受信時**: エンドポイント、メソッド（`info`）
- **バリデーションエラー**: リクエストの詳細（`warn`）
- **ユースケースエラー**: エラー内容（`error`）
- **予期しないエラー**: スタックトレース（`error`）
- **レスポンス送信前**: ステータスコード、処理時間（`info`）

### ログに含める情報

- HTTPメソッド、パス
- リクエストID（あれば）
- ユーザーSub（認証済みの場合）
- エラー詳細（スタックトレース含む）
- 処理時間

## テスト戦略

### ハンドラテスト

通常、ハンドラ層のユニットテストは作成しない。

**理由:**

- ハンドラはほぼ薄いラッパー（ロジックが少ない）
- ユースケースのテストで十分
- E2Eテストで統合的にテスト

### E2Eテスト

実際のHTTPリクエストでエンドツーエンドテスト。

**テスト内容:**

- 認証フロー
- リクエスト/レスポンスの形式
- エラーハンドリング
- ステータスコードの正確性

## 実装時のチェックリスト

新しいハンドラを追加する際の確認事項：

- [ ] ビルダー関数でハンドラを実装
- [ ] DIコンテナからLogger、ユースケースを取得
- [ ] try-catchで全体をラップ
- [ ] リクエストパラメータをZodでバリデーション
- [ ] ユースケース実行とResult型チェック
- [ ] handleError()でエラーマッピング
- [ ] レスポンスをZodでバリデーション
- [ ] 適切なHTTPステータスコードを返す
- [ ] ログ出力を実施
- [ ] ルーターにエンドポイント追加
- [ ] OpenAPI仕様を更新
- [ ] コード生成実行（`npm run codegen`）

## パフォーマンス最適化

### レスポンスサイズ削減

- 不要なフィールドを含めない
- ProjectionExpressionでDBから必要なデータのみ取得
- ページネーション実装

### キャッシュヘッダー

- Cache-Controlヘッダーの適切な設定
- ETagの活用（変更検知）
- 静的コンテンツのキャッシュ

### 非同期処理

- 重い処理はバックグラウンドジョブに
- レスポンス返却後の処理は非同期化
- タイムアウト設定

## 参考

- `../use-case/README.md` - ユースケース層
- `../domain/README.md` - ドメイン層
- `../di-container/README.md` - DI設定
- `../domain/support/logger/README.md` - ロギング
- `../domain/support/auth-client/README.md` - 認証
- [Hono公式ドキュメント](https://hono.dev/)
- [Zod公式ドキュメント](https://zod.dev/)
- `todo.openapi.yaml` - OpenAPI仕様
