# Web - フロントエンド

React + Vite + TailwindCSSを使用したモダンなフロントエンドアプリケーション。

## 技術スタック

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **State Management**: TanStack Query (React Query) 4
- **Form**: React Hook Form 7 + Zod 3 (バリデーション)
- **Routing**: React Router 6
- **HTTP Client**: カスタムAPIクライアント (fetchベース)
- **Code Generation**: openapi-zod-client (Zodスキーマ + TypeScript型定義)
- **Mock Server**: MSW (Mock Service Worker) 1.3
- **Testing**: Playwright 1.56 (コンポーネントテスト + スナップショットテスト)
- **Icons**: Heroicons 2

## ディレクトリ構成

```
web/
├── public/             # 静的ファイル（MSW Service Worker含む）
├── src/
│   ├── api/            # APIクライアント（カスタム実装）
│   ├── components/     # 共有コンポーネント
│   ├── generated/      # OpenAPI自動生成（Zodスキーマ + TypeScript型定義）
│   ├── hooks/          # カスタムフック（TanStack Query）
│   ├── pages/          # ページコンポーネント（ページ固有コンポーネント含む）
│   ├── routes/         # React Router設定
│   ├── testing-utils/  # MSW モックハンドラ
│   ├── config/         # 環境別設定（dev, local, mock）
│   └── main.tsx        # エントリーポイント
└── package.json
```

## コマンド

### 開発

```bash
# MSWモックサーバーで開発（バックエンド不要）
npm run dev:local

# AWS APIに接続して開発（デプロイ済みバックエンド必要）
npm run dev

# コード生成（OpenAPI → Zodスキーマ + TypeScript型定義）
npm run codegen

# すべてのテスト実行（コンポーネント + スナップショット）
npm test

# コンポーネントテストのみ
npm run test:ct

# スナップショットテストのみ
npm run test:ss

# テストUIモード
npm run test:ct:ui   # コンポーネントテスト
npm run test:ss:ui   # スナップショットテスト
```

### バリデーション

```bash
# TypeScript + ESLint
npm run validate

# TypeScriptのみ
npm run validate:tsc

# ESLintのみ
npm run validate:lint

# Prettierフォーマットチェック
npm run validate:format
```

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルドプレビュー
npm run preview
```

### フォーマット

```bash
# すべて修正
npm run fix

# Prettier修正
npm run fix:format

# ESLint修正
npm run fix:lint
```

## 開発モードの使い分け

### `npm run dev:local` - MSWモックモード（推奨）

**用途:**

- UI開発、デザイン調整
- フロントエンド単体の開発
- バックエンドAPIが未実装の場合

**特徴:**

- `config/config.local.ts` を使用（`mockType: "HAS_ALL"`）
- `testing-utils/mock.ts` のMSWハンドラでAPIをモック
- バックエンド不要で完全に独立して開発可能
- ブラウザの開発者ツールでMSWのログが確認できる

**モックデータの編集:**

```typescript
// src/testing-utils/mock.ts
const TodoDummy1: TodoResponse = {
  id: "1",
  title: "データベース設計を完了する",
  // ... モックデータを編集
};
```

### `npm run dev` - AWS API接続モード

**用途:**

- バックエンドとの統合テスト
- 実際のデータでの動作確認
- デプロイ前の最終確認

**特徴:**

- `config/config.dev.ts` を使用（AWS API GatewayのURLを指定）
- 実際のバックエンドAPIに接続
- DynamoDBの実データを使用

**API URLの設定:**

```typescript
// src/config/config.dev.ts
export const config: Config = {
  apiUrl: "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com",
};
```

## スキーマバリデーション

### Zodスキーマ（自動生成）

フォームバリデーションにはOpenAPIから自動生成されたZodスキーマを使用：

```typescript
// src/generated/zod-schemas.ts (自動生成 - 直接編集しない)
import { z } from "zod";

