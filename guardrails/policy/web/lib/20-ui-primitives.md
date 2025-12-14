# UIプリミティブ実装パターン

## 概要

`app/lib/ui/`に配置するUIプリミティブの実装パターン。

**根拠となる憲法**:
- `design-principles.md`: 反復（UIプリミティブによる一貫性）
- `architecture-principles.md`: 依存の制御
- `analyzability-principles.md`: 純粋関数の優先

## 実装原則

1. **forwardRefで参照転送**: 親コンポーネントからのref制御を可能に
2. **アクセシビリティ属性**: `aria-*`属性で状態を通知
3. **バリアント/サイズのProps**: 一貫したスタイルバリエーション
4. **data-testid**: 使用側で直接`data-testid`属性を指定
5. **Public API経由のエクスポート**: `index.ts`からのみ公開

## Button実装例

```typescript
// app/lib/ui/Button.tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly size?: "sm" | "md" | "lg";
  readonly isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <span aria-hidden="true">...</span> : children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

## Input実装例

```typescript
// app/lib/ui/Input.tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input"> & {
  readonly error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error}
        className={`${error ? "border-red-500" : "border-gray-300"} ${className ?? ""}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
```

## 使用例

```typescript
// app/routes/(user)/todos/components/TodoForm.tsx
import { Button, Input } from "@/app/lib/ui";

export function TodoForm() {
  return (
    <form>
      <Input data-testid="input-title" {...register("title")} />
      <Button data-testid="submit-button" type="submit">作成</Button>
      <Button data-testid="cancel-button" type="button" variant="secondary">キャンセル</Button>
    </form>
  );
}
```

## Public API

```typescript
// app/lib/ui/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Select } from "./Select";
```

## 関連ドキュメント

- `10-lib-overview.md`: 技術基盤設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
