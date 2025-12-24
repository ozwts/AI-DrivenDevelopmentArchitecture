# Provider/Contextパターン

## 概要

Provider/Contextを用いた状態共有の実装パターン。**配置先はコードの形態ではなく「アプリケーション固有の概念を知っているか」で決まる**。

| 固有の概念 | 配置先 | 例 |
|-----------|--------|-----|
| 知っている | `app/features/` | AuthProvider（認証という固有概念） |
| 知らない | `app/lib/` | ToastProvider（汎用通知機能） |

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集
- `architecture-principles.md`: 依存の制御

## 実装原則

1. **Context + Provider + Hook**の3層構造
2. **Public API（index.ts）**による内部実装の隠蔽
3. **feature間の直接インポート禁止**（features/内の場合）

## ディレクトリ構造

Context と Provider は密結合しているため、**同一ファイル（`contexts/`）に配置**する。消費側の Hook も同一ファイルに含める。

```
app/features/{feature}/
├── contexts/
│   └── {Feature}Context.tsx     # Context + Provider + useHook（同一ファイル）
├── components/                  # UI コンポーネント（Provider は含まない）
└── index.ts                     # Public API
```

**理由：**
- Provider は UI を描画せず、Context に状態を提供するラッパー
- Provider は Context なしに存在できない（密結合）
- 消費側の Hook（useAuth 等）も Context と密結合
- 凝集度を高め、関連するものを同じ場所に配置
- 1機能 = 1ファイルで見通しが良い

---

## 例1: 認証（Auth）

### Context + Provider + Hook（同一ファイル）

```typescript
// app/features/auth/contexts/AuthContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { UserResponse } from "@/generated/zod-schemas";

// --- Context ---
export type AuthContextValue = {
  readonly user: UserResponse | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Hook ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// --- Provider ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signIn = useCallback(async (email: string, password: string) => {
    // 実装...
  }, []);

  const signOut = useCallback(async () => {
    // 実装...
  }, []);

  return (
    <AuthContext value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext>
  );
}
```

### ProtectedRoute（UIコンポーネント）

```typescript
// app/features/auth/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

### Public API

```typescript
// app/features/auth/index.ts
export { AuthProvider, useAuth } from "./contexts/AuthContext";
export type { AuthContextValue } from "./contexts/AuthContext";
export { ProtectedRoute } from "./components/ProtectedRoute";
```

---

## 例2: トースト通知（Toast）- lib/配置

Toastはアプリケーション固有の概念を知らない汎用通知機能のため、`lib/`に配置する。

### Context + Provider + Hook（同一ファイル）

```typescript
// app/lib/contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastContextValue = {
  readonly showToast: (type: ToastType, message: string) => void;
  readonly success: (message: string) => void;
  readonly error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// --- Hook ---
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

// --- Provider ---
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ type: ToastType; message: string }>>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    // 実装...
  }, []);

  const success = useCallback((message: string) => showToast("success", message), [showToast]);
  const error = useCallback((message: string) => showToast("error", message), [showToast]);

  return (
    <ToastContext value={{ showToast, success, error }}>
      {children}
    </ToastContext>
  );
}
```

### 使用例

```typescript
// routes/内のコンポーネント
import { useToast } from "@/app/lib/contexts/ToastContext";

export function SomeComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await doSomething();
      toast.success("成功しました");
    } catch {
      toast.error("失敗しました");
    }
  };
}
```

---

## 例3: ファイルアップロード（routes/_shared/配置）

ファイルアップロードは todos の親子ルート間（new/, [todoId]/edit/）で共有されるため、`routes/(user)/todos/_shared/` に配置する。

### 3ステップ構成

```
1. プリサインドURL取得（POST /api/attachments/presigned-url）
       ↓
2. S3へ直接アップロード（PUT presignedUrl）
       ↓
3. 完了通知（POST /api/attachments/complete）
```

### Hook実装

```typescript
// app/routes/(user)/todos/_shared/hooks/useFileUpload.ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

type UploadStep = "idle" | "getting-url" | "uploading" | "completing" | "done" | "error";

export function useFileUpload() {
  const [step, setStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState(0);

  // 実装...

  return {
    upload: uploadMutation.mutate,
    step,
    progress,
    isUploading: step !== "idle" && step !== "done" && step !== "error",
    error: uploadMutation.error,
  };
}
```

### 使用例

```typescript
// app/routes/(user)/todos/[todoId]/edit/route.tsx
import { useFileUpload } from "../_shared/hooks";

export default function EditTodoRoute() {
  const { upload, step, progress, isUploading } = useFileUpload();

  // ...
}
```

## 関連ドキュメント

- `10-feature-overview.md`: Feature設計概要
- `../hooks/10-hooks-overview.md`: カスタムフック設計概要（Context/Provider配置の判断）
- `../lib/10-lib-overview.md`: 技術基盤設計概要（lib/contexts/配置）
- `../api/10-api-overview.md`: API通信基盤