export const TodoStatus = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
export const TodoPriority = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const RegisterTodoParams = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    status: TodoStatus.optional(),
    priority: TodoPriority.optional(),
    dueDate: z.string().datetime({ offset: true }).optional(),
    projectId: z.string().optional(),
    assigneeUserId: z.string().optional(),
  })
  .passthrough();

export const schemas = {
  TodoStatus,
  TodoPriority,
  RegisterTodoParams,
  // ... その他のスキーマ
};
```

**重要:** このファイルは `npm run codegen` で自動生成されます。手動編集は禁止です。

### 型推論パターン

```typescript
import { z } from "zod";
import { schemas } from "../generated/zod-schemas";

// Zodスキーマから型を推論
type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;
```

### React Hook Form統合

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<RegisterTodoParams>({
  resolver: zodResolver(schemas.RegisterTodoParams),
});
```

## コンポーネントアーキテクチャ

### ページ固有コンポーネント（推奨）

まずページディレクトリ内にコンポーネントを作成：

```
pages/TodosPage/
  TodosPage.tsx      # メインページ
  TodoCard.tsx       # TodosPageでのみ使用
  TodoForm.tsx       # TodosPageでのみ使用
  index.ts
```

### 共有コンポーネント

2つ以上のページで使用する場合のみ `components/` に移動：

```
components/
  Button.tsx         # 複数ページで使用
  Modal.tsx          # 複数ページで使用
  Input.tsx          # 複数ページで使用
  index.ts
```

## デザイン原則

すべてのUIは4つのデザイン原則に従う：

### 1. 整列 (Alignment)

- 要素を視覚的に結びつける
- Tailwindスペーシングスケールで一貫性を保つ

### 2. 近接 (Proximity)

- 関連要素をグループ化
- `gap-4`, `gap-6` などで一貫したスペーシング

### 3. コントラスト (Contrast)

- フォントサイズ: `text-3xl` (見出し), `text-base` (本文)
- フォントの太さ: `font-bold`, `font-normal`
- 色: `text-text-dark`, `text-text-light`

### 4. 反復 (Repetition)

- デザイン要素を繰り返して一貫性を保つ
- ボタンスタイル、カードレイアウトの統一

## TailwindCSSデザインシステム

`tailwind.config.js` のデザイントークンを使用：

```typescript
// ✅ 良い例
<div className="bg-background-surface text-text-dark">

// ❌ 悪い例（任意の値は使わない）
<div className="bg-[#ffffff] text-[#000000]">
```

## TanStack Query パターン

### データ取得

```typescript
import { apiClient } from "../api/client";
import { z } from "zod";
import { schemas } from "../generated/zod-schemas";

type TodoStatus = z.infer<typeof schemas.TodoStatus>;

export const useTodos = (filters?: { status?: TodoStatus }) => {
  return useQuery({
    queryKey: ["todos", filters],
    queryFn: () => apiClient.getTodos(filters),
  });
};
```

### ミューテーション

```typescript
import { z } from "zod";
import { schemas } from "../generated/zod-schemas";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterTodoParams) => apiClient.createTodo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};
```

## コンポーネントテスト

Playwright Component Testingを使用してReactコンポーネントを単体テスト。

### テスト実行

```bash
# コンポーネントテスト実行
npm test

# UIモードでテスト
npm run test:ui

# 特定のテストファイルのみ実行
npx playwright test -c playwright-ct.config.ts src/components/Button.test.tsx
```

### テストの書き方

```typescript
// src/components/Button.test.tsx
import { test, expect } from "@playwright/experimental-ct-react";
import { Button } from "./Button";

test("Button renders correctly", async ({ mount }) => {
  const component = await mount(<Button>Click me</Button>);
  await expect(component).toContainText("Click me");
});

test.describe("Input Component", () => {
  test("ラベルが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <Input label="テスト入力" placeholder="入力してください" />
    );
    await expect(component.getByText("テスト入力")).toBeVisible();
  });

  test("ラベルとinputが正しく関連付けられている（アクセシビリティ）", async ({ mount }) => {
    const component = await mount(
      <Input label="ユーザー名" placeholder="名前を入力" />
    );

    // getByLabelでinputが見つかることを確認（htmlFor属性が正しく設定されている）
    const input = component.getByLabel("ユーザー名");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "名前を入力");
  });

  test("エラーメッセージが表示される", async ({ mount }) => {
    const component = await mount(
      <Input label="テスト入力" error="エラーメッセージ" />
    );
    await expect(component.getByText("エラーメッセージ")).toBeVisible();
  });
});
```

