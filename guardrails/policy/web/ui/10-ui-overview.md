# UIプリミティブ設計概要

## 核心原則

UIプリミティブは**3つの種別（Leaf/Container/Composite）**に分類され、それぞれ余白責務と実装パターンが異なる。種別に応じた適切な設計により、一貫性と柔軟性を両立する。

**根拠となる憲法**:
- `design-principles.md`: 反復（UIプリミティブによる一貫性）
- `architecture-principles.md`: 依存の制御
- `analyzability-principles.md`: 純粋関数の優先

---

## UIプリミティブの分類

### 分類一覧

| 分類 | 定義 | 余白責務 | ディレクトリ |
|------|------|---------|-------------|
| **Leaf** | 子要素なし/限定的。分解不可能な視覚単位 | サイズバリアント | `ui/leaf/` |
| **Container** | 任意の子要素を受け入れる。内部構造に制約なし | 呼び出し側 | `ui/container/` |
| **Composite** | 複数のスロットを持ち、配置・余白を内部で制御 | 内部/サブコンポーネント | `ui/composite/` |

### 判断フローチャート

```
コンポーネントは子要素を受け取るか？
│
├─ No / 限定的（テキスト・アイコンのみ）
│   └─ 【Leaf】 → 20-leaf.md
│
└─ Yes（ReactNode）
    │
    └─ 複数のスロット（Props）を持ち、配置を内部で制御するか？
        │
        ├─ No（childrenのみ、配置は呼び出し側）
        │   └─ 【Container】 → 30-container.md
        │
        └─ Yes（Header/Body/Footer等の構造）
            └─ 【Composite】 → 40-composite.md
```

### 分類の例

| 種別 | 例 |
|------|-----|
| Leaf | ボタン、バッジ、ローディングインジケーター等 |
| Container | カード、パネル等 |
| Composite | モーダル、アラート、空状態表示、フォームフィールド等 |

---

## ディレクトリ構造

```
app/lib/ui/
├── leaf/           # Leaf コンポーネント
├── container/      # Container コンポーネント
├── composite/      # Composite コンポーネント
└── index.ts        # Public API（唯一のエクスポートポイント）
```

**注意**: 具体的なコンポーネント一覧は `index.ts` を参照。ポリシーは原則を定義し、実装はコードが真実の源泉（Single Source of Truth）となる。

---

## 共通実装原則

### 実施すること

1. **種別に応じた余白責務の設計**: Leaf/Container/Compositeで異なる
2. **forwardRefで参照転送**: 親コンポーネントからのref制御を可能に（後述）
3. **HTML標準属性の継承**: `ComponentPropsWithoutRef`または`XxxHTMLAttributes`で標準属性を受け入れる
4. **アクセシビリティ属性**: `aria-*`属性で状態を通知
5. **バリアント/サイズのProps**: 一貫したスタイルバリエーション
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
| Leaf コンポーネント | ✅ 必須 | ✅ 必須 |
| Container コンポーネント | ✅ 必須 | ✅ 必須 |
| Composite コンポーネント | ✅ 必須 | ✅ 必須 |
| Compound サブコンポーネント（Modal.Header等） | ✅ 必須 | ✅ 必須 |
| ページ全体コンポーネント（LoadingPage等） | ✅ 必須 | ✅ 必須 |

### 理由

- **一貫性**: 「どのコンポーネントにrefを渡せるか」を覚える必要がない
- **将来対応**: 後からref対応を追加する手間を省く
- **業界標準**: shadcn/ui, Radix, MUI等が採用

### 実装パターン

```tsx
import { forwardRef, ComponentPropsWithoutRef } from "react";

type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> & {
  readonly variant?: "primary" | "secondary";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  ),
);

Button.displayName = "Button";
```

### propsなしコンポーネントの場合

```tsx
// propsがない場合でも型を明示
type LoadingPageProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

export const LoadingPage = forwardRef<HTMLDivElement, LoadingPageProps>(
  (props, ref) => (
    <div ref={ref} {...props}>...</div>
  ),
);

LoadingPage.displayName = "LoadingPage";
```

---

## className の扱い（種別ごとの方針）

`className` の受け入れ可否は**種別によって異なる**。

| 種別 | className | 理由 |
|------|-----------|------|
| **Leaf** | ❌ 受け入れない | サイズは`variant`/`size`、配置は親でラップ |
| **Container** | ✅ 受け入れる | padding/marginは呼び出し側の責務 |
| **Composite** | ❌ 受け入れない | 内部で制御、必要なら`variant`を追加 |

### 根拠

- **所有権**: コンポーネントを所有しているので、必要なら直接修正できる
- **明示性**: `className="p-0"` より `noPadding` propの方が意図が明確
- **堅牢性**: アドホックな上書きを防ぎ、スタイル変更に強くなる

参考: [shadcn/ui Discussion #2288](https://github.com/shadcn-ui/ui/discussions/2288)

### Do / Don't

```tsx
// ✅ Do: Leafは親でラップして配置
<div className="mt-4">
  <Button variant="primary" size="md">送信</Button>
</div>

// ✅ Do: Containerはclassでpadding指定
<Card className="p-6">...</Card>

// ✅ Do: Compositeは内部制御、例外はvariantで
<Modal.Body>...</Modal.Body>           // 標準padding
<Modal.Body noPadding>...</Modal.Body>  // 必要なら variant 追加

// ❌ Don't: LeafにclassNameで配置
<Button className="mt-4">...</Button>

// ❌ Don't: Compositeにclassで上書き
<Modal.Body className="p-0">...</Modal.Body>
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

### 判断基準

| 状況 | アプローチ |
|-----|----------|
| 用途が1-2パターンに限定される | 具体的なpropsで明確化 |
| 用途が多様で予測困難 | 汎用的なpropsを検討 |
| 呼び出し側で同じ設定を繰り返す | 具体化のサイン |

---

## 関連ドキュメント

- `20-leaf.md`: Leaf実装パターン
- `30-container.md`: Container実装パターン
- `40-composite.md`: Composite実装パターン
- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
