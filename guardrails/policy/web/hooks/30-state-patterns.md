# 複雑な状態管理パターン

## 概要

TanStack Queryで対応できない複雑なUI状態を管理するパターン。useReducerを使用する場合の設計指針と、使用を避けるべきケースを定義する。

**根拠となる憲法**:
- `simplicity-principles.md`: 「この抽象化がなくても動くか？」
- `simplicity-principles.md`: 愚直さの価値（「賢さ」より「読みやすさ」）

## useReducer使用の判断基準

### 使用する条件（すべて満たす場合）

1. **3つ以上の関連する状態がある**
2. **状態間に依存関係がある**（Aを変更するとBも変わる）
3. **TanStack Queryで代替不可能**

### 使用しない条件

| 状況 | 代替手段 |
|------|---------|
| 単純なboolean（モーダル開閉等） | useState |
| 単純なフォーム状態 | React Hook Form |
| サーバーデータのキャッシュ | TanStack Query |
| 2つ以下の独立した状態 | useState複数 |

## パターン1: 複数ステップのファイルアップロード

### ユースケース

1. 複数ファイルを順次アップロード
2. 各ファイルの進捗を追跡
3. 失敗ファイルを記録

### 実装

```typescript
// routes/(user)/todos/_shared/hooks/useFileUpload.ts
import { useState } from "react";
import { apiClient } from "@/lib/api";

type FileUploadResult = {
  totalFiles: number;
  failedFiles: string[];
  successCount: number;
};

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (
    todoId: string,
    files: File[]
  ): Promise<FileUploadResult> => {
    if (files.length === 0) {
      return { totalFiles: 0, failedFiles: [], successCount: 0 };
    }

    setIsUploading(true);
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        try {
          const { uploadUrl, attachment } = await apiClient.prepareAttachment(
            todoId,
            { filename: file.name, contentType: file.type, filesize: file.size }
          );
          await apiClient.uploadFileToS3(uploadUrl, file);
          await apiClient.updateAttachment(todoId, attachment.id, { status: "UPLOADED" });
        } catch {
          failedFiles.push(file.name);
        }
      }

      return {
        totalFiles: files.length,
        failedFiles,
        successCount: files.length - failedFiles.length,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}
```

**ポイント**:
- useStateで十分（3つ以上の関連状態がない）
- 結果はPromiseで返す（状態として保持しない）
- isUploadingのみをリアクティブに

## パターン2: ウィザード（複数ステップフォーム）

### ユースケース

1. 3ステップ以上のフォーム
2. 各ステップの入力を保持
3. 前後のナビゲーション

### 実装（useReducer使用）

```typescript
// routes/(user)/onboarding/hooks/useOnboardingWizard.ts
import { useReducer, useCallback } from "react";

type Step = "profile" | "preferences" | "confirmation";

type State = {
  currentStep: Step;
  profile: { name: string; email: string } | null;
  preferences: { theme: string; notifications: boolean } | null;
};

type Action =
  | { type: "SET_PROFILE"; payload: State["profile"] }
  | { type: "SET_PREFERENCES"; payload: State["preferences"] }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

const STEP_ORDER: Step[] = ["profile", "preferences", "confirmation"];

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PROFILE":
      return { ...state, profile: action.payload };

    case "SET_PREFERENCES":
      return { ...state, preferences: action.payload };

    case "NEXT_STEP": {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      const nextStep = STEP_ORDER[currentIndex + 1];
      return nextStep ? { ...state, currentStep: nextStep } : state;
    }

    case "PREV_STEP": {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      const prevStep = STEP_ORDER[currentIndex - 1];
      return prevStep ? { ...state, currentStep: prevStep } : state;
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const initialState: State = {
  currentStep: "profile",
  profile: null,
  preferences: null,
};

export function useOnboardingWizard() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setProfile = useCallback(
    (profile: State["profile"]) => dispatch({ type: "SET_PROFILE", payload: profile }),
    []
  );

  const setPreferences = useCallback(
    (preferences: State["preferences"]) =>
      dispatch({ type: "SET_PREFERENCES", payload: preferences }),
    []
  );

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    ...state,
    setProfile,
    setPreferences,
    nextStep,
    prevStep,
    reset,
    canGoBack: STEP_ORDER.indexOf(state.currentStep) > 0,
    canGoNext: STEP_ORDER.indexOf(state.currentStep) < STEP_ORDER.length - 1,
  };
}
```

