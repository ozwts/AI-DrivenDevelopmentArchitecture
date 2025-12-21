# UIプリミティブ設計概要

## 核心原則

UIプリミティブは**2つの種別（Leaf/Composite）**に分類される。種別に応じた適切な設計により、一貫性と予測可能性を実現する。

**根拠となる憲法**:
- `design-principles.md`: 反復（UIプリミティブによる一貫性）
- `architecture-principles.md`: 依存の制御
- `analyzability-principles.md`: 型システムで表現可能なことは型で表現
- `simplicity-principles.md`: Simple First（不要な抽象化を避ける）

---

## UIプリミティブの分類

### 分類一覧

| 分類 | 定義 | 余白責務 | ディレクトリ |
|------|------|---------|-------------|
| **Leaf** | 単一の視覚単位。children はラベル/アイコン程度 | サイズバリアント | `ui/leaf/` |
| **Composite** | 複数のスロットを持つ構造化コンポーネント | 内部/サブコンポーネント | `ui/composite/` |

### 判断フローチャート

```
Q1: コンポーネントは複数のスロット（構造を定義するProps）を持つか？
    （例: header/body/footer, icon/title/description, label/input/error）
│
├─ Yes → 【Composite】 → 30-composite.md
│
└─ No
    │
    Q2: 任意のReactNodeを子として受け入れ、レイアウトを提供するか？
    │
    ├─ Yes → div + Tailwind で対応（コンポーネント化しない）
    │
    └─ No（children はラベル/アイコン程度、または子要素なし）
        └─ 【Leaf】 → 20-leaf.md
```

---

## ディレクトリ構造

```
app/lib/ui/
├── leaf/           # Leaf コンポーネント
├── composite/      # Composite コンポーネント
└── index.ts        # Public API（唯一のエクスポートポイント）
```

**注意**: 具体的なコンポーネント一覧は `index.ts` を参照。ポリシーは原則を定義し、実装はコードが真実の源泉（Single Source of Truth）となる。

---

## 共通実装原則

### 実施すること

1. **種別に応じた余白責務の設計**: Leaf/Compositeで異なる
2. **forwardRefで参照転送**: 親コンポーネントからのref制御を可能に
3. **CVAでバリアント管理**: 型安全なスタイルバリエーション（`40-variant-system.md`参照）
4. **HTML標準属性の継承**: `ComponentPropsWithoutRef`または`XxxHTMLAttributes`で標準属性を受け入れ
5. **アクセシビリティ属性**: `aria-*`属性で状態を通知
6. **用途限定で具体化**: 抽象的すぎるpropsを避け、明確な用途に特化
7. **data-testid**: 使用側で直接`data-testid`属性を指定
8. **Public API経由のエクスポート**: `index.ts`からのみ公開

### 実施しないこと

1. **ビジネスロジック** → `features/`に配置
2. **アプリケーション固有の型定義** → `features/`に配置
3. **種別を無視した余白設計** → 種別ごとのポリシーに従う

---

## forwardRef の扱い

**全UIプリミティブでforwardRefを使用する**（一貫性のため）

### 対象範囲

| 対象 | forwardRef | displayName |
|------|------------|-------------|
| Leaf コンポーネント | 必須 | 必須 |
| Composite コンポーネント | 必須 | 必須 |
| Compound サブコンポーネント（Modal.Header等） | 必須 | 必須 |
| ページ全体コンポーネント（LoadingPage等） | 必須 | 必須 |

### 理由

- **一貫性**: 「どのコンポーネントにrefを渡せるか」を覚える必要がない
- **将来対応**: 後からref対応を追加する手間を省く
- **業界標準**: shadcn/ui, Radix, MUI等が採用

### 実装パターン

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("...", { variants: { ... } });

type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, children, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size })} {...props}>
      {children}
    </button>
  ),
);

Button.displayName = "Button";
```

---

## className の扱い（統一方針）

**全種別でclassNameを受け入れない**

| 種別 | className | 理由 |
|------|-----------|------|
| **Leaf** | 受け入れない | サイズは`variant`/`size`、配置は親でラップ |
| **Composite** | 受け入れない | 内部で制御、必要なら`variant`を追加 |

### 根拠

- **反復原則**: 一貫したスタイルを強制し、アドホックな上書きを防止
- **所有権**: コンポーネントを所有しているので、必要なら直接修正できる
- **明示性**: `className="p-0"` より `noPadding` propの方が意図が明確
- **解析可能性**: variant型により、使用可能なスタイルが型レベルで明確

参考: [shadcn/ui Discussion #2288](https://github.com/shadcn-ui/ui/discussions/2288)

### 配置ルール（統一）

全コンポーネント共通で、配置は親でラップする:

```tsx
// 配置・外部余白は親のdivで制御
<div className="mt-8">
  <Card>
    <Card.Body>コンテンツ</Card.Body>
  </Card>
</div>

<div className="flex gap-4">
  <Button>A</Button>
  <Button>B</Button>
</div>
```

### Do / Don't

```tsx
// Do: 親でラップして配置
<div className="mt-4">
  <Button variant="primary" size="md">送信</Button>
</div>

// Do: Compositeはデフォルト余白を持つ
<Card>
  <Card.Body>...</Card.Body>
</Card>

// Don't: classNameで配置やスタイルを上書き
<Button className="mt-4">...</Button>  // そもそも受け付けない
<Card.Body className="p-0">...</Card.Body>  // そもそも受け付けない
```

---

## 共通禁止事項

```tsx
// Don't: ネスト要素のスタイルを固定
export const Card = ({ children }) => (
  <div className={`
    rounded-md bg-white
    [&_h3]:mt-6                    // NG: 子要素のスタイルを固定
    [&_footer>button+button]:ml-3  // NG: 子要素の配置を固定
  `}>
    {children}
  </div>
);
```

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
```

### 判断基準（3回ルール）

| 状況 | アプローチ |
|-----|----------|
| 用途が1-2パターンに限定される | 具体的なpropsで明確化 |
| 3箇所以上で同じパターンが出現 | 共通化を検討 |
| 呼び出し側で同じ設定を繰り返す | 具体化のサイン |

**根拠**: `module-cohesion-principles.md` の「3回ルール」

---

## 関連ドキュメント

- `20-leaf.md`: Leaf実装パターン
- `30-composite.md`: Composite実装パターン
- `40-variant-system.md`: CVA/バリアント管理
- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
