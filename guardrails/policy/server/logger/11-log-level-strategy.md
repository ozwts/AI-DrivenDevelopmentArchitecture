# Logger: ログレベル戦略

## 核心原則

ログレベルは**監視コストと問題検出のバランス**を最適化するために使い分ける。

**基本方針**:
- **ERROR**: 開発者が対応すべき予期せぬ問題のみ
- **WARN**: クライアント操作に起因する想定内のエラー
- **INFO**: 正常系の重要イベント
- **DEBUG**: 開発時のデバッグ情報（本番では出力しない）

**根拠となる憲法**:
- `observability-principles.md`: ログレベルの階層（DEBUG、INFO、WARN、ERROR）

## ログレベル定義

### ERROR: 監視対象のシステム異常

**定義**: 開発者の対応が必要な予期せぬ問題

**出力条件**:
- システムの不具合を示唆する
- 放置するとサービス品質に影響する
- 根本原因の調査が必要

**具体例**:
| 状況 | 理由 |
|------|------|
| データベース接続失敗 | インフラ問題 |
| 外部API呼び出し失敗（5xx） | 外部サービス障害 |
| 予期せぬ例外（想定外のcatch） | バグの可能性 |
| データ整合性エラー | ロジック不具合 |
| 必須環境変数の欠落 | 設定・デプロイ問題 |

```typescript
// ERROR例
try {
  await todoRepository.save(todo);
} catch (error) {
  if (isDatabaseConnectionError(error)) {
    logger.error("データベース接続失敗", error);
  }
  throw error;
}
```

### WARN: クライアント操作に起因する想定内エラー

**定義**: クライアントの操作により発生しうる想定内のエラー

**出力条件**:
- クライアントの入力・操作が原因
- システムは正常に動作している
- クライアントへのエラーレスポンスで解決可能

**具体例**:
| 状況 | 理由 |
|------|------|
| バリデーションエラー（400） | クライアント入力の問題 |
| 認証失敗（401） | 認証情報の問題 |
| 認可失敗（403） | 権限不足 |
| リソース未存在（404） | 削除済み or URLミス |
| 重複登録エラー（409） | 既存データとの競合 |

```typescript
// WARN例
const result = await todoRepository.findById(todoId);

if (!result.success) {
  if (result.error.type === "NOT_FOUND") {
    logger.warn("リソースが見つかりません", { todoId });
    return result;
  }
  // 想定外のエラーはERROR
  logger.error("予期せぬエラー", result.error);
  return result;
}
```

### INFO: 正常系の重要イベント

**定義**: 操作の追跡や監査に必要な正常系イベント

**出力条件**:
- 重要なアクションの開始・完了
- ビジネス上意味のある状態変化
- 監査・分析に有用

**具体例**:
| 状況 | 理由 |
|------|------|
| ユースケース実行開始・完了 | 操作追跡 |
| データ作成・更新・削除成功 | 操作履歴 |
| 認証成功 | セキュリティ監査 |
| 外部連携の成功 | 統合の健全性確認 |

```typescript
// INFO例
async execute(input: CreateTodoInput): Promise<CreateTodoOutput> {
  this.#logger.info("TODO作成開始", { title: input.title });

  const result = await this.#todoRepository.save(todo);

  if (result.success) {
    this.#logger.info("TODO作成完了", { todoId: result.data.id });
  }

  return result;
}
```

### DEBUG: 開発時デバッグ情報

**定義**: 開発時の問題調査に必要な詳細情報

**方針: 積極的に記録する**

DEBUGログは**開発環境で積極的に記録**する。本番では出力しないためコストに影響せず、開発時のAIによる問題診断を大幅に加速できる。

**積極的に出力すべき場面**:
- 処理の開始・終了（関数・メソッドの入口と出口）
- 条件分岐の結果（どのパスを通ったか）
- 外部サービス呼び出しの詳細（リクエスト内容、レスポンス概要）
- データ変換の前後（入力値と出力値）
- ループ処理の進捗（件数、現在位置）

**根拠**（可観測性原則）:
- AIがログから処理フローを再現し、問題箇所を自律的に特定できる
- 「何が起きたか」だけでなく「どう処理されたか」まで追跡可能
- 本番では出力しないため、パフォーマンス・コストへの影響なし

**具体例**:
| 状況 | 理由 |
|------|------|
| リポジトリ操作の詳細 | データ操作の追跡 |
| 外部API呼び出しの詳細 | 通信内容の確認 |
| ドメインロジックの分岐 | ロジックの確認 |

```typescript
// DEBUG例
async findById(id: TodoId): Promise<FindResult> {
  this.#logger.debug("Todo検索開始", { todoId: id.value });

  const record = await this.#db.query(...);

  this.#logger.debug("Todo検索完了", { found: record !== null });
  return record;
}
```

## レイヤー別ログ出力責務

