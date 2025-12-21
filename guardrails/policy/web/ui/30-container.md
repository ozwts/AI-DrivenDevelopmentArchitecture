# Container 実装パターン

## 核心原則

Containerは**任意の子要素を受け入れ、内部構造に制約がないコンポーネント**である。「枠」のみを提供し、余白・レイアウトは呼び出し側の責務とする。

---

## className方針

**✅ classNameを受け入れる**

| 用途 | 例 |
|------|-----|
| 内部余白 | `className="p-6"` |
| 外部余白 | `className="mt-4"` |
| レイアウト | `className="space-y-4"` |

理由:
- 文脈によって余白要件が異なる
- 「枠」のみを提供し、余白は呼び出し側の責務

実装:
- テンプレートリテラルで結合: `` `${baseStyles} ${className}` ``
- tailwind-mergeは使用しない（競合上書きは想定しない）

**呼び出し側で指定する余白**:
- 外部余白（margin）: `mt-8`, `mb-4` 等
- 内部余白（padding）: `p-6`, `px-4` 等
- 配置・レイアウト: `flex`, `grid`, `gap` 等
- 子要素間の余白: `space-y-3` 等

---

## 実施すること

1. **余白を呼び出し側に委ねる**: padding, margin, gapは呼び出し側で指定
2. **視覚的表現のみ提供**: border, background, shadow, roundedのみ
3. **classNameで余白を受け入れる**: テンプレートリテラルで結合

## 実施しないこと

1. **内部余白の固定** → 呼び出し側で指定
2. **子要素のレイアウト制御** → 呼び出し側で指定
3. **子要素のスタイル固定** → `[&_h3]:mt-6`等は禁止

---

## Do / Don't

### Do: 余白は呼び出し側で決定

```tsx
<Card className="p-6 space-y-3">
  <h3>タイトル</h3>
  <p>本文</p>
</Card>
```

### Do: 親コンポーネントのレイアウトで制御

```tsx
<div className="grid grid-cols-2 gap-4">
  <Card className="p-4">カード1</Card>
  <Card className="p-6">カード2</Card>  {/* 異なる padding も可能 */}
</div>
```

### Do: 視覚的表現のみ提供（テンプレートリテラルで結合）

```tsx
// ui/container/Card.tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  readonly tone?: "default" | "elevated";
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ tone = "default", className = "", children, ...props }, ref) => {
    const elevation = tone === "elevated" ? "shadow-md" : "shadow-sm";

    return (
      <div
        ref={ref}
        className={`rounded-lg bg-white border border-border-light ${elevation} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
```

### Don't: コンテナ内に余白を固定

```tsx
// NG: 文脈依存の余白を固定
export const Card = ({ children }) => (
  <div className="p-6 mt-8 rounded-md bg-white">
    {children}
  </div>
);
```

### Don't: 子要素のスタイルを固定

```tsx
// NG: 子要素のスタイルを固定
export const Card = ({ children }) => (
  <div className={`
    rounded-md bg-white
    [&_h3]:mt-6                    // NG
    [&_footer>button+button]:ml-3  // NG
  `}>
    {children}
  </div>
);
```

---

## 使用例

```tsx
import { Card, Button } from "@/app/lib/ui";

// プロフィールカード
<Card className="p-6">
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Avatar />
      <div>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <p className="text-text-secondary">{user.email}</p>
      </div>
    </div>
    <div className="border-t pt-6">
      <Button>編集</Button>
    </div>
  </div>
</Card>

// グリッドレイアウト
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {projects.map((project) => (
    <Card key={project.id} className="p-4">
      <h3>{project.name}</h3>
      <p>{project.description}</p>
    </Card>
  ))}
</div>
```

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
