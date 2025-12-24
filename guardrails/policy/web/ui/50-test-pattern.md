# UIプリミティブ テストパターン

## 核心原則

UIプリミティブのテスト要否は**ディレクトリ（Leaf/Composite）で機械的に判断**する。コード内容を解析してテスト要否を判断するのではなく、配置先で一律に決定する。

**根拠となる憲法**:
- `analyzability-principles.md`: 機械的に検証可能なルール
- `simplicity-principles.md`: 判断コストの排除（配置先で自動決定）
- `testing-principles.md`: ROIに基づくテスト戦略

---

## テスト要否ルール

| ディレクトリ | テスト要否 | ファイル命名 | 理由 |
|------------|----------|-------------|------|
| `ui/leaf/` | 不要 | - | ロジックがほぼない（CVAでスタイル定義のみ） |
| `ui/composite/` | 必須 | `*.ct.test.tsx` | 状態管理・aria属性制御等のロジックを持つ |

**スナップショットテスト**: 不要（視覚的回帰はレビューで検出）

---

## セレクタ戦略

**`../component/20-selector-strategy.md` に従う**

- `getByRole`/`getByLabel`を優先（暗黙的a11y検証）
- `data-testid`は最後の手段（複数要素の区別が必要な場合のみ）

---

## 実施すること

1. **Compositeにコンポーネントテストを作成**: `Foo.tsx` → `Foo.ct.test.tsx`
2. **動作・状態のテスト**: 条件分岐、aria属性、表示切り替え
3. **セレクタ戦略に従う**: `getByRole`/`getByLabel`優先
4. **lintで網羅性を担保**: `ui/composite/` 配下のテスト存在チェック

## 実施しないこと

1. **Leafへのテスト強制** → ROIが低い
2. **スナップショットテスト** → 不要
3. **コード内容に基づくテスト要否判断** → ディレクトリで機械的に判断

---

## 判断根拠

### Leafにテストが不要な理由

```tsx
// Leafの典型例: Button
const buttonVariants = cva("...", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, children, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size })} {...props}>
      {children}
    </button>
  )
);
```

- **ロジックがない**: CVAでスタイルを選択するだけ
- **型で保証**: バリアントは`VariantProps`で型安全
- **標準属性のパススルー**: HTML属性をそのまま転送

### Compositeにテストが必要な理由

```tsx
// Compositeの典型例: TextField
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="...">{label}</label|}  {/* 条件分岐 */}
      <input
        ref={ref}
        aria-invalid={!!error}  {/* 状態に応じたaria属性 */}
        {...props}
      />
      {error && <p className="...">{error}</p|}  {/* 条件分岐 */}
    </div>
  )
);
```

- **条件分岐がある**: `label`, `error` の有無で描画が変わる
- **aria属性の制御**: `aria-invalid` 等の状態管理
- **複数要素の構造**: スロット間の関係性

---

## Lintルール仕様

### チェック内容

```
ui/composite/Foo.tsx が存在
  → ui/composite/Foo.ct.test.tsx が必須
```

### 除外対象

- `index.ts`（エクスポートファイル）
- `*.test.tsx`（テストファイル自体）
- `*.stories.tsx`（Storybook）

---

## テスト実装パターン

### Compositeのテスト例

```tsx
// ui/composite/TextField.ct.test.tsx
import { test, expect } from "@playwright/experimental-ct-react";
import { TextField } from "./TextField";

test.describe("TextField", () => {
  test("ラベルが表示される", async ({ mount }) => {
    const component = await mount(<TextField label="メールアドレス" />);
    await expect(component.getByText("メールアドレス")).toBeVisible();
  });

  test("エラー時にaria-invalidがtrueになる", async ({ mount }) => {
    const component = await mount(<TextField error="必須項目です" />);
    await expect(component.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  test("エラーメッセージが表示される", async ({ mount }) => {
    const component = await mount(<TextField error="必須項目です" />);
    await expect(component.getByText("必須項目です")).toBeVisible();
  });

  test("ラベルなしで動作する", async ({ mount }) => {
    const component = await mount(<TextField placeholder="入力してください" />);
    await expect(component.getByRole("textbox")).toBeVisible();
  });
});
```

### テスト観点

| 観点 | 内容 |
|-----|------|
| **条件分岐** | props有無による表示切り替え |
| **aria属性** | 状態に応じた属性値 |
| **構造** | スロットの配置・順序 |
| **インタラクション** | クリック、フォーカス等（必要な場合） |

---

## Do / Don't

### Do: Compositeにテストを作成

```
ui/composite/
├── TextField.tsx
├── TextField.ct.test.tsx  ← 必須
├── Card.tsx
├── Card.ct.test.tsx       ← 必須
└── index.ts
```

### Do: 動作をテスト

```tsx
// OK: 条件分岐・状態をテスト
test("エラー時にaria-invalidがtrueになる", async ({ mount }) => {
  const component = await mount(<TextField error="エラー" />);
  await expect(component.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
});
```

### Don't: Leafにテストを強制

```
ui/leaf/
├── Button.tsx
├── Button.ct.test.tsx  ← 不要（書いてもいいが強制しない）
└── Badge.tsx
```

### Don't: スナップショットテスト

```tsx
// NG: スナップショットテストは不要
test("スナップショット", async ({ mount }) => {
  const component = await mount(<TextField label="名前" />);
  await expect(component).toMatchSnapshot();  // 不要
});
```

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `20-leaf.md`: Leaf実装パターン
- `30-composite.md`: Composite実装パターン
- `../component/20-selector-strategy.md`: セレクタ戦略
- `../component/40-test-patterns.md`: コンポーネントテストパターン