| レイヤー | ログ出力 | 内容 |
|---------|---------|------|
| Handler | ○ | リクエスト受信、レスポンス送信、入力バリデーション |
| UseCase | ○ | ビジネスロジックの実行開始・完了・失敗 |
| Repository | ○ | データ操作の詳細（DEBUG中心） |
| Domain | × | **ログ出力しない**（純粋なビジネスルール） |

**根拠となる憲法**:
- `observability-principles.md`: レイヤー別責務（ドメイン層はログ出力なし）

## 判断フローチャート

```
エラーが発生した場合:
├─ システムの不具合か？
│   ├─ YES → ERROR
│   └─ NO → クライアント操作が原因か？
│           ├─ YES → WARN
│           └─ NO → ERROR（想定外）
│
正常系の場合:
├─ 監査・分析に必要か？
│   ├─ YES → INFO
│   └─ NO → 開発時に必要か？
│           ├─ YES → DEBUG
│           └─ NO → ログ不要
```

## 具体的なシナリオ別ガイド

### HTTPステータス別

| ステータス | レベル | 理由 |
|-----------|--------|------|
| 2xx 成功 | INFO | 正常完了 |
| 400 Bad Request | WARN | クライアント入力問題 |
| 401 Unauthorized | WARN | 認証失敗 |
| 403 Forbidden | WARN | 認可失敗 |
| 404 Not Found | WARN | リソース不存在 |
| 409 Conflict | WARN | 競合エラー |
| 500 Internal Server Error | ERROR | サーバー問題 |
| 502/503/504 | ERROR | インフラ問題 |

### データベース操作

| シナリオ | レベル | 理由 |
|----------|--------|------|
| クエリ実行開始 | DEBUG | 開発用詳細 |
| クエリ成功 | DEBUG/INFO | 重要度による |
| レコード未存在 | WARN | 想定内エラー |
| 一意制約違反 | WARN | クライアント入力問題 |
| 接続失敗 | ERROR | インフラ問題 |
| タイムアウト | ERROR | パフォーマンス問題 |

### 外部API連携

| シナリオ | レベル | 理由 |
|----------|--------|------|
| リクエスト送信 | DEBUG | 開発用詳細 |
| 2xx成功 | INFO/DEBUG | 重要度による |
| 4xx クライアントエラー | WARN | 入力問題 |
| 5xx サーバーエラー | ERROR | 外部サービス障害 |
| タイムアウト | ERROR | 接続問題 |

## CloudWatch導入時のコスト最適化

### ログボリュームの指針

| レベル | 本番出力 | 保持期間 | コスト |
|--------|----------|----------|--------|
| ERROR | ○ | 長期（90日） | 高 |
| WARN | ○ | 中期（30日） | 中 |
| INFO | ○ | 短期（14日） | 中 |
| DEBUG | × | - | なし |

### コスト削減のベストプラクティス

**1. DEBUGは本番で出力しない**
```typescript
// LoggerImplで環境によりログレベルを制御
const logLevel = process.env.LOG_LEVEL ?? "INFO"; // 本番はINFO以上
```

**2. 大きなペイロードは要約**
```typescript
// NG: 大きなデータをそのまま出力
logger.info("一覧取得", { items });

// OK: 要約情報のみ
logger.info("一覧取得", { count: items.length, firstId: items[0]?.id });
```

**3. 高頻度操作はサンプリング検討**
```typescript
// ヘルスチェックなど高頻度操作はDEBUGに留める
logger.debug("ヘルスチェック実行");
```

## Do / Don't

### Do

```typescript
// クライアント操作起因のエラーはWARN
if (result.error.type === "NOT_FOUND") {
  logger.warn("リソースが見つかりません", { todoId: id });
  return result;
}

if (result.error.type === "FORBIDDEN") {
  logger.warn("アクセス権限がありません", { todoId: id, userId });
  return result;
}

// 想定外はERROR
logger.error("予期せぬエラー", result.error);

// 正常系の重要イベントはINFO
logger.info("TODO作成完了", { todoId: result.data.id });

// 詳細な操作はDEBUG
logger.debug("リポジトリ操作開始", { operation: "save", entity: "todo" });
```

### Don't

```typescript
// すべてのエラーをERRORにしない
catch (error) {
  logger.error("エラー発生", error); // NG: 分類していない
}

// INFOを乱用しない
logger.info("変数の値", { value }); // NG: DEBUGで十分

// ドメイン層でログを出力しない
class TodoEntity {
  complete() {
    logger.info("TODO完了"); // NG: ドメイン層はログ出力しない
    this.#status = "completed";
  }
}
```

## 関連ドキュメント

- `10-logger-overview.md`: Logger基盤概要
- `../../web/logger/11-log-level-strategy.md`: Web側Logger（同じ方針を適用）
- `../../../constitution/co-evolution/observability-principles.md`: 可観測性原則