**ポイント**:
- reducerは純粋関数（副作用なし）
- Action型で網羅性を保証
- 計算値（canGoBack等）はフックで導出

## パターン3: 選択状態の管理

### ユースケース

1. 複数アイテムの選択
2. 全選択/全解除
3. 選択数の追跡

### 実装（useState + Set）

```typescript
// routes/(user)/todos/hooks/useTodoSelection.ts
import { useState, useCallback, useMemo } from "react";

export function useTodoSelection(todoIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(todoIds));
  }, [todoIds]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const selectedCount = useMemo(() => selected.size, [selected]);

  const isAllSelected = useMemo(
    () => todoIds.length > 0 && selected.size === todoIds.length,
    [todoIds.length, selected.size]
  );

  return {
    selected,
    toggle,
    selectAll,
    clearAll,
    isSelected,
    selectedCount,
    isAllSelected,
  };
}
```

**ポイント**:
- useReducer不要（Setで十分）
- useMemoで計算値をメモ化
- useCallbackで関数を安定化

## reducer設計の原則

### 純粋性の維持

```typescript
// Do: 純粋な状態遷移のみ
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_VALUE":
      return { ...state, value: action.payload };
    default:
      return state;
  }
}

// Don't: reducerで副作用
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_VALUE":
      console.log("Value changed");  // NG: 副作用
      localStorage.setItem("value", action.payload);  // NG: 副作用
      return { ...state, value: action.payload };
    default:
      return state;
  }
}
```

### 副作用の配置

```typescript
export function useFeature() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 副作用はフック内で処理
  const setValue = useCallback(async (value: string) => {
    dispatch({ type: "SET_VALUE", payload: value });

    // 副作用はここ
    await apiClient.saveValue(value);
    toast.success("保存しました");
  }, []);

  return { ...state, setValue };
}
```

## アンチパターン

### 1. TanStack Queryの再発明

```typescript
// NG: TanStack Queryで代替可能
function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true };
    case "FETCH_SUCCESS":
      return { ...state, isLoading: false, data: action.payload };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
  }
}
```

### 2. 過度な状態集約

```typescript
// NG: 無関係な状態を1つのreducerに
type State = {
  // モーダル状態
  isModalOpen: boolean;
  // フォーム状態
  formData: FormData;
  // ページネーション
  page: number;
  // フィルター
  filters: Filters;
};

// OK: 関連する状態のみ集約、または分割
const [isModalOpen, setIsModalOpen] = useState(false);
const [page, setPage] = useState(1);
const [state, dispatch] = useReducer(formReducer, initialFormState);
```

### 3. 「念のため」のuseReducer

```typescript
// NG: useStateで十分なケース
const [state, dispatch] = useReducer(reducer, { isOpen: false });

// OK: シンプルにuseState
const [isOpen, setIsOpen] = useState(false);
```

## Do / Don't

### Do

```typescript
// 3つ以上の関連状態 + 複雑な遷移 → useReducer
const [wizardState, dispatch] = useReducer(wizardReducer, initialState);

// 単純な状態 → useState
const [isOpen, setIsOpen] = useState(false);

// サーバーデータ → TanStack Query
const { data, isLoading } = useTodos();
```

### Don't

```typescript
// すべてをuseReducerに（NG）
const [state, dispatch] = useReducer(reducer, {
  isModalOpen: false,  // useState で十分
  todos: [],           // TanStack Query で管理すべき
  selectedId: null,    // useState で十分
});
```

## 関連ドキュメント

- `10-hooks-overview.md`: カスタムフック設計概要
- `20-query-patterns.md`: TanStack Queryパターン
- `../form/10-form-overview.md`: フォーム設計概要
