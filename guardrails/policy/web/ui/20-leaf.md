# Leaf 実装パターン

## 核心原則

Leafは**childrenを持たない、または `children: string | ReactElement`（単一要素）のみを受け取る、分解不可能な視覚単位**である。サイズバリアント（sm/md/lg）で内部paddingを定義し、一貫したタッチターゲットサイズを担保する。

**判断基準**: `children: ReactNode`（任意のコンテンツ）を受け取らない。

---

## className方針

**❌ classNameを受け入れない**

| 用途 | 対応方法 |
|------|---------|
| サイズ変更 | `size` prop（sm/md/lg） |
| スタイル変更 | `variant` prop |
| 配置・外部余白 | 親要素でラップ |

理由:
- 内部スタイルの破壊を防止
- variant/sizeで意図を明示
- 所有権: 必要なら直接修正可能

**サイズバリアントで内部paddingを定義**:

```tsx
const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};
```

---

## 実施すること

1. **サイズバリアントで余白定義**: sm/md/lgでpaddingを含める
2. **forwardRefで参照転送**: 親コンポーネントからのref制御
3. **HTML標準属性の継承**: `Omit<XxxHTMLAttributes | ComponentPropsWithoutRef, "className">`でclassNameを除外
4. **アクセシビリティ属性**: `aria-*`属性で状態を通知

**classNameの除外パターン（いずれも有効）**:
```tsx
// パターン1: ComponentPropsWithoutRef
Omit<ComponentPropsWithoutRef<"button">, "className">

// パターン2: XxxHTMLAttributes
Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">
```

## 実施しないこと

1. **classNameの受け入れ** → variant/sizeで対応
2. **呼び出し側で余白指定を要求** → サイズバリアントで提供
3. **ReactNodeとしてのchildren** → テキスト・アイコン程度に限定

---

## Do / Don't

### Do: サイズバリアントで余白を定義（classNameなし）

```tsx
// ui/leaf/Button.tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> & {
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly size?: "sm" | "md" | "lg";
  readonly isLoading?: boolean;
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={sizeStyles[size]}
        {...props}
      >
        {isLoading ? <span aria-hidden="true">...</span> : children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

### Do: 配置は親でラップ

```tsx
// OK: 親要素で配置を制御
<div className="mt-4">
  <Button variant="primary" size="md">送信</Button>
</div>

<div className="flex gap-2">
  <Button size="md">保存</Button>
  <Button size="md" variant="secondary">キャンセル</Button>
</div>
```

### Don't: classNameで配置やスタイルを指定

```tsx
// NG: classNameで配置（そもそも受け付けない）
<Button className="mt-4">送信</Button>

// NG: classNameでvariantを壊す
<Button className="bg-red-500">削除</Button>

// OK: variantを使用
<Button variant="danger">削除</Button>
```

---

## 使用例

```tsx
import { Button } from "@/app/lib/ui";

export function ActionButtons() {
  return (
    <div className="flex gap-2">
      <Button data-testid="submit-button" type="submit">作成</Button>
      <Button data-testid="cancel-button" type="button" variant="secondary">キャンセル</Button>
    </div>
  );
}
```

**注意**: ラベル・エラーメッセージ等を含むフォームフィールドは、複数のスロットを持つためCompositeに分類される。`40-composite.md`を参照。

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
