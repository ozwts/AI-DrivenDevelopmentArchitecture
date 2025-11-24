# ロギング原則

## 最高原則

ログは**構造化**され、**検索可能**で、**運用可能**でなければならない。

- **構造化**: ログは機械可読な形式（JSON等）で出力し、任意のキー・バリューペアを付加できる
- **検索可能**: ログレベル、サービス名、ユーザーID等で容易にフィルタリング・検索できる
- **運用可能**: システム運用者が問題の特定・診断・解決に必要な情報を含む

## ログレベルの定義

『システム運用アンチパターン』の「3.5.2 何を記録すべきか？」を参考にした4段階のログレベル。

### DEBUG

**目的**: 開発・デバッグ時の詳細な追跡

**記録内容**:
- プログラム内で起こっていることに関連するあらゆる情報
- 変数の値、処理フローの追跡
- パフォーマンス測定データ

**運用環境**: 基本的に無効化（必要に応じて一時的に有効化）

### INFO

**目的**: システムの正常動作の記録

**記録内容**:
- ユーザーが開始したアクション（ログイン、データ作成等）
- スケジュールされたタスクの実行
- システムのスタートアップ・シャットダウン
- ビジネストランザクションの成功

**運用環境**: 常時有効

### WARN

**目的**: 潜在的な問題の早期検知

**記録内容**:
- 将来的にエラーになる可能性のある状態
- 廃止予定のAPI・ライブラリの使用
- 使用可能リソースの不足（メモリ、ディスク等）
- パフォーマンスの低下
- リトライ可能なエラー（外部API呼び出し失敗等）

**運用環境**: 常時有効、アラート設定推奨

### ERROR

**目的**: システムエラーの記録と通知

**記録内容**:
- すべてのエラー状態
- 例外の詳細（スタックトレース含む）
- ビジネストランザクションの失敗
- データ整合性の問題

**運用環境**: 常時有効、即座のアラート設定必須

## アーキテクチャ原則

### 1. インフラへの依存排除（Dependency Inversion）

ドメイン層・ユースケース層は具体的なログライブラリに依存しない。

```
ドメイン層/ユースケース層
  ↓ 依存
Logger インターフェース（domain/support/logger）
  ↑ 実装
インフラ層
  ↓ 依存
具体的なログライブラリ（AWS Lambda Powertools、Winston等）
```

**理由**:
- ログライブラリの変更がドメインロジックに影響しない
- テスト時にDummyオブジェクトで置き換え可能
- 実行環境（Lambda、ECS、ローカル等）に応じた実装の切り替えが容易

### 2. 構造化ログの必須化

すべてのログは構造化データとして出力する。

**構造化ログの要件**:
- メッセージ（message）: 人間が読むための文字列
- 付加情報（additionalData）: 検索・フィルタリング用のキー・バリューペア
- サービス名（serviceName）: ログの発生元を識別
- タイムスタンプ: ログの発生時刻（ライブラリが自動付与）

**付加情報の種類**:
- エラーオブジェクト: スタックトレースを含む詳細情報
- コンテキスト情報: `{ userId, todoId, projectId }` 等のビジネスエンティティID
- 処理情報: `{ duration, itemCount }` 等のパフォーマンス情報

### 3. コンテキスト情報の伝搬

リクエスト単位で共通のコンテキスト情報を自動付加する。

**コンテキスト情報の例**:
- `userId`: 操作を実行したユーザー
- `requestId`: リクエストの一意識別子（分散トレーシング用）
- `sessionId`: セッションの識別子

**実装方法**: `appendKeys()` メソッドでロガーにコンテキストを追加

```typescript
// リクエスト開始時にコンテキストを設定
logger.appendKeys({ userId: "user-123", requestId: "req-456" });

// 以降のすべてのログに自動付加される
logger.info("プロジェクトを作成しました", { projectId: "proj-789" });
// => { userId: "user-123", requestId: "req-456", projectId: "proj-789", message: "..." }
```

### 4. メッセージの一貫性

ログメッセージは一貫したフォーマットで記述する。

**推奨フォーマット**:
- 日本語で記述（運用チームが日本語の場合）
- 過去形または完了形を使用（`"プロジェクトを作成しました"`）
- 主語を省略可能（コンテキスト情報から推測可能なため）
- ユースケースの識別子を含める（`"use-case: create-project-use-case"`）

## レイヤー別ロギング戦略

### ハンドラー層（Handler）

**責務**: リクエスト・レスポンスの記録

**記録内容**:
- リクエストの受信（INFO）
- バリデーションエラー（WARN）
- レスポンスの送信（DEBUG）
- 未処理例外（ERROR）

**注意**: 機密情報（パスワード、トークン等）をログに含めない

### ユースケース層（UseCase）

**責務**: ビジネスロジックの実行記録

**記録内容**:
- ユースケースの開始（DEBUG）
- ビジネスルールのバリデーションエラー（ERROR）
- 外部サービス呼び出しの失敗（ERROR/WARN）
- ビジネストランザクションの成功（INFO）

**パターン**:
```typescript
logger.debug("use-case: create-project-use-case", { userId });

// エラー時
if (!result.success) {
  logger.error("プロジェクトの保存に失敗しました", result.error);
  return result;
}

// 成功時
logger.info("プロジェクトを作成しました", { projectId: project.id });
```

### インフラ層（Infrastructure）

**責務**: 技術的な操作の記録

**記録内容**:
- データベース操作（DEBUG）
- トランザクションの開始・コミット・ロールバック（DEBUG）
- 外部API呼び出し（DEBUG/ERROR）
- リトライ処理（WARN）

### ドメイン層（Domain）

