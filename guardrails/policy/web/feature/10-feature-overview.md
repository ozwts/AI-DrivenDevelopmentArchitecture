# Feature設計概要

## 核心原則

Featureは**3つ以上のルートで共通利用される横断的機能**を配置する場所である。ルート固有のコードは各ルートにコロケーションし、真に横断的な機能のみfeatures/に配置する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則4「共通化の判断基準」
- `architecture-principles.md`: モジュールの独立、依存の制御

## 実施すること

1. **3つ以上のルートで使用される横断的機能の配置**: 認証、トースト通知、ユーザー機能等
2. **feature内のコロケーション**: 各feature内にcomponents/, hooks/, contexts/, api/を配置
3. **APIエンドポイントのコロケーション**: 各featureのapi/にドメイン固有のAPIエンドポイントを配置
4. **一方向の依存**: `app/routes/ → app/features/ → app/lib/`（逆方向禁止）
5. **Public API（index.ts）による公開**: 内部実装を隠蔽

## 実施しないこと

1. **2箇所以下で使用されるコードの配置** → 各ルートにコロケーション
2. **feature間の直接インポート** → 必要な場合はapp/routes/で組み合わせ
3. **features/からroutes/へのインポート** → 依存の逆転禁止
4. **ビジネスロジックを持たない純粋コード** → `app/lib/`に配置

## ディレクトリ構造

```
app/
├── features/
│   ├── auth/                  # 認証・認可（Provider必要）
│   │   ├── api/               # 認証関連APIエンドポイント
│   │   │   ├── auth-user.ts   # getCurrentUser, registerUser
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── index.ts           # Public API
│   │
│   ├── todo/                  # TODO機能（3+ルートで使用）
│   │   ├── api/               # TODO関連APIエンドポイント
│   │   │   ├── todos.ts       # getTodos, createTodo, etc.
│   │   │   ├── attachments.ts # attachment操作
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── useTodos.ts
│   │   └── index.ts
│   │
│   ├── project/               # プロジェクト機能
│   │   ├── api/
│   │   │   ├── projects.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── useProjects.ts
│   │   └── index.ts
│   │
│   ├── user/                  # ユーザー機能（3+ルートで使用）
│   │   ├── api/
│   │   │   ├── users.ts       # getUsers, updateCurrentUser, etc.
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   └── UserAvatar.tsx
│   │   ├── hooks/
│   │   │   └── useUsers.ts
│   │   └── index.ts
│   │
│   └── toast/                 # トースト通知（Provider必要）
│       ├── components/
│       │   └── ToastProvider.tsx
│       ├── hooks/
│       │   └── useToast.ts
│       └── index.ts
│
├── lib/                       # 技術基盤（ビジネスロジックなし）
│   └── api/                   # APIクライアント基盤のみ（エンドポイントは各featureに）
└── routes/
```

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
    ↓             ↓              ↓
   OK            OK             OK

app/features/ → app/routes/  ← NG（逆方向禁止）
app/features/auth/ → app/features/toast/  ← NG（feature間禁止）
```

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御

## features/ vs lib/ の判断基準

| 観点 | `app/features/` | `app/lib/` |
|-----|----------------|------------|
| ビジネスロジック | あり | なし |
| Provider/Context | 必要な場合あり | 不要 |
| ドメイン依存 | あり（Auth, User等） | なし（汎用） |
| 3回ルール | 適用 | 適用 |

### 具体例

| コード | 配置先 | 理由 |
|-------|--------|------|
| `AuthProvider` | `app/features/auth/` | Provider必要、認証ドメイン |
| `useToast` | `app/features/toast/` | Context依存、通知ドメイン |
| `UserAvatar` | `app/features/user/` | ユーザードメイン |
| `Button` | `app/lib/ui/` | ビジネスロジックなし、汎用 |
| `useDebounce` | `app/lib/hooks/` | ビジネスロジックなし、汎用 |
| `formatDate` | `app/lib/utils/` | 純粋関数、汎用 |

## Do / Don't

### Do

```typescript
// app/routes/(user)/todos/route.tsx
import { useAuth } from "@/features/auth";
import { useToast } from "@/features/toast";
import { Button } from "@/lib/ui";
```

### Don't

```typescript
// app/features/auth/components/AuthProvider.tsx
import { TodoList } from "@/routes/(user)/todos/components/TodoList"; // NG: 逆方向

// app/features/auth/hooks/useAuth.ts
import { useToast } from "@/features/toast"; // NG: feature間インポート
```

## テスト戦略

featureのテストは**ルートのスナップショットテスト**で間接的にカバーする。

**理由**:
- featureはルートで組み合わせて使用される
- スナップショットテストでfeatureの表示・動作が検証される
- 個別のfeatureユニットテストは過剰になりやすい

**例外**:
- 複雑なビジネスロジックを持つfeatureは個別テスト対象
- Context/Providerの状態管理はインテグレーションテスト対象

## 関連ドキュメント

- `20-provider-context-pattern.md`: Provider/Contextパターン（認証、トースト、ファイルアップロード）
- `../route/30-shared-placement.md`: 共通化の配置基準
- `../route/40-test-patterns.md`: ルートテストパターン
- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../hooks/10-hooks-overview.md`: カスタムフック設計概要
