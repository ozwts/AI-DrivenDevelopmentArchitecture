# テストカバレッジ要件

## 核心原則

コンポーネントとテストは1対1で対応する。テストのない実装は存在してはならない。

## 必須ルール

### ルール1: コンポーネントテスト

`{Name}.tsx` → `{Name}.ct.test.tsx` が必須

### ルール2: スナップショットテスト

`{Feature}Page.tsx` → `{Feature}Page.ss.test.ts` が必須

## 例外（テスト不要）

- `index.ts`
- `constants.ts`, `types.ts`, `*.d.ts`

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
