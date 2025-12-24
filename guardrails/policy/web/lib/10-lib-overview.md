# 技術基盤設計概要

## 核心原則

libは**アプリケーション固有の知識を持たない技術コード**を配置する場所である。

**根拠となる憲法**:

- `architecture-principles.md`: 依存の制御
- `module-cohesion-principles.md`: 機能的凝集

## 判断基準

**このコードはアプリケーション固有の概念を知っているか？**

| 固有の知識 | 配置先                       |
| ---------- | ---------------------------- |
| なし       | `lib/`                       |
| あり       | `features/` または `routes/` |

「固有の概念」とは、このアプリケーション特有のビジネス用語・エンティティ・ルールを指す。

**重要**: この原則はコードの形態（関数、Hook、Provider/Context）に関わらず適用される。Provider/Contextであっても、アプリケーション固有の概念を知らなければ`lib/`に配置する。

## 依存の方向

```
routes/ → features/ → lib/
                        ↑
                   最下層（固有概念を知らない）
```

`lib/`は最下層であり、`features/`や`routes/`に依存してはならない。

## ディレクトリ構造

```
lib/
├── api/           # HTTP通信インフラ（エンドポイント定義は含まない）
├── contexts/      # Context + Provider + Hook（同一ファイル）
├── error/         # エラーハンドリングインフラ（ErrorBoundary等）
├── hooks/         # Context以外の汎用カスタムフック
├── logger/        # ログ出力インフラ
├── services/      # 外部SDK連携の汎用抽象化（Facade Pattern）
├── ui/            # UIプリミティブ（Leaf/Composite）
└── utils/         # 純粋関数ユーティリティ
```

**注意**:
- Context に紐づく Hook（useToast 等）は `hooks/` ではなく `contexts/` 内の同一ファイルに配置する
- Feature固有のSDK連携は `features/{feature}/services/` に配置する

## services/ と hooks/ の使い分け

| フォルダ | 用途 | React依存 |
|---------|------|-----------|
| `services/` | 外部SDK連携の純粋関数（Amplify, S3, Stripe等） | なし |
| `hooks/` | React Hookを使用するカスタムフック | あり |

**判断基準**: コード内で `useState`, `useEffect`, `useContext` 等のReact Hookを使用しているか？
- **使用している** → `hooks/`
- **使用していない**（純粋なasync関数等） → `services/`

**lib/services/ vs features/{feature}/services/**:
- `lib/services/`: アプリケーション固有の概念を知らない汎用抽象化
- `features/{feature}/services/`: Feature固有のSDK利用（設定、ビジネスロジックを含む）

## error/ の役割

`error/`はエラーハンドリングのインフラを配置する場所である。

| コンポーネント | 説明 |
|--------------|------|
| `ErrorBoundary` | Reactエラー境界（render中のエラーをキャッチ） |

**なぜ ui/ ではないのか**:
- ErrorBoundaryは「視覚的プリミティブ」ではなく「エラー処理インフラ」
- Reactの制約でクラスコンポーネント必須（他のUIプリミティブと設計が異なる）
- Leaf/Compositeの分類に当てはまらない

## 実施すること

1. **汎用コードの配置**: どのプロジェクトでも使える技術コード
2. **技術関心事に集中**: HTTP通信、ログ出力、UI部品、通知機能、ユーティリティ関数
3. **インフラ基盤の提供**: 上位レイヤーが利用する技術基盤

## 実施しないこと

1. **ビジネスロジックの配置** → `features/`に配置
2. **アプリケーション固有の型定義** → `features/`に配置
3. **APIエンドポイント定義** → `features/{feature}/api/`または`routes/({role})/{feature}/_shared/api/`に配置
4. **上位レイヤーへの依存** → 依存の方向を守る

## Do / Don't

### Do

```typescript
// アプリケーション固有の概念を知らないコード
export function formatDate(dateString: string): string { ... }
export function request<T>(endpoint: string, schema: ZodType<T>): Promise<T> { ... }
export function buildLogger(component: string): Logger { ... }

// Provider/Context/Hookも汎用ならOK（同一ファイルに配置）
// contexts/ToastContext.tsx
export function ToastProvider({ children }: Props) { ... }
export function useToast() { return useContext(ToastContext); }

// lib/services/: 汎用SDK抽象化（固有概念を知らない）
export const storageService = {
  upload: async (key: string, file: File): Promise<string> => { ... },
  download: async (key: string): Promise<Blob> => { ... },
};

// features/auth/services/: Feature固有のSDK利用
export const authService = {
  signIn: async (email: string, password: string): Promise<void> => { ... },
  signOut: async (): Promise<void> => { ... },
};
```

### Don't

```typescript
// アプリケーション固有の概念を知っているコード（NG → features/に配置）
export function calculateTodoProgress(todos: Todo[]): number { ... }
export function validateUserPermission(user: User): boolean { ... }

// APIエンドポイント定義（NG → features/api/に配置）
export const todoApi = {
  getTodos: () => request("/todos", TodosSchema),  // Todoを知っている
};
```

## 関連ドキュメント

- `../ui/10-ui-overview.md`: UIプリミティブ設計概要
- `../hooks/10-hooks-overview.md`: カスタムフック設計概要
- `../api/10-api-overview.md`: API通信基盤とコロケーション
- `../logger/10-logger-overview.md`: ログ出力基盤
- `../feature/10-feature-overview.md`: Feature設計概要
- `../feature/20-provider-context-pattern.md`: Provider/Contextパターン