### テストパターン

**基本レンダリング:**

- コンポーネントが正しく表示されるか
- Props通りのテキストが表示されるか

**アクセシビリティ:**

- ラベルとフォーム要素の関連付け（`getByLabel`で要素が見つかるか）
- ARIA属性の正しさ
- 必須項目のマーク（アスタリスク等）

**条件付きレンダリング:**

- エラー状態での表示
- ヘルパーテキストとエラーの排他制御
- required属性による表示変化

**インタラクション:**

- ボタンクリック、フォーム入力などのユーザーアクション
- イベントハンドラの動作確認

### テスト対象

- **共有コンポーネント** (`src/components/`): 必須
  - Button, Input, Select, Textarea, Modal など
  - 複数のページで使用されるため、品質保証が重要

- **ページ固有のフォームコンポーネント** (`src/pages/*/`): 推奨
  - TodoForm, ProjectForm, ProfileEditForm など
  - 複雑なバリデーションロジックがある場合

- **ページ全体**: 通常は不要
  - E2Eテストでカバー

## トラブルシューティング

### MSWが動作しない

```bash
# Service Workerを再生成
npx msw init public/ --save

# ブラウザのキャッシュをクリア
```

### スキーマテストが失敗する

```bash
# テストキャッシュをクリア
rm -rf test-results playwright-report

# 再実行
npm test
```

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules
npm ci

# TypeScript検証
npm run validate:tsc
```

## 詳細実装パターン

このセクションでは、フロントエンド実装で頻繁に使用されるパターンの詳細を説明します。

### モックデータパターン（MSW）

MSW (Mock Service Worker) を使用してAPIレスポンスをモック。このパターンに必ず従うこと：

```typescript
// src/testing-utils/mock.ts
import { setupWorker, rest } from "msw";
import urlJoin from "url-join";
import { z } from "zod";
import { config } from "../config";
import { schemas } from "../generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type UsersResponse = z.infer<typeof schemas.UsersResponse>;

