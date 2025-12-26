# Testing Utilities

テストおよび開発時に使用するモックデータとユーティリティを提供します。

## 📋 目次

1. [モックデータ](#モックデータ-mock-datats)
2. [MSWモックサーバー](#mswモックサーバー-mockts)

---

## モックデータ (mock-data.ts)

| 種類                   | 命名規則  | 用途                     | 特徴                     |
| ---------------------- | --------- | ------------------------ | ------------------------ |
| コンポーネントテスト用 | `mock*`   | `*.ct.test.tsx`          | 固定日付、最小限の構造   |
| スナップショット/MSW用 | `*Dummy*` | `*.ss.test.ts`, 開発環境 | 相対日付、リアルなデータ |

**時間の固定（重要）:**

```typescript
// スナップショットテストでは必ず時間を固定
await page.clock.install({ time: new Date("2025-01-15T03:00:00Z") });
```

---

## MSWモックサーバー (mock.ts)

Mock Service Worker (MSW) で開発環境のAPIをモック。`main.tsx`で自動起動。

**モード:**

- `HAS_ALL`: サンプルデータあり（デフォルト）
- `EMPTY`: データなし

**開発環境:** `src/config/config.local.ts` の `mockType` で設定

**テストでのモード指定:**

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

---

## 参考資料

- [Mock Service Worker (MSW)](https://mswjs.io/)
