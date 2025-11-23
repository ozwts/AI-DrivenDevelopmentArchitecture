# スナップショットテスト（\*.ss.test.ts）

## テスト粒度: 1画面状態 = 1テスト

### 分割基準

- **ページ状態**: 通常、空、ローディング、エラー
- **モーダル・ダイアログ**: 作成、編集、削除確認、詳細表示
- **フィルター・検索結果**: ステータスフィルター、プロジェクトフィルター
- **データ有無**: 添付ファイルあり/なし、リストあり/なし

### Good vs Bad

```typescript
// ✅ Good: 画面状態ごとに分割
test("[SS]TODOページ", async ({ page }) => { ... });
test("[SS]TODOページ（空）", async ({ page }) => { ... });
test("[SS]TODOページ（モーダル表示）", async ({ page }) => { ... });
test("[SS]TODOページ（TODOフィルター）", async ({ page }) => { ... });
test("[SS]TODOページ（詳細モーダル・添付ファイルあり）", async ({ page }) => { ... });
test("[SS]TODOページ（詳細モーダル・添付ファイルなし）", async ({ page }) => { ... });

// ❌ Bad: 細かすぎる分割
test("[SS]ボタン表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
test("[SS]リスト表示", async ({ page }) => { ... }); // ← 通常状態に含まれる
```

## 決定論的テストの実現

### 1. 時間固定

```typescript
// ブラウザの時間を固定 (2025-01-15 12:00:00 JST)
await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });
```

**目的**: 相対的な時刻表示（"2日前"、"期限切れ"）を固定

### 2. MSWモード切り替え

```typescript
// MSWハンドラーをHAS_ALLモードに設定
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
// Math.random() を固定値に置き換え（色のランダム生成を固定）
await page.addInitScript(() => {
  let counter = 0;
  const fixedRandomValues = [
    0.12345, 0.23456, 0.34567, 0.45678, 0.56789, 0.6789,
  ];
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
// ページ遷移
await page.goto("/todos");
await page.waitForLoadState("networkidle"); // ← 全ネットワーク処理完了を待機

// 操作後
await page.getByTestId("create-todo-button").click();
await page.waitForLoadState("networkidle"); // ← モーダルレンダリング完了を待機
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

### 空状態のパターン

```typescript
test("[SS]TODOページ（空の状態）", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  // MSWハンドラーを空データに切り替え
  await page.addInitScript(() => {
    const checkMswAndSetHandlers = () => {
      const msw = (window as any).msw;
      if (!msw) {
        setTimeout(checkMswAndSetHandlers, 50);
        return;
      }
      msw.setHandlers("EMPTY"); // ← 空データ
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

  // 新規作成ボタンをクリック
  await page.getByTestId("create-todo-button").click();

  // モーダルのレンダリング完了を待機
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

### ランダム値固定パターン

```typescript
test("[SS]プロジェクトページ（作成モーダル）", async ({ page }) => {
  // Math.random() を固定値に置き換え（色のランダム生成を固定）
  await page.addInitScript(() => {
    let counter = 0;
    const fixedRandomValues = [
      0.12345, 0.23456, 0.34567, 0.45678, 0.56789, 0.6789,
    ];
    Math.random = () => {
      const value = fixedRandomValues[counter % fixedRandomValues.length];
      counter++;
      return value;
    };
  });

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

  await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });

  await page.goto("/projects");
  await page.waitForLoadState("networkidle");

  await page.getByTestId("create-project-button").click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

### データ有無の切り替えパターン

```typescript
test("[SS]TODOページ（詳細モーダル・添付ファイルあり）", async ({ page }) => {
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

  // 最初のカードの詳細を開く（添付ファイルあり）
  await page.getByTestId("todo-detail-button").first().click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});

test("[SS]TODOページ（詳細モーダル・添付ファイルなし）", async ({ page }) => {
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

  // 2番目のカードの詳細を開く（添付ファイルなし）
  await page.getByTestId("todo-detail-button").nth(1).click();
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot({ fullPage: true });
});
```

## 重要な原則

### スクリーンショット = 唯一の検証

```typescript
// ✅ Good: スクリーンショットのみ
await expect(page).toHaveScreenshot({ fullPage: true });

// ❌ Bad: 冗長な検証（スクリーンショットに含まれる）
await expect(page.getByText("TODOリスト")).toBeVisible();
await expect(page).toHaveScreenshot({ fullPage: true });
```

**理由**: スクリーンショットが全ての表示を証明するため、個別の `toBeVisible()` は不要

### アクセシビリティ検証は不要

コンポーネントテストで実施済みのため、スナップショットテストでは不要

### fullPage: true を必須化

```typescript
// ✅ Good: ページ全体のスクリーンショット
await expect(page).toHaveScreenshot({ fullPage: true });

// ❌ Bad: viewport内のみ（スクロール領域が欠ける）
await expect(page).toHaveScreenshot();
```
