# Leaf 実装パターン

## 核心原則

Leafは**単一の視覚単位**であり、**構造（スロット）を持たない**コンポーネントである。CVA（Class Variance Authority）でバリアントを管理し、一貫したスタイルとタッチターゲットサイズを担保する。

**判断基準**: 複数のスロット（header/body/footer, label/input/error 等）を持たない。childrenはラベル/アイコン程度。

---

## className方針

**classNameを受け入れない**

| 用途 | 対応方法 |
|------|---------|
| サイズ変更 | `size` prop（sm/md/lg） |
| スタイル変更 | `variant` prop |
| 配置・外部余白 | 親要素でラップ |

理由:
- 内部スタイルの破壊を防止
- variant/sizeで意図を明示
- 所有権: 必要なら直接修正可能
- 反復原則: 一貫したスタイルを強制

---

## 実施すること

1. **CVAでバリアント管理**: 型安全なスタイルバリエーション
2. **サイズバリアントで余白定義**: sm/md/lgでpaddingを含める
3. **forwardRefで参照転送**: 親コンポーネントからのref制御
4. **HTML標準属性の継承**: `Omit<ComponentPropsWithoutRef, "className">`でclassNameを除外
5. **アクセシビリティ属性**: `aria-*`属性で状態を通知

## 実施しないこと

1. **classNameの受け入れ** → variant/sizeで対応
2. **呼び出し側で余白指定を要求** → サイズバリアントで提供
3. **複数スロットの定義** → Compositeに分類される
4. **条件分岐でスタイル管理** → CVAを使用

---

## 実装パターン

### CVAによるバリアント定義

```tsx
// ui/leaf/Button.tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

// CVAでバリアントを定義
const buttonVariants = cva(
  // ベーススタイル
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// Propsの型定義: classNameを除外し、CVAのバリアント型を合成
type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> &
  VariantProps<typeof buttonVariants> & {
    readonly isLoading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={buttonVariants({ variant, size })}
        {...props}
      >
        {isLoading ? <span aria-hidden="true">...</span> : children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

### classNameの除外パターン

```tsx
// classNameを型レベルで除外
type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> &
  VariantProps<typeof buttonVariants>;

// これにより以下はコンパイルエラー
<Button className="mt-4">送信</Button>  // Error: classNameは存在しない
```

---

## Do / Don't

### Do: CVAでバリアントを定義

```tsx
// CVAで型安全なバリアント管理
const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-secondary text-secondary-foreground",
      success: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "className"> &
  VariantProps<typeof badgeVariants>;
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

### Don't: 条件分岐でスタイル管理

```tsx
// NG: 条件分岐でスタイル（型安全性なし、網羅性検証なし）
const getButtonClass = (variant: string, size: string) => {
  let classes = "inline-flex items-center";
  if (variant === "primary") classes += " bg-primary";
  if (size === "sm") classes += " px-3 py-1.5";
  return classes;
};

// OK: CVAを使用
const buttonVariants = cva("inline-flex items-center", {
  variants: {
    variant: { primary: "bg-primary" },
    size: { sm: "px-3 py-1.5" },
  },
});
```

### Don't: classNameで配置やスタイルを指定

```tsx
// NG: classNameで配置（そもそも型エラーになる）
<Button className="mt-4">送信</Button>

// NG: classNameでvariantを壊す（そもそも型エラーになる）
<Button className="bg-red-500">削除</Button>

// OK: variantを使用
<Button variant="danger">削除</Button>
```

---

## 使用例

```tsx
import { Button, Badge } from "@/app/lib/ui";

export function ActionButtons() {
  return (
    <div className="flex gap-2">
      <Button data-testid="submit-button" type="submit">作成</Button>
      <Button data-testid="cancel-button" type="button" variant="secondary">キャンセル</Button>
    </div>
  );
}

export function StatusBadge({ status }: { status: "success" | "error" }) {
  return (
    <Badge variant={status}>
      {status === "success" ? "完了" : "エラー"}
    </Badge>
  );
}
```

**注意**: ラベル・エラーメッセージ等を含むフォームフィールドは、複数のスロットを持つためCompositeに分類される。`30-composite.md`を参照。

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `40-variant-system.md`: CVA/バリアント管理
- `../component/20-selector-strategy.md`: セレクタ戦略
