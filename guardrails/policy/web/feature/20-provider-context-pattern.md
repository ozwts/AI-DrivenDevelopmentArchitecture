# Provider/Contextパターン

## 概要

`app/features/`に配置するProvider/Context機能の実装パターン。認証、トースト通知など、アプリ全体で共有する状態を管理する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集
- `architecture-principles.md`: 依存の制御

## 実装原則

1. **Context + Provider + Hook**の3層構造
2. **Public API（index.ts）**による内部実装の隠蔽
3. **feature間の直接インポート禁止**

## ディレクトリ構造

```
app/features/{feature}/
├── components/
│   └── {Feature}Provider.tsx    # Provider
├── hooks/
│   └── use{Feature}.ts          # Hook
├── contexts/
│   └── {Feature}Context.tsx     # Context
└── index.ts                     # Public API
```

---

## 例1: 認証（Auth）

### Context定義

```typescript
// app/features/auth/contexts/AuthContext.tsx
import { createContext } from "react";
import type { UserResponse } from "@/generated/zod-schemas";

export type AuthContextValue = {
  readonly user: UserResponse | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
```

### Hook

```typescript
// app/features/auth/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### ProtectedRoute

```typescript
// app/features/auth/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

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
export { AuthProvider } from "./components/AuthProvider";
export { ProtectedRoute } from "./components/ProtectedRoute";
export { useAuth } from "./hooks/useAuth";
export type { AuthContextValue } from "./contexts/AuthContext";
```

---

## 例2: トースト通知（Toast）

### Context定義

```typescript
// app/features/toast/contexts/ToastContext.tsx
import { createContext } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastContextValue = {
  readonly showToast: (type: ToastType, message: string) => void;
  readonly success: (message: string) => void;
  readonly error: (message: string) => void;
  readonly warning: (message: string) => void;
  readonly info: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
```

### Hook

```typescript
// app/features/toast/hooks/useToast.ts
import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
```

### 使用例

```typescript
// app/routes/(user)/todos/components/TodoActions.tsx
import { useToast } from "@/features/toast";

export function TodoActions() {
  const toast = useToast();

  const handleCreate = async () => {
    try {
      await createTodo(data);
      toast.success("TODOを作成しました");
    } catch {
      toast.error("TODOの作成に失敗しました");
    }
  };
}
```

---

## 例3: ファイルアップロード

### 3ステップ構成

```
1. プリサインドURL取得（POST /api/files/presigned-url）
       ↓
2. S3へ直接アップロード（PUT presignedUrl）
       ↓
3. 完了通知（POST /api/files/complete）
```

### Hook実装

```typescript
// app/features/file-upload/hooks/useFileUpload.ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

type UploadStep = "idle" | "getting-url" | "uploading" | "completing" | "done" | "error";

export function useFileUpload() {
  const [step, setStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: プリサインドURL取得
      setStep("getting-url");
      const { uploadUrl, fileKey } = await apiClient.post<PresignedUrlResponse>(
        "/api/files/presigned-url",
        { fileName: file.name, contentType: file.type }
      );

      // Step 2: S3へ直接アップロード
      setStep("uploading");
      await uploadToS3(uploadUrl, file, setProgress);

      // Step 3: 完了通知
      setStep("completing");
      await apiClient.post("/api/files/complete", { fileKey });

      setStep("done");
      return { fileKey };
    },
    onError: () => {
      setStep("error");
    },
  });

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
// app/routes/(user)/todos/[todoId]/edit/components/AttachmentForm.tsx
import { useFileUpload } from "@/features/file-upload";

export function AttachmentForm() {
  const { upload, step, progress, isUploading } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      upload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} disabled={isUploading} />
      {isUploading && <span>{step === "uploading" ? `${progress}%` : step}</span>}
    </div>
  );
}
```

## 関連ドキュメント

- `10-feature-overview.md`: Feature設計概要
- `../lib/30-api-patterns.md`: API通信パターン
