# UIプリミティブ実装パターン

## 概要

`app/lib/ui/`に配置するUIプリミティブの実装パターン。

**根拠となる憲法**:
- `design-principles.md`: 反復（UIプリミティブによる一貫性）
- `architecture-principles.md`: 依存の制御
- `analyzability-principles.md`: 純粋関数の優先

## 実装原則

1. **forwardRefで参照転送**: 親コンポーネントからのref制御を可能に
2. **HTML標準属性の継承**: `ComponentPropsWithoutRef<"button">`等で標準属性を受け入れる
3. **アクセシビリティ属性**: `aria-*`属性で状態を通知
4. **バリアント/サイズのProps**: 一貫したスタイルバリエーション
5. **余白・配置の責務分離**: コンテナは呼び出し側、インタラクティブはサイズバリアントで定義
6. **用途限定で具体化**: 抽象的すぎるpropsを避け、明確な用途に特化
7. **data-testid**: 使用側で直接`data-testid`属性を指定
8. **Public API経由のエクスポート**: `index.ts`からのみ公開

---

## 抽象化の原則

**抽象化は必要最小限**に留める。過度な汎用性は呼び出し側で定型コードの重複を招く。

### Don't: 抽象的すぎるprops

```tsx
// NG: 汎用的すぎて毎回同じ設定を書く羽目になる
type DialogProps = {
  actions: Action[];
  onAction: (type: string) => void;
};

// 呼び出し側で毎回これを書くことになる
<Dialog
  actions={[
    { label: "キャンセル", type: "cancel" },
    { label: "削除する", type: "confirm" },
  ]}
  onAction={(t) => (t === "confirm" ? doDelete() : close())}
/>
```

### Do: 用途を限定して具体化

```tsx
// OK: 用途が明確で、呼び出し側がシンプル
type ConfirmDialogProps = {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 呼び出し側
<ConfirmDialog
  title="削除確認"
  message="本当に削除しますか？"
  destructive
  onConfirm={doDelete}
  onCancel={close}
/>
```

### 判断基準

| 状況 | アプローチ |
|-----|----------|
| 用途が1-2パターンに限定される | 具体的なpropsで明確化 |
| 用途が多様で予測困難 | 汎用的なpropsを検討 |
| 呼び出し側で同じ設定を繰り返す | 具体化のサイン |

---

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

## 余白・配置の責務分離

UIプリミティブの余白責務は**コンポーネント種別**によって異なる。

### 純粋コンテナコンポーネント（Card, Alert, EmptyState等）

**内部余白は呼び出し側の責務**。文脈によって必要な余白が変わるため、固定しない。

以下は呼び出し側の責務：
- **外部余白（margin）**: `mt-8`, `mb-4` 等
- **内部余白（padding）**: `p-6`, `px-4` 等
- **配置・レイアウト**: `flex`, `grid`, `gap` 等
- **子要素間の余白**: `space-y-3` 等

```tsx
// Do: 余白・padding は呼び出し側で決定
<Card className="p-6 space-y-3">
  <h3>タイトル</h3>
  <p>本文</p>
</Card>

// Do: 親コンポーネントのレイアウトで制御
<div className="grid grid-cols-2 gap-4">
  <Card className="p-4">カード1</Card>
  <Card className="p-6">カード2</Card>  {/* 異なる padding も可能 */}
</div>

// Don't: コンテナ内に余白・padding を固定
export const Card = ({ children }) => (
  <div className="p-6 mt-8 ...">  {/* NG: 文脈依存 */}
    {children}
  </div>
);
```

### 構造化コンテナコンポーネント（Modal, Sheet, Drawer等）

**Compound Componentsパターンを採用し、サブコンポーネントが余白責務を持つ**。

理由：
- 用途が限定され、一貫したUX（ヘッダー・ボディ・フッター構造）が必要
- 毎回呼び出し側で余白を指定するのは非実用的で定型コードが増加
- 業界標準（shadcn/ui, Radix, Mantine等）がこのパターンを採用
- 「反復」原則により一貫した余白を強制

