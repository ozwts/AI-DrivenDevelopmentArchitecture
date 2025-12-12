# 技術基盤設計概要

## 核心原則

libは**ビジネスロジックを持たない技術基盤**を配置する場所である。純粋関数、汎用Hook、UIプリミティブ、APIクライアント基盤など、どのプロジェクトでも使える汎用コードを配置する。

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御
- `module-cohesion-principles.md`: 機能的凝集
- `analyzability-principles.md`: 純粋関数の優先

## 実施すること

1. **ビジネスロジックを持たない汎用コードの配置**: UIプリミティブ、汎用Hook、純粋関数
2. **セグメント別の分類**: ui/, hooks/, utils/, api/
3. **純粋関数として実装**: 同じ入力に対して常に同じ出力
4. **型安全な実装**: Zod生成型を活用

## 実施しないこと

1. **ビジネスロジックの配置** → `app/features/`に配置
2. **Provider/Contextの配置** → `app/features/`に配置
3. **ドメイン固有のコード** → `app/features/`または`app/routes/`に配置
4. **状態の保持** → 純粋関数で実装
5. **副作用の実行** → 引数と戻り値のみで表現

## ディレクトリ構造

```
app/
├── lib/
│   ├── ui/                    # UIプリミティブ
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   └── index.ts
│   │
│   ├── hooks/                 # 汎用Hook
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   │
│   ├── utils/                 # 純粋関数
│   │   ├── formatter.ts
│   │   ├── labelUtil.ts
│   │   └── index.ts
│   │
│   ├── api/                   # APIクライアント基盤
│   │   ├── apiClient.ts
│   │   ├── errorHandler.ts
│   │   └── index.ts
│   │
│   └── logger/                # ログ出力基盤（詳細は ../logger/）
│       └── index.ts
│
├── features/                  # ビジネスロジックあり
└── routes/
```

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
                                 ↑
                            最下層（何にも依存しない）
```

`app/lib/`は最下層。他のレイヤーに依存してはならない。

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御

## lib/ vs features/ の判断基準

| 観点 | `app/lib/` | `app/features/` |
|-----|------------|----------------|
| ビジネスロジック | なし | あり |
| Provider/Context | 不要 | 必要な場合あり |
| ドメイン依存 | なし（汎用） | あり（Auth, User等） |
| 他プロジェクトでの再利用 | 可能 | 困難 |

### 具体例

| コード | 配置先 | 理由 |
|-------|--------|------|
| `Button`, `Input` | `app/lib/ui/` | ビジネスロジックなし |
| `useDebounce` | `app/lib/hooks/` | 汎用、状態管理のみ |
| `formatDate` | `app/lib/utils/` | 純粋関数 |
| `apiClient` | `app/lib/api/` | 技術基盤 |
| `AuthProvider` | `app/features/auth/` | Provider必要 |
| `useToast` | `app/features/toast/` | Context依存 |
| `UserAvatar` | `app/features/user/` | ドメイン依存 |

## セグメント別の役割

### ui/ - UIプリミティブ

ビジネスロジックを持たない汎用UIコンポーネント。

```typescript
// app/lib/ui/Button.tsx
type ButtonProps = {
  readonly variant?: "primary" | "secondary" | "danger";
  readonly size?: "sm" | "md" | "lg";
  readonly disabled?: boolean;
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
};

export function Button({ variant = "primary", size = "md", ...props }: ButtonProps) {
  // ...
}
```

### hooks/ - 汎用Hook

ビジネスロジックを持たない汎用的なHook。

```typescript
// app/lib/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  // ...
  return debouncedValue;
}
```

### utils/ - 純粋関数

副作用のない純粋関数。

```typescript
// app/lib/utils/formatter.ts
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
```

### api/ - APIクライアント基盤

HTTP通信の基盤。エラーハンドリング、認証ヘッダーの付与など。

```typescript
// app/lib/api/apiClient.ts
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new ApiError(response);
    return response.json();
  },
  // ...
};
```

## Do / Don't

### Do

```typescript
// 純粋関数
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

// 汎用UIコンポーネント
export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// 汎用Hook
export function useDebounce<T>(value: T, delay: number): T {
  // ...
}
```

### Don't

```typescript
// ビジネスロジックを含む（NG → features/に配置）
export function calculateTodoProgress(todos: Todo[]): number {
  // Todoドメインの知識が必要
}

// Contextに依存（NG → features/に配置）
export function useCurrentUser() {
  const { user } = useAuth(); // NG: features/authに依存
  return user;
}

// 副作用を実行（NG）
export function formatAndLog(value: string): string {
  console.log(value); // NG: 副作用
  return value.toUpperCase();
}
```

## 関連ドキュメント

- `20-ui-primitives.md`: UIプリミティブ実装パターン
- `30-api-patterns.md`: API通信パターン
- `../feature/10-feature-overview.md`: Feature設計概要
- `../hooks/10-hooks-overview.md`: カスタムフック設計概要
- `../logger/10-logger-overview.md`: ログ出力基盤（API層でのログ実装必須）
