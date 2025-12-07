# スナップショットテスト（*.ss.test.ts）

## 核心原則

ルート単位のスナップショットテストで**視覚的回帰を検出**する。1画面状態 = 1テスト。

**根拠となる憲法**:
- `testing-principles.md`: 決定論的テスト
- `module-cohesion-principles.md`: テストのコロケーション

## テスト粒度: 1画面状態 = 1テスト

### 分割基準

- **ページ状態**: 通常、空、ローディング、エラー
- **モーダル・ダイアログ**: 作成、編集、削除確認、詳細表示
- **フィルター・検索結果**: ステータスフィルター、プロジェクトフィルター
- **データ有無**: 添付ファイルあり/なし、リストあり/なし

### Do / Don't

```typescript
// ✅ Good: 画面状態ごとに分割
test("[SS]TODOページ", async ({ page }) => { ... });
test("[SS]TODOページ（空）", async ({ page }) => { ... });
test("[SS]TODOページ（モーダル表示）", async ({ page }) => { ... });
test("[SS]TODOページ（詳細モーダル・添付ファイルあり）", async ({ page }) => { ... });

// ❌ Bad: 細かすぎる分割
test("[SS]ボタン表示", async ({ page }) => { ... }); // 通常状態に含まれる
test("[SS]リスト表示", async ({ page }) => { ... }); // 通常状態に含まれる
```

## 決定論的テストの実現

### 1. 時間固定

```typescript
await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });
```

**目的**: 相対的な時刻表示（"2日前"、"期限切れ"）を固定

### 2. MSWモード切り替え

```typescript
await page.addInitScript(() => {
  const checkMswAndSetHandlers = () => {
    const msw = (window as any).msw;
    if (!msw) {
      setTimeout(checkMswAndSetHandlers, 50);
      return;
    }
    msw.setHandlers("HAS_ALL"); // or "EMPTY"
  };
  checkMswAndSetHandlers();
});
```

**目的**: APIレスポンスを制御（データあり/なし）

### 3. ランダム値固定

```typescript
await page.addInitScript(() => {
  let counter = 0;
  const fixedRandomValues = [0.12345, 0.23456, 0.34567, 0.45678, 0.56789, 0.6789];
  Math.random = () => {
    const value = fixedRandomValues[counter % fixedRandomValues.length];
    counter++;
    return value;
  };
});
```

**目的**: ランダムな色選択などを固定

### 4. 非同期処理の安定化

```typescript
await page.goto("/todos");
await page.waitForLoadState("networkidle");
```

**目的**: 全ての非同期処理が完了してからスクリーンショットを取得

## テストテンプレート

### 基本パターン

```typescript
test("[SS]TODOページ", async ({ page }) => {
  // 1. 時間固定
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // 2. MSW設定
  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
    };
    checkMswAndSetHandlers();
  });

  // 3. ページ遷移
  await page.goto("/todos");
  await page.waitForLoadState("networkidle");

  // 4. スクリーンショット（検証はこれのみ）
  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

### 空状態パターン

```typescript
test("[SS]TODOページ（空の状態）", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("EMPTY"); // 空データ
    };
    checkMswAndSetHandlers();
  });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

### フィルター適用パターン

```typescript
test("[SS]TODOページ（TODOフィルター）", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
    };
    checkMswAndSetHandlers();
  });

  // URLパラメータでフィルター指定
  await page.goto("/todos?status=TODO");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

### モーダル表示パターン

```typescript
test("[SS]TODOページ（作成モーダル）", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("HAS_ALL");
    };
    checkMswAndSetHandlers();
  });

  await page.goto("/todos");
  await page.waitForLoadState("networkidle");

  // モーダルを開く
  await page.getByTestId("create-todo-button").click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

## 重要な原則

### スクリーンショット = 唯一の検証

```typescript
// ✅ Good: スクリーンショットのみ
await expect(page).toHaveScreenshot({ fullPage: true });

// ❌ Bad: 冗長な検証
await expect(page.getByText("TODOリスト")).toBeVisible(); // 不要
await expect(page).toHaveScreenshot({ fullPage: true });
```

**理由**: スクリーンショットが全ての表示を証明するため、個別の `toBeVisible()` は不要

### fullPage: true を必須化

```typescript
// ✅ Good: ページ全体
await expect(page).toHaveScreenshot({ fullPage: true });

// ❌ Bad: viewport内のみ
await expect(page).toHaveScreenshot(); // スクロール領域が欠ける
```

### アクセシビリティ検証は不要

コンポーネントテストで実施済みのため、スナップショットテストでは不要。

## ファイル配置

```
app/routes/{feature}+/
├── route.tsx             # ルートコンポーネント
├── route.ss.test.ts      # スナップショットテスト（route.tsxに対応）
└── components/
    ├── {Component}.tsx
    └── {Component}.ct.test.tsx  # コンポーネントテスト
```

### 命名規則

| テスト種別 | ファイル名 | 配置場所 |
|-----------|-----------|----------|
| スナップショット（ルート） | `route.ss.test.ts` | ルートディレクトリ直下 |
| コンポーネント | `{Component}.ct.test.tsx` | `components/`内 |

**根拠**: `route.tsx` がエントリーポイントなので、テストも `route.ss.test.ts` で統一。ディレクトリ名で機能を識別できる。

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `../component/30-test-patterns.md`: コンポーネントテスト（CT）
- `../mock/10-mock-overview.md`: テストデータ命名規則
- `../mock/20-msw-patterns.md`: MSWハンドラーパターン