**原則**: ドメイン層ではログ出力しない

**理由**:
- ドメインモデルは純粋なビジネスロジックのみを持つ
- ログはインフラ関心事であり、ドメインの責務ではない
- ロギングはユースケース層・インフラ層で実施

**例外**: 複雑な計算やバリデーションロジックのデバッグ時のみ

## 実装パターン

### インターフェース定義（domain/support/logger）

```typescript
export type AdditionalData = Error | { [key: string]: unknown };

export type Logger = {
  debug(message: string, data?: AdditionalData): void;
  info(message: string, data?: AdditionalData): void;
  warn(message: string, data?: AdditionalData): void;
  error(message: string, data?: AdditionalData): void;
  appendKeys(params: { [key: string]: unknown }): void;
};
```

### Dummy実装（テスト用）

```typescript
export class LoggerDummy implements Logger {
  debug(_message: string, _data?: AdditionalData): void {}
  info(_message: string, _data?: AdditionalData): void {}
  warn(_message: string, _data?: AdditionalData): void {}
  error(_message: string, _data?: AdditionalData): void {}
  appendKeys(_: { [key: string]: unknown }): void {}
}
```

### 本番実装（infrastructure/logger）

```typescript
export class LoggerImpl implements Logger {
  #logger: ConcreteLogger; // AWS Lambda Powertools等

  constructor({ logLevel, serviceName }: {
    logLevel?: LogLevel;
    serviceName: string;
  }) {
    this.#logger = new ConcreteLogger({ logLevel, serviceName });
  }

  debug(message: string, data?: AdditionalData): void {
    this.#logger.debug(message, data);
  }

  // 他のメソッドも同様に実装
}
```

## アンチパターン

### ❌ 文字列連結によるログ

```typescript
// ❌ 悪い例
logger.info(`ユーザー ${userId} がプロジェクト ${projectId} を作成しました`);
```

**問題**:
- userIdやprojectIdで検索できない
- パフォーマンス情報を付加できない

```typescript
// ✅ 良い例
logger.info("プロジェクトを作成しました", { userId, projectId });
```

### ❌ 過度なDEBUGログ

```typescript
// ❌ 悪い例
logger.debug("関数Aを開始");
logger.debug("変数xの値:", x);
logger.debug("変数yの値:", y);
logger.debug("関数Aを終了");
```

**問題**:
- ログ量が膨大になりパフォーマンスに影響
- 重要なログが埋もれる

**推奨**: 必要な箇所のみDEBUGログを出力、または動的にログレベルを調整

### ❌ 機密情報のログ出力

```typescript
// ❌ 悪い例
logger.info("ログイン成功", { password, token });
```

**問題**:
- セキュリティリスク
- コンプライアンス違反

**推奨**: パスワード、トークン、クレジットカード番号等は絶対にログに含めない

### ❌ エラーオブジェクトの文字列化

```typescript
// ❌ 悪い例
logger.error(`エラーが発生しました: ${error.message}`);
```

**問題**:
- スタックトレースが失われる
- エラーの詳細情報が欠落

```typescript
// ✅ 良い例
logger.error("エラーが発生しました", error);
```

### ❌ ドメイン層でのログ出力

```typescript
// ❌ 悪い例: Entityでログ出力
export class Todo {
  updateTitle(newTitle: string): Todo {
    logger.info("タイトルを更新しました", { newTitle }); // ドメイン層でログ
    return new Todo({ ...this, title: newTitle });
  }
}
```

**問題**:
- ドメインモデルがインフラに依存
- テストが困難

```typescript
// ✅ 良い例: UseCaseでログ出力
export class UpdateTodoUseCase {
  async execute(input: UpdateTodoInput) {
    const updatedTodo = todo.updateTitle(input.title); // ドメインロジック
    logger.info("TODOタイトルを更新しました", { todoId: updatedTodo.id }); // ログ
    // ...
  }
}
```

## 実装チェックリスト

新しい機能追加時の確認事項：

- [ ] ドメイン層・ユースケース層は`Logger`インターフェースに依存（具体的なライブラリに依存しない）
- [ ] すべてのログは構造化データとして出力（メッセージ + 付加情報）
- [ ] リクエスト単位でコンテキスト情報を`appendKeys()`で設定
- [ ] ログレベルを適切に使い分け（DEBUG/INFO/WARN/ERROR）
- [ ] エラー発生時は`Error`オブジェクトをそのまま渡す（文字列化しない）
- [ ] 機密情報（パスワード、トークン等）をログに含めない
- [ ] ドメイン層ではログ出力しない（ユースケース層・インフラ層で実施）
- [ ] テスト時は`LoggerDummy`を使用

## 運用上の考慮事項

### ログレベルの動的変更

本番環境で問題が発生した際、再デプロイなしでログレベルを変更できる仕組みを用意する。

**実装例**:
- 環境変数による設定（`LOG_LEVEL=DEBUG`）
- AWS Systems Manager Parameter Storeからの動的読み込み

### ログの保管期間

ログレベルに応じた保管期間を設定する。

**推奨**:
- ERROR/WARN: 90日以上
- INFO: 30日以上
- DEBUG: 7日以内（または無効化）

### コスト最適化

ログ量はコストに直結するため、適切な制御が必要。

**対策**:
- 本番環境ではDEBUGログを基本的に無効化
- サンプリングレート設定（全リクエストの10%のみDEBUGログ出力等）
- 重要なログ（ERROR/WARN）は必ず出力

## 関連ポリシー

- `constitution/validation-principles.md` - エラー時のログ出力タイミング
- 『システム運用アンチパターン』第3章「可観測性」 - ログレベルの定義根拠
