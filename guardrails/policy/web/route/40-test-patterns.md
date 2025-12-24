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

### 3. 特定エンドポイントのオーバーライド（推奨）

**特定の条件のレスポンスが必要な場合は、`worker.use()`で固定データを返す**。ダミーデータ（`mock-data.ts`）への依存を減らし、テストの安定性を高める。

```typescript
// テストファイル内で固定データを定義
const fixedUserData = {
  id: "user-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  createdAt: "2024-10-17T03:00:00.000Z", // 固定日時
  updatedAt: "2025-01-05T03:00:00.000Z",
};

await page.addInitScript((userData) => {
  const checkMswAndSetHandlers = () => {
    const msw = (window as any).msw;
    if (!msw) {
      setTimeout(checkMswAndSetHandlers, 50);
      return;
    }
    msw.setHandlers("HAS_ALL");
    // 特定エンドポイントを固定データでオーバーライド
    msw.worker.use(
      msw.rest.get("*/users/me", (_req: any, res: any, ctx: any) => {
        return res(ctx.json(userData), ctx.status(200));
      }),
    );
  };
  checkMswAndSetHandlers();
}, fixedUserData); // 第2引数でブラウザに渡す
```

**利点**:
- ダミーデータ（`Date.now()`等の動的計算）に依存しない
- テスト条件がテストファイル内で完結し、可読性が高い
- `mock-data.ts`の変更でテストが壊れにくい

**複数エンドポイントのオーバーライド**:

```typescript
msw.worker.use(
  msw.rest.get("*/users/me", (_req: any, res: any, ctx: any) => {
    return res(ctx.json(fixedUser), ctx.status(200));
  }),
  msw.rest.get("*/todos", (_req: any, res: any, ctx: any) => {
    return res(ctx.json(fixedTodos), ctx.status(200)); // 配列も可
  }),
);
```

**使用すべきケース**:
- 日時表示があり、秒単位のズレがスナップショットに影響する場合
- 特定のステータスや条件のデータが必要な場合
- テストの再現性を確実に保証したい場合

### 4. ランダム要素の処理

ランダムに生成される要素（カラーパレット等）は、**マスク機能**で比較対象から除外する。

```typescript
// カラーパレットなどランダム要素をマスク
const colorOptions = await page.locator('[data-testid^="color-option-"]').all();
await expect(page).toHaveScreenshot({ fullPage: true, mask: colorOptions });
```

**目的**: プロダクションコードを変更せずにテストを安定化

**マスクの利点**:
- プロダクションの動作（ランダム生成）を維持
- テストコードに閉じた対応
- `Math.random`モックのタイミング問題を回避

### 5. 非同期処理の安定化

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
app/routes/({role})/{feature}/
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

### Outlet親ルートのテスト方針

**Outlet親ルート（`<Outlet>`を含む`route.tsx`）にはスナップショットテストを配置しない。**

```
app/routes/({role})/{feature}/[id]/
├── route.tsx             # Outlet親（テスト不要）
├── _index/
│   ├── route.tsx
│   └── route.ss.test.ts  # ✅ 親レイアウトも含めてテスト
└── edit/
    ├── route.tsx
    └── route.ss.test.ts  # ✅ 親レイアウトも含めてテスト
```

**理由**:
- 子ルートのスナップショットは親ルートのレイアウト（戻るボタン等）を含む
- 親ルート単独でのテストは重複となり保守コストが増加
- ローディング・エラー状態も子ルート経由でカバー可能

**Lintルール**: `local-rules/route/require-snapshot-test` が自動検知

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `20-colocation-patterns.md`: コロケーション（HOW）- テスト配置
- `../component/40-test-patterns.md`: コンポーネントテスト（CT）
- `../mock/10-mock-overview.md`: テストデータ命名規則
- `../mock/20-msw-patterns.md`: MSWハンドラーパターン
