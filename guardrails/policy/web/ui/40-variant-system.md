# バリアント管理（CVA）

## 核心原則

UIプリミティブのスタイルバリエーションは**CVA（Class Variance Authority）で型安全に管理**する。条件分岐によるスタイル管理を禁止し、解析可能性と一貫性を担保する。

**根拠となる憲法**:
- `analyzability-principles.md`: 型システムで表現可能なことは型で表現
- `design-principles.md`: 反復（一貫したスタイル）、デザイントークンで強制
- `simplicity-principles.md`: 愚直さの価値（条件分岐より宣言的定義）

---

## CVA（Class Variance Authority）とは

CVAは、Tailwind CSSのクラス名を型安全に管理するためのライブラリ。

**主な機能**:
- バリアントの型安全な定義
- デフォルト値の設定
- 複合バリアント（compoundVariants）のサポート
- TypeScriptの型推論

**参考**: [CVA公式ドキュメント](https://cva.style/docs)

---

## 実施すること

1. **CVAでバリアント定義**: 全てのスタイルバリエーションをCVAで管理
2. **VariantPropsで型を合成**: CVAから自動生成された型を使用
3. **デザイントークンを使用**: `bg-primary`等のセマンティッククラス
4. **defaultVariantsを設定**: デフォルト値を明示

## 実施しないこと

1. **条件分岐でスタイル管理** → CVAを使用
2. **classNameの直接受け入れ** → variantで対応
3. **任意の値（arbitrary values）** → デザイントークンを使用

---

## 基本パターン

### Leafコンポーネントでの使用

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

// 1. CVAでバリアントを定義
const buttonVariants = cva(
  // ベーススタイル（全バリアントで共通）
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      // variantバリアント
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      // sizeバリアント
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    // デフォルト値
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// 2. VariantPropsで型を合成
type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> &
  VariantProps<typeof buttonVariants>;

// 3. コンポーネントで使用
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, children, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size })} {...props}>
      {children}
    </button>
  )
);

Button.displayName = "Button";
```

### Compositeコンポーネントでの使用

```tsx
import { forwardRef, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva("rounded-lg border bg-white", {
  variants: {
    tone: {
      default: "shadow-sm",
      elevated: "shadow-lg",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

type CardProps = VariantProps<typeof cardVariants> & {
  readonly children: ReactNode;
};

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  ({ tone, children }, ref) => (
    <div ref={ref} className={cardVariants({ tone })}>
      {children}
    </div>
  )
);

CardRoot.displayName = "Card";
```

---

## 複合バリアント（compoundVariants）

特定のバリアントの組み合わせに対して追加スタイルを適用する。

```tsx
const buttonVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground",
      outline: "border border-input bg-background",
    },
    size: {
      sm: "h-8 px-3",
      lg: "h-12 px-6",
    },
  },
  // 複合バリアント: 特定の組み合わせに追加スタイル
  compoundVariants: [
    {
      variant: "outline",
      size: "lg",
      className: "border-2", // outline + lg の場合のみ border-2
    },
  ],
  defaultVariants: {
    variant: "primary",
    size: "sm",
  },
});
```

---

## Do / Don't

### Do: CVAでバリアントを定義

```tsx
// CVAで宣言的に定義
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

// 型が自動生成される
type BadgeProps = VariantProps<typeof badgeVariants>;
// { variant?: "default" | "success" | "warning" | "error" | null | undefined }
```

### Don't: 条件分岐でスタイル管理

```tsx
// NG: 条件分岐（型安全性なし、網羅性検証なし）
const getButtonClass = (variant: string, size: string) => {
  let classes = "inline-flex items-center";

  if (variant === "primary") {
    classes += " bg-primary text-primary-foreground";
  } else if (variant === "secondary") {
    classes += " bg-secondary text-secondary-foreground";
  }
  // バリアントを追加し忘れても検出できない

  if (size === "sm") {
    classes += " h-8 px-3";
  } else if (size === "md") {
    classes += " h-10 px-4";
  }

  return classes;
};
```

### Do: デザイントークンを使用

```tsx
// OK: セマンティックなデザイントークン
const buttonVariants = cva("...", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground",  // デザイントークン
      danger: "bg-destructive text-destructive-foreground",
    },
  },
});
```

### Don't: 任意の値（arbitrary values）

```tsx
// NG: 任意の値（デザイントークン外）
const buttonVariants = cva("...", {
  variants: {
    variant: {
      primary: "bg-[#3b82f6] text-[#ffffff]",  // arbitrary values
    },
  },
});
```

---

## VariantPropsの型活用

CVAから生成される型を活用して、型安全性を担保する。

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("...", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
});

// VariantPropsで型を取得
type ButtonVariantProps = VariantProps<typeof buttonVariants>;
// {
//   variant?: "primary" | "secondary" | null | undefined;
//   size?: "sm" | "md" | "lg" | null | undefined;
// }

// コンポーネントのPropsに合成
type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> &
  ButtonVariantProps & {
    readonly isLoading?: boolean;
  };
```

---

## Tailwind Variants（オプション）

より複雑なユースケース（スロット、レスポンシブバリアント）には、Tailwind Variantsを検討。

**参考**: [Tailwind Variants公式](https://www.tailwind-variants.org/)

```tsx
import { tv } from "tailwind-variants";

// スロットを持つコンポーネント
const card = tv({
  slots: {
    base: "rounded-lg border bg-white",
    header: "px-6 py-4 border-b",
    body: "px-6 py-4",
    footer: "px-6 py-4 border-t",
  },
  variants: {
    tone: {
      default: { base: "shadow-sm" },
      elevated: { base: "shadow-lg" },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

// 使用
const { base, header, body, footer } = card({ tone: "elevated" });
```

**判断基準**:

| ユースケース | 推奨 |
|-------------|------|
| シンプルなバリアント | CVA |
| スロットを持つコンポーネント | Tailwind Variants |
| レスポンシブバリアント | Tailwind Variants |

---

## 解析可能性のレベル

| レベル | CVAでの実現 |
|--------|------------|
| レベル3（型システム） | `VariantProps`で使用可能なバリアントを型で制約 |
| レベル2（Linter） | 未定義バリアントはコンパイルエラー |
| レベル1（ドキュメント） | バリアント定義がドキュメントとして機能 |

**根拠**: `analyzability-principles.md` の解析可能性レベル

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `20-leaf.md`: Leaf実装パターン
- `30-composite.md`: Composite実装パターン
- `../../../constitution/co-evolution/traceability-principles.md`: 追跡可能性原則
- `../../../constitution/structural-discipline/design-principles.md`: デザイン原則
