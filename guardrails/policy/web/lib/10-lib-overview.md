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
├── hooks/         # Context以外の汎用カスタムフック
├── logger/        # ログ出力インフラ
├── ui/            # UIプリミティブ
└── utils/         # 純粋関数ユーティリティ
```

**注意**: Context に紐づく Hook（useToast 等）は `hooks/` ではなく `contexts/` 内の同一ファイルに配置する。

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

- `20-ui-primitives.md`: UIプリミティブ実装パターン
- `../api/10-api-overview.md`: API通信基盤とコロケーション
- `../logger/10-logger-overview.md`: ログ出力基盤
- `../feature/10-feature-overview.md`: Feature設計概要
