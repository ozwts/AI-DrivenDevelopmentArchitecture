# Testing Utilities

テストおよび開発時に使用するモックデータとユーティリティを提供します。

## 概要

このディレクトリには以下の2つの主要な機能があります：

1. **モックデータの定義** - テストで使用する再現可能なダミーデータ
2. **MSWモックサーバー** - 開発時のAPIモック

## ディレクトリ構成

```
testing-utils/
├── README.md          # このファイル
├── mock-data.ts       # モックデータ定義
└── mock.ts            # MSW モックサーバー設定
```

---

## モックデータ (mock-data.ts)

テストの種類に応じて2つのデータセットを提供しています。

### 1. コンポーネントテスト用データ

**用途**: Playwrightコンポーネントテスト（`*.ct.test.tsx`）

**特徴**:

- 完全に固定された日付を使用
- シンプルで最小限のデータ構造
- 予測可能性を重視

**命名規則**: `mock*` (例: `mockUser`, `mockProject`, `mockTodo`)

### 2. スナップショットテスト / モックサーバー用データ

**用途**:

- Playwrightスナップショットテスト（`*.ss.test.ts`）
- 開発用モックサーバー

**特徴**:

- 動的な相対日付（`Date.now()` ベース）
- リアルなデータ内容
- 複数のバリエーション

**命名規則**: `*Dummy*` (例: `UserDummy1`, `TodoDummy1`)

### 日付の扱い

スナップショットテスト用データは相対的な日付計算を使用しているため、テスト実行時にブラウザ側の時間を固定する必要があります。

**Playwrightでの時間固定**:

```typescript
// テスト内で時間を固定
await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });
```

これにより、以下が安定します：

- 相対的な日付表示（「3日前」「残り2日」など）
- タイムスタンプのソート順
- 期限ベースのフィルタリング

---

## MSWモックサーバー (mock.ts)

### 概要

Mock Service Worker (MSW) を使用して、開発環境でAPIレスポンスをモックします。

### 自動起動

開発サーバー起動時に自動的に有効化されます（`main.tsx`で初期化）。

### モックの範囲

以下のエンドポイントをモックします：

- ユーザー関連API
- プロジェクト関連API
- TODO関連API

### モード

- **HAS_ALL**: サンプルデータあり（デフォルト）
- **EMPTY**: データなし（CRUD操作は可能）

開発環境: `src/config.local.ts` の `mockType` で設定

**テストでのモード指定（重要）**:

```typescript
// スナップショットテストでは必ずモードを明示的に指定
await page.addInitScript(() => {
  const checkMswAndSetHandlers = () => {
    const msw = (window as any).msw;
    if (!msw) {
      setTimeout(checkMswAndSetHandlers, 50);
      return;
    }
    msw.setHandlers("HAS_ALL"); // または "EMPTY"
  };
  checkMswAndSetHandlers();
});
```

---

## スナップショットテストのベストプラクティス

### 1. 時間の固定

日付に依存する表示がある場合、必ずブラウザ時間を固定してください。

**固定される要素**:

- `Date.now()`, `new Date()`
- `setTimeout()`, `setInterval()`
- 相対的な日付計算

### 2. ランダム値の固定

ランダムに生成される要素（色、ID等）は `Math.random()` をモックして固定します。

**方法**:

```typescript
await page.addInitScript(() => {
  const fixedValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  let counter = 0;
  Math.random = () => fixedValues[counter++ % fixedValues.length];
});
```

### 3. 非同期処理の完了待機

スナップショット取得前に、必要なリソースの読み込みとレンダリングが完了していることを確認してください。

**推奨される待機方法**:

- `page.waitForLoadState("networkidle")` - ネットワークアイドル待機
- `page.waitForSelector('[role="dialog"]')` - 特定要素の表示待機

---

## テストコマンド

### コンポーネントテスト

```bash
npm run test:ct        # 実行
npm run test:ct:ui     # UIモードで実行
```

### スナップショットテスト

```bash
npm run test:ss             # 実行
npm run test:ss:update      # スナップショット更新
npm run test:ss:refresh     # スナップショット再生成（削除 + 更新）
npm run test:ss:ui          # UIモードで実行
```

### すべてのテスト

```bash
npm run test
```

---

## トラブルシューティング

### スナップショットテストが不安定

**症状**: 同じコードでスナップショットの差分が発生

**主な原因**:

1. **時間依存の表示** → `page.clock.install()` で時間固定
2. **ランダム値の生成** → `Math.random()` のモック
3. **非同期処理未完了** → 適切な待機処理の追加

### モックサーバーが動作しない

**確認事項**:

1. Service Workerファイルの存在確認（`public/mockServiceWorker.js`）
2. ブラウザコンソールでMSW起動ログの確認
3. モックサーバー初期化コードの確認

**再インストール**:

```bash
npx msw init public/ --save
```

---

## アーキテクチャ原則

### データの分離

コンポーネントテスト用とスナップショットテスト用でデータを分離することで、それぞれのテストの目的に最適化されたデータ構造を維持します。

### 時間の決定性

スナップショットテストでは、Playwrightの`clock` APIを使用して時間を制御し、テストの再現性を確保します。

### モックの透過性

MSWを使用することで、実装コードを変更せずにAPIレスポンスをモックできます。これにより、本番コードとテストコードの分離が保たれます。

---

## 参考資料

- [Playwright Documentation](https://playwright.dev/)
- [Mock Service Worker (MSW)](https://mswjs.io/)
- [Playwright Clock API](https://playwright.dev/docs/clock)
