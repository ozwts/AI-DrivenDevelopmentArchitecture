# Logger: ログレベル戦略

## 核心原則

ログレベルは**監視コストと問題検出のバランス**を最適化するために使い分ける。

**基本方針**:
- **ERROR**: 開発者が対応すべき予期せぬ問題のみ
- **WARN**: ユーザー操作に起因する想定内のエラー
- **INFO**: 正常系の重要イベント
- **DEBUG**: 開発時のデバッグ情報（本番では出力しない）

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
| 500系エラー（サーバーエラー） | サーバー側の不具合 |
| ネットワーク接続失敗 | インフラ問題の可能性 |
| 予期せぬ例外（想定外のcatch） | バグの可能性 |
| 認証トークンの検証失敗 | セキュリティ問題の可能性 |
| 必須リソースの読み込み失敗 | 設定・デプロイ問題 |

```typescript
// ERROR例
try {
  await api.todos.list();
} catch (error) {
  if (isNetworkError(error)) {
    logger.error("ネットワーク接続失敗", error);
  } else if (isServerError(error)) {
    logger.error("サーバーエラー", { status: error.status });
  }
}
```

### WARN: ユーザー操作に起因する想定内エラー

**定義**: ユーザーの操作により発生しうる想定内のエラー

**出力条件**:
- ユーザーの入力・操作が原因
- システムは正常に動作している
- ユーザーへのフィードバックで解決可能

**具体例**:
| 状況 | 理由 |
|------|------|
| 400系エラー（バリデーション失敗） | ユーザー入力の問題 |
| 401/403エラー（認証・認可失敗） | ユーザーの権限不足 |
| 404エラー（リソース未存在） | 削除済み or URLミス |
| フォームバリデーションエラー | 入力内容の問題 |
| セッション期限切れ | 長時間の非アクティブ |
| リトライ実行 | 一時的な通信問題 |

```typescript
// WARN例
try {
  await api.todos.update(id, data);
} catch (error) {
  if (isValidationError(error)) {
    logger.warn("バリデーションエラー", { fields: error.fields });
  } else if (isNotFoundError(error)) {
    logger.warn("リソースが見つかりません", { todoId: id });
  } else if (isAuthError(error)) {
    logger.warn("認証エラー", { status: error.status });
  } else {
    // 想定外のエラーはERROR
    logger.error("予期せぬエラー", error);
  }
}
```

### INFO: 正常系の重要イベント

**定義**: ユーザー行動の追跡や監査に必要な正常系イベント

**出力条件**:
- ユーザーの重要なアクション
- ビジネス上意味のある状態変化
- 監査・分析に有用

**具体例**:
| 状況 | 理由 |
|------|------|
| ログイン/ログアウト成功 | セキュリティ監査 |
| データ作成・更新・削除成功 | 操作履歴 |
| 重要な画面への遷移 | ユーザー行動分析 |
| 外部連携の成功 | 統合の健全性確認 |

```typescript
// INFO例
const handleCreateTodo = async (data: TodoInput) => {
  logger.info("TODO作成開始", { title: data.title });
  const result = await api.todos.create(data);
  logger.info("TODO作成成功", { todoId: result.id });
};
```

### DEBUG: 開発時デバッグ情報

**定義**: 開発時の問題調査に必要な詳細情報

**方針: 積極的に記録する**

DEBUGログは**開発環境で積極的に記録**する。本番では出力しないためコストに影響せず、開発時のAIによる問題診断を大幅に加速できる。

**積極的に出力すべき場面**:
- 処理の開始・終了（関数・フックの入口と出口）
- 条件分岐の結果（どのパスを通ったか）
- API呼び出しの詳細（リクエスト内容、レスポンス概要）
- state変更の前後（prevStateとnextState）
- ユーザー操作の詳細（クリック対象、入力値の概要）

**根拠**（可観測性原則）:
- AIがログから処理フローを再現し、問題箇所を自律的に特定できる
- 「何が起きたか」だけでなく「どう処理されたか」まで追跡可能
- 本番では出力しないため、パフォーマンス・コストへの影響なし

**具体例**:
| 状況 | 理由 |
|------|------|
| state変更の詳細 | 状態遷移の追跡 |
| API リクエスト/レスポンス詳細 | 通信内容の確認 |
| レンダリングタイミング | パフォーマンス調査 |
| 条件分岐の結果 | ロジックの確認 |

```typescript
// DEBUG例
const useProjects = () => {
  logger.debug("useProjects呼び出し", { userId });

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      logger.debug("API呼び出し開始");
      const result = await api.projects.list();
      logger.debug("API呼び出し完了", { count: result.length });
      return result;
    },
  });

  return query;
};
```

## Datadog導入時のコスト最適化

### ログボリュームの指針