```tsx
// Do: Compound Componentsパターン
// サブコンポーネントが余白責務を持つ
export const Modal = ({ isOpen, onClose, children }: ModalProps) => { ... };

Modal.Header = ({ children, className }: HeaderProps) => (
  <div className={twMerge("px-6 py-4 border-b border-border-light", className)}>
    {children}
  </div>
);

Modal.Body = ({ children, className }: BodyProps) => (
  <div className={twMerge("px-6 py-4", className)}>
    {children}
  </div>
);

Modal.Footer = ({ children, className }: FooterProps) => (
  <div className={twMerge("px-6 py-4 border-t border-border-light", className)}>
    {children}
  </div>
);

// 使用例: 構造が明確で呼び出し側がシンプル
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>
    <h2>タイトル</h2>
  </Modal.Header>
  <Modal.Body>
    <p>コンテンツ</p>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>閉じる</Button>
  </Modal.Footer>
</Modal>

// className で余白の上書きも可能（特殊ケース）
<Modal.Body className="p-0">  {/* 余白なしのケース */}
  <FullWidthContent />
</Modal.Body>
```

### 純粋 vs 構造化の判断基準

| 基準 | 純粋コンテナ | 構造化コンテナ |
|-----|-------------|---------------|
| 内部構造 | 自由 | Header/Body/Footer等の固定構造 |
| 余白要件 | 文脈依存で多様 | 一貫したUXが必要 |
| 用途 | 汎用的 | 特定用途に限定 |
| 例 | Card, Alert | Modal, Sheet, Drawer |

### インタラクティブコンポーネント（Button, Input, Select, Badge等）

**サイズバリアントの一部として内部paddingを持つことを許容**。理由：
- ユーザー操作の対象となり、一貫したタッチターゲットサイズが必要
- 毎回呼び出し側でpaddingを指定するのは非実用的
- サイズバリアント（sm/md/lg）としてpaddingを含めることで一貫性を担保

```tsx
// Do: サイズバリアントとして内部paddingを定義
const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

// Do: Input/Selectにもデフォルトpaddingを持つ
className={twMerge(
  "border rounded px-3 py-2",  // OK: インタラクティブコンポーネント
  className
)}
```

### 共通禁止事項

```tsx
// Don't: ネスト要素のスタイルを固定
export const Card = ({ children }) => (
  <div className={twMerge(
    "rounded-md bg-white",
    "[&_h3]:mt-6",                    // NG: 子要素のスタイルを固定
    "[&_footer>button+button]:ml-3",  // NG: 子要素の配置を固定
  )}>
    {children}
  </div>
);

// Don't: 呼び出し側で内部スタイルを上書き
<Button className="bg-red-500">  {/* NG: 内部の variant を壊す */}
```

### UIプリミティブが担当すべきスタイル

```tsx
// コンテナの例: 視覚的表現のみ
const base = "rounded-md bg-white";
const elevation = tone === "elevated" ? "shadow-md" : "shadow-none";
// padding, margin, 子要素スタイルは含めない

// インタラクティブの例: サイズバリアントにpaddingを含む
const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
};
```

## className の扱い

`className` を受け入れる場合は、**余白・配置のみ**を想定する。内部スタイル（色、サイズ等）を上書きされないよう注意。

### 安全なパターン

```typescript
// tailwind-merge を使用して安全にマージ
import { twMerge } from "tailwind-merge";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error}
        className={twMerge(
          "border rounded px-3 py-2",           // ベーススタイル
          error ? "border-red-500" : "border-gray-300",  // 状態スタイル
          className                              // 呼び出し側（余白等）
        )}
        {...props}
      />
    );
  }
);
```

**注意**: `tailwind-merge` は後から渡されたクラスで競合を解決するため、呼び出し側が意図的に上書きすることも可能。チーム内で「余白・配置のみ渡す」ルールを徹底すること。

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
