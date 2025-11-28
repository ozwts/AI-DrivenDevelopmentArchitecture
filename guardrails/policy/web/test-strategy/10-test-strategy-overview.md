# テスト戦略の全体像

## 核心原則

**テスタビリティ最優先**: 全てのページ固有コンポーネントは独立してテスト可能でなければならない

## テストタイプと役割分担（MECE）

| テストタイプ           | 対象                       | 目的                     | 粒度              | 検証内容                           |
| ---------------------- | -------------------------- | ------------------------ | ----------------- | ---------------------------------- |
| コンポーネントテスト   | 全ページ固有コンポーネント | 機能・a11y・ロジック検証 | 1機能=1テスト     | 入力、バリデーション、コールバック |
| スナップショットテスト | ページ全体                 | 視覚的回帰検出           | 1画面状態=1テスト | レイアウト、スタイル、表示内容     |

## セレクタ戦略の二重構造

### 基本方針

- **操作**: `data-testid` （安定性・国際化対応）
- **検証**: `getByRole`, `getByLabel` （アクセシビリティ保証）
- **動的コンテンツ**: `getByText` （必ずコメント付き）

### 命名規則

```
data-testid="{action}-button"     // create-button, submit-button, cancel-button
data-testid="input-{name}"        // input-title, input-email
data-testid="{type}-{id}"         // todo-card-123, todo-detail-button
data-testid="{name}-section"      // file-upload-section
```

### 使い分けの実例

```typescript
// ✅ 操作: data-testid（安定性）
const submitButton = component.getByTestId("submit-button");
await submitButton.click();

// ✅ 検証: getByRole（アクセシビリティ）
await expect(submitButton).toHaveRole("button");
await expect(submitButton).toHaveAttribute("type", "submit");

// ✅ コールバック検証: getByRole with name
await component.getByRole("button", { name: "編集" }).click();

// ✅ 動的コンテンツ: getByText（コメント必須）
// ファイル名は動的コンテンツのためgetByTextを使用
await expect(component.getByText("test.txt")).toBeVisible();
```

## 必須ルール

### テストカバレッジ要件

**コンポーネントとテストは1対1で対応する。テストのない実装は存在してはならない。**

1. **コンポーネントテスト**: `{Name}.tsx` → `{Name}.ct.test.tsx` が必須
2. **スナップショットテスト**: `{Feature}Page.tsx` → `{Feature}Page.ss.test.ts` が必須

**例外（テスト不要）:**
- `index.ts`
- `constants.ts`, `types.ts`, `*.d.ts`

### テスト実装要件

1. **操作には `data-testid`、検証には `getByRole`/`getByLabel` を使用**
2. **バリデーションは境界値とエラー条件の両方を網羅**
3. **動的コンテンツに `getByText` を使う場合は、必ずコメントで理由を記載**

## 典型的なページ構成

### シンプルなページ

```
HomePage/
├── HomePage.tsx
├── HomePage.ss.test.ts
└── index.ts
```

### CRUD機能

```
TodosPage/
├── TodosPage.tsx
├── TodoCard.tsx
├── TodoCard.ct.test.tsx
├── TodoForm.tsx
├── TodoForm.ct.test.tsx
├── TodosPage.ss.test.ts
└── index.ts
```

### 複雑な機能

```
TodosPage/
├── TodosPage.tsx
├── TodoCard.tsx
├── TodoCard.ct.test.tsx
├── TodoForm.tsx
├── TodoForm.ct.test.tsx
├── FileUploadSection.tsx
├── FileUploadSection.ct.test.tsx
├── AttachmentList.tsx
├── AttachmentList.ct.test.tsx
├── TodosPage.ss.test.ts
└── index.ts
```

## テスト戦略の思想

### 1. アクセシビリティ保証

- role/label属性の検証を必須化
- スクリーンリーダー対応の検証
- キーボード操作可能性の担保

### 2. 国際化対応

- `data-testid` を優先してテキストセレクタを最小化
- 言語変更に強いテストコード

### 3. 決定論的テスト

- 時間・ランダム値を固定して再現性を保証
- MSWでAPIレスポンスを制御
- `waitForLoadState("networkidle")` で非同期処理を安定化

### 4. 境界値網羅

- エラー条件（空、超過）
- 成功条件（最小値、最大値）
- 両方のケースを必ず検証