| レベル | 本番出力 | インデックス | 保持期間 | コスト |
|--------|----------|--------------|----------|--------|
| ERROR | ○ | ○ | 長期（90日） | 高 |
| WARN | ○ | △（サンプリング） | 中期（30日） | 中 |
| INFO | ○ | △（サンプリング） | 短期（15日） | 中 |
| DEBUG | × | × | - | なし |

### コスト削減のベストプラクティス

**1. DEBUGは本番で出力しない**
```typescript
// buildLoggerの本番実装（将来）
if (import.meta.env.PROD) {
  return {
    debug: () => {}, // 本番では何もしない
    info: (msg, data) => datadogLogs.logger.info(msg, data),
    warn: (msg, data) => datadogLogs.logger.warn(msg, data),
    error: (msg, data) => datadogLogs.logger.error(msg, data),
  };
}
```

**2. 高頻度イベントはサンプリング**
```typescript
// スクロールなど高頻度イベントはログしない
// どうしても必要な場合はサンプリング
if (Math.random() < 0.01) { // 1%サンプリング
  logger.debug("スクロールイベント", { position });
}
```

**3. 大きなペイロードは要約**
```typescript
// NG: 大きなデータをそのまま出力
logger.info("リスト取得", { items });

// OK: 要約情報のみ
logger.info("リスト取得", { count: items.length, firstId: items[0]?.id });
```

**4. エラー以外はバッチ送信を検討**
- INFOログは即時送信不要
- バッファリングして定期送信でネットワークコスト削減

## 判断フローチャート

```
エラーが発生した場合:
├─ システムの不具合か？
│   ├─ YES → ERROR
│   └─ NO → ユーザー操作が原因か？
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

### 認証関連

| シナリオ | レベル | 理由 |
|----------|--------|------|
| ログイン成功 | INFO | 監査目的 |
| ログイン失敗（パスワード間違い） | WARN | ユーザー操作 |
| ログイン失敗（アカウントロック） | WARN | ユーザー操作の結果 |
| トークンリフレッシュ成功 | DEBUG | 正常動作の詳細 |
| トークンリフレッシュ失敗 | ERROR | システム問題の可能性 |
| 不正なトークン検出 | ERROR | セキュリティ問題 |

### API通信

| シナリオ | レベル | 理由 |
|----------|--------|------|
| リクエスト送信 | DEBUG | 開発用詳細 |
| 2xx成功 | INFO/DEBUG | 重要度による |
| 400 Bad Request | WARN | ユーザー入力問題 |
| 401 Unauthorized | WARN | 認証切れ |
| 403 Forbidden | WARN | 権限不足 |
| 404 Not Found | WARN | リソース不存在 |
| 429 Too Many Requests | WARN | レート制限 |
| 500 Internal Server Error | ERROR | サーバー問題 |
| 502/503/504 | ERROR | インフラ問題 |
| ネットワークエラー | ERROR | 接続問題 |
| タイムアウト | WARN/ERROR | 頻度による |

### フォーム操作

| シナリオ | レベル | 理由 |
|----------|--------|------|
| フォーム送信開始 | INFO | 操作追跡 |
| バリデーションエラー（クライアント） | DEBUG | UI詳細 |
| バリデーションエラー（サーバー） | WARN | 想定内エラー |
| 送信成功 | INFO | 操作完了 |
| 送信失敗（サーバーエラー） | ERROR | システム問題 |

## Do / Don't

### ✅ Do

```typescript
// ユーザー操作起因のエラーはWARN
try {
  await api.todos.delete(id);
} catch (error) {
  if (error.status === 404) {
    logger.warn("削除対象が見つかりません", { todoId: id });
    return;
  }
  if (error.status === 403) {
    logger.warn("削除権限がありません", { todoId: id });
    return;
  }
  // 想定外はERROR
  logger.error("TODO削除で予期せぬエラー", error);
}

// 正常系の重要イベントはINFO
logger.info("TODO削除成功", { todoId: id });

// 詳細な状態変化はDEBUG
logger.debug("削除ダイアログ表示", { todoId: id, todoTitle });
```

### ❌ Don't

```typescript
// すべてのエラーをERRORにしない
catch (error) {
  logger.error("エラー発生", error); // NG: 分類していない
}

// INFOを乱用しない
logger.info("ボタンクリック"); // NG: DEBUGで十分
logger.info("state更新", { newValue }); // NG: DEBUGで十分

// 高頻度イベントをログしない
window.addEventListener("scroll", () => {
  logger.debug("スクロール", { position }); // NG: 大量のログ
});
```

## 関連ドキュメント

- `10-logger-overview.md`: Logger基盤概要
- `../../server/logger/`: サーバー側Logger（同じ方針を適用）