// 生成された型を使用したダミーデータ
const UserDummy1: UserResponse = {
  id: "1",
  sub: "cognito-sub-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const UserDummy2: UserResponse = {
  id: "2",
  sub: "cognito-sub-2",
  name: "佐藤花子",
  email: "sato@example.com",
  emailVerified: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const allUsers = [UserDummy1, UserDummy2];
let users = [...allUsers];

// GETハンドラ
export const UsersResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/users"), (req, res, ctx) => {
    return res(
      ctx.json(users satisfies UsersResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// POSTハンドラ
export const CreateUserResponseDummy = [
  rest.post(urlJoin(config.apiUrl, "/users"), async (req, res, ctx) => {
    const body = await req.json();
    const newUser: UserResponse = {
      id: String(users.length + 1),
      sub: `cognito-sub-${users.length + 1}`,
      name: body.name,
      email: body.email,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(newUser);
    return res(
      ctx.json(newUser satisfies UserResponse),
      ctx.delay(100),
      ctx.status(201),
    );
  }),
];

// DELETEハンドラ
export const DeleteUserResponseDummy = [
  rest.delete(urlJoin(config.apiUrl, "/users/:id"), (req, res, ctx) => {
    const { id } = req.params;
    users = users.filter((user) => user.id !== id);
    return res(ctx.status(204));
  }),
];

// startMockServer関数を更新
export const startMockServer = async () => {
  let response: any[] = [];

  switch (config.mockType ?? "HAS_ALL") {
    case "HAS_ALL":
      response = [
        ...UsersResponseDummy,
        ...CreateUserResponseDummy,
        ...DeleteUserResponseDummy,
        // ... その他のハンドラ
      ];
      break;
    default:
      response = [...UsersResponseDummy, ...CreateUserResponseDummy];
      break;
  }

  const worker = setupWorker(...response);
  await worker.start();
};
```

**重要なポイント:**

- `satisfies` 演算子で型安全性を確保
- `ctx.delay(100)` でネットワーク遅延をシミュレート
- 状態管理（`let users`）で CRUD 操作を実現
- `config.mockType` で異なるシナリオを切り替え

### ラベル定数の定義パターン

Enum値を日本語ラベルにマッピング：

```typescript
// src/constants/labels.ts
import { z } from "zod";
import { schemas } from "../generated/zod-schemas";

type TodoStatus = z.infer<typeof schemas.TodoStatus>;
type TodoPriority = z.infer<typeof schemas.TodoPriority>;

// ステータスのラベルペア（Select/Badge表示用）
export const STATUS_VALUE_LABEL_PAIRS: [value: TodoStatus, label: string][] = [
  ["TODO", "未着手"],
  ["IN_PROGRESS", "進行中"],
  ["DONE", "完了"],
];

// 優先度のラベルペア
export const PRIORITY_VALUE_LABEL_PAIRS: [
  value: TodoPriority,
  label: string,
][] = [
  ["LOW", "低"],
  ["MEDIUM", "中"],
  ["HIGH", "高"],
];

// ヘルパー関数
export const getStatusLabel = (status: TodoStatus): string => {
  const pair = STATUS_VALUE_LABEL_PAIRS.find(([value]) => value === status);
  return pair ? pair[1] : status;
};
```

**使用例:**

```typescript
// Selectコンポーネントでの使用
<Select label="ステータス" {...register("status")}>
  <option value="">選択してください</option>
  {STATUS_VALUE_LABEL_PAIRS.map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</Select>

// Badgeコンポーネントでの使用
<Badge>{getStatusLabel(todo.status)}</Badge>
```

### レスポンシブデザインパターン

モバイルファーストアプローチでレスポンシブデザインを実装：

```typescript
// グリッドレイアウト
<div className="
  grid grid-cols-1           // Mobile: 1カラム
  md:grid-cols-2             // Tablet: 2カラム
  lg:grid-cols-3             // Desktop: 3カラム
  gap-4                      // 一貫したスペーシング
">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// フレックスレイアウト（ヘッダー）
<div className="
  flex flex-col              // Mobile: 縦並び
  md:flex-row                // Tablet以上: 横並び
  md:items-center            // Tablet以上: 中央揃え
  md:justify-between         // Tablet以上: 両端揃え
  gap-4
">
  <h1 className="text-2xl md:text-3xl font-bold">タイトル</h1>
  <Button>アクション</Button>
</div>

// テキストサイズ
<h1 className="
  text-2xl                   // Mobile
  md:text-3xl                // Tablet
  lg:text-4xl                // Desktop
  font-bold
">
  見出し
</h1>

// パディング・マージン
<div className="
  p-4                        // Mobile: 1rem
  md:p-6                     // Tablet: 1.5rem
  lg:p-8                     // Desktop: 2rem
">
  コンテンツ
</div>
```

**ブレークポイント（Tailwind デフォルト）:**

- `sm`: 640px以上
- `md`: 768px以上
- `lg`: 1024px以上
- `xl`: 1280px以上
- `2xl`: 1536px以上

### ページコンポーネント構造の詳細例

```typescript
// pages/UsersPage/UsersPage.tsx
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useUsers, useCreateUser } from "../../hooks/useUsers";
import { Button, Modal, LoadingPage, Alert } from "../../components";
import { UserCard } from "./UserCard";
import { UserForm } from "./UserForm";

export const UsersPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  const handleCreate = async (data: CreateUserParams) => {
    await createUser.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <Alert variant="error">エラーが発生しました</Alert>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header - 整列の原則 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">ユーザー管理</h1>
          <p className="mt-2 text-text-regular">ユーザーを管理します</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          新規ユーザー
        </Button>
      </div>

      {/* Content Grid - 近接・反復の原則 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新規ユーザー"
      >
        <UserForm onSubmit={handleCreate} />
      </Modal>
    </div>
  );
};
```

### デザイン原則の良い例・悪い例

```typescript
// ✅ 良い例: デザイン原則を適用、グラデーションなし
<div className="space-y-8">  {/* 反復: 一貫したセクション間のスペーシング */}
  {/* コントラストのあるカード - 単色背景を使用 */}
  <div className="bg-background-surface rounded-lg shadow-md p-6">
    {/* 整列: 左揃えのコンテンツ */}
    <h2 className="text-2xl font-bold text-text-dark mb-4">  {/* コントラスト */}
      見出し
    </h2>

    {/* 近接: 関連するアイテムをグループ化 */}
    <div className="space-y-2">
      <p className="text-text-regular">説明文</p>
      <p className="text-text-light text-sm">補足情報</p>
    </div>

    {/* 近接: アクションボタンをグループ化し、コンテンツから分離 */}
    <div className="flex gap-3 mt-6">
      {/* 単色背景で十分に目立つ */}
      <Button variant="primary">主要アクション</Button>
      <Button variant="secondary">副次アクション</Button>
    </div>
  </div>
</div>

// ❌ 悪い例: デザイン原則を無視、グラデーション濫用
<div>
  <div style={{ background: 'linear-gradient(to right, #ff0000, #00ff00)' }}>  {/* グラデーション不要 */}
    <h2 style={{ fontSize: '24px' }}>見出し</h2>  {/* コントラスト: 弱い */}
    <p>説明文</p>
    <button style={{ background: 'linear-gradient(45deg, #blue, #purple)' }}>  {/* グラデーション不要 */}
      ボタン
    </button>
    <p>補足情報</p>  {/* 近接: グループ化が不適切 */}
  </div>
</div>

// ✅ 良い例: グラデーションを使用する場合（極めて稀）
<section className="hero">
  {/* ヒーローセクションの最重要CTAのみ - ページ全体で唯一のグラデーション */}
  <button className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-lg text-xl font-bold">
    今すぐ始める
  </button>
</section>
```

**デザイン原則チェックリスト:**

- [ ] **整列**: 要素が見えないグリッド線上に整列している
- [ ] **近接**: 関連要素が適切にグループ化され、無関係な要素は分離されている
- [ ] **コントラスト**: フォントサイズ・太さ・色で視覚的階層が明確
- [ ] **反復**: デザイン要素（ボタン、カード、スペーシング）が一貫している
- [ ] **グラデーション制限**: 本当に強調したいときだけ、めったに使わない

## 実装パターン集

**このセクションには既存READMEに記載されていない新規の設計判断のみを記録してください。**
重複記載は禁止です。

### 添付ファイル機能の実装

**設計:**

- TODO詳細モーダルで添付ファイル管理機能を提供（アップロード・一覧・ダウンロード・削除）
- ページ固有コンポーネントとして実装:
  - `AttachmentUpload.tsx`: ファイル選択・アップロードUI
  - `AttachmentList.tsx`: 添付ファイル一覧・ダウンロード・削除UI
- TodoCardに添付ファイル数バッジを表示し、「詳細を見る」ボタンで詳細モーダルを開く

**アップロードフロー:**

1. ファイル選択（クライアント側でサイズ・形式バリデーション: 最大10MB）
2. `POST /todos/{todoId}/attachments` でアップロード準備（uploadUrlとAttachment(PREPARED)を取得）
3. uploadUrlに直接PUT（S3へ直接アップロード、MSWモックではモックURL）
4. `PUT /todos/{todoId}/attachments/{attachmentId}` でステータスをUPLOADEDに更新
5. TanStack Queryで添付ファイル一覧とTODO一覧のキャッシュを無効化

**ダウンロードフロー:**

1. `GET /todos/{todoId}/attachments/{attachmentId}/download-url` でダウンロードURLを取得
2. 取得したURLを新しいタブで開く（S3の署名付きURL、MSWモックではモックURL）

**モックサーバー対応:**

- S3へのアップロードをモック: `rest.put("https://mock-s3-bucket.s3.amazonaws.com/attachments/*")`
- ファイルメタデータはMSWの状態管理で保持
- 実際のファイルバイナリはモックサーバーでは保持しない（アップロード成功をシミュレートするのみ）

**ファイル形式制限:**

- 許可形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト, Markdown, YAML
- 最大サイズ: 10MB（`MAX_FILE_SIZE` 定数）
- フロントエンドでのバリデーションとエラーメッセージ表示

### プロジェクトとTODOの関係性

**設計:**

- プロジェクトとTODOは正規化された設計を採用
  - `ProjectResponse` を独立したエンティティとして定義
  - `TodoResponse` は `projectId` フィールドでプロジェクトを参照
  - プロジェクトはid, name, description, color, createdAt, updatedAtを持つ
- TODO一覧からプロジェクト詳細を表示するため、`useProjects()`で全プロジェクトを取得し、`getProjectById()`でマッピング
- プロジェクトカラーはカスタムバッジとして表示（Badgeコンポーネントではstyle propsが使えないため、spanタグを使用）

**URL連携:**

- ProjectsPageからTODOをクリックすると`/todos?projectId=xxx`に遷移してフィルタリング
- TodosPageは`useSearchParams()`でURLクエリパラメータを読み取り、初期フィルター状態に反映

**プロジェクト削除時の動作:**

- プロジェクト削除時はTODOとの関連も考慮し、`useDeleteProject()`で`todos`のクエリキャッシュも無効化
- バックエンド実装時は、プロジェクト削除時にTODOを削除するか、projectIdをnullにするかの判断が必要

### ユーザーとTODOの担当者（Assignee）関係性

**設計:**

- ユーザーとTODOは正規化された設計を採用
  - `UserResponse` を独立したエンティティとして定義（Cognito認証基盤と連携）
  - `TodoResponse` は `assigneeUserId` フィールドで担当者を参照
  - フィールド名は `userId` ではなく `assigneeUserId` で、担当者であることを明示
- TODO一覧から担当者名を表示するため、`useUsers()`で全ユーザーを取得し、`getUserById()`でマッピング
- 担当者はBadgeコンポーネントで表示（UserCircleIconアイコン付き、variantは"info"）

**TODO作成時の担当者指定:**

- TODO作成フォームで担当者を選択可能（Selectコンポーネント）
- 担当者が未選択の場合、バックエンドで自動的に作成者が担当者に設定される
- フォームのラベルは「担当者なし（自分が担当者になります）」で、この挙動を明示

**ユーザー管理機能:**

- プロフィールページ（`/profile`）: 現在のユーザー情報を表示・編集
  - `useCurrentUser()`で現在のユーザー情報を取得
  - `useUpdateCurrentUser()`で名前・メールアドレス・メール検証状態を更新
  - アカウント削除機能も提供（`useDeleteCurrentUser()`）
- ユーザー一覧ページ（`/users`）: 全ユーザーの一覧を表示
  - 担当者選択の参照用として機能
  - UserCardコンポーネントでユーザー情報をカード表示
  - メール検証状態をバッジで視覚化

**認証との統合:**

- Cognito User PoolのJWTトークンから `sub`, `email`, `emailVerified` を取得
- 初回ログイン時に `POST /users` で自動登録
- ユーザー削除時はセッションをクリアし、ログインページにリダイレクト

**スキーマ整合性:**

- OpenAPIスキーマ（`contracts/api/todo.openapi.yaml`）から自動生成されたZodスキーマ（`generated/zod-schemas.ts`）を使用
- `assigneeUserId`フィールドは、TODO作成・更新の両スキーマに追加（オプショナル）
- スキーマ変更は`contracts/api/todo.openapi.yaml`で行い、`npm run codegen`で自動反映

## 参考資料

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [MSW](https://mswjs.io/)
- [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)
