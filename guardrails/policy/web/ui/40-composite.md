# Composite 実装パターン

## 核心原則

Compositeは**複数のスロット（Props）を持ち、それらの配置・余白を内部で制御するコンポーネント**である。一貫したUX（ヘッダー・ボディ・フッター等の構造）を提供し、「反復」原則により一貫した余白を強制する。

---

## className方針

**❌ classNameを受け入れない（サブコンポーネント含む）**

### 有効なパターン（2種類）

| パターン | 説明 |
|---------|------|
| **独自Props型** | HTML属性型を継承せず、必要なpropsのみ定義。`className`が型に存在しない |
| **Omitパターン** | HTML属性型を継承しつつ`Omit<..., "className">`で除外 |

```tsx
// パターン1: 独自Props型（className が型に存在しない）
type ExampleProps = {
  readonly variant: "success" | "error";
  readonly children: ReactNode;
};

// パターン2: Omitパターン（HTML属性を継承する場合）
type FieldProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & {
  readonly label?: string;
};
```

**どちらも有効**。パターン1はclassNameがそもそも型に存在せず、パターン2は明示的に除外する。

### スタイル変更が必要な場合

| 用途 | 対応方法 |
|------|---------|
| 余白変更 | variant prop（例: `noPadding`） |
| サイズ変更 | size prop（例: `size="lg"`） |

理由:
- 一貫したUXを強制
- アドホックな上書きを防止
- 所有権: 必要なら直接修正またはvariant追加

---

## 実施すること

1. **複数スロットの定義**: Header/Body/Footer、icon/title/description等
2. **内部で余白・レイアウトを制御**: 一貫したUXを担保
3. **Compound ComponentsまたはPropsパターン**: 柔軟性に応じて選択

## 実施しないこと

1. **classNameの受け入れ** → variant propで対応
2. **呼び出し側に余白指定を要求** → 内部で定義
3. **構造の自由化** → 固定構造を維持

---

## 余白責務

**内部で定義、またはサブコンポーネントが責務を持つ**

理由:
- 一貫したUX（ヘッダー・ボディ・フッター等の構造）が必要
- 毎回呼び出し側で余白を指定するのは非実用的で定型コードが増加
- 業界標準（shadcn/ui, Radix, Mantine等）がこのパターンを採用
- 「反復」原則により一貫した余白を強制

---

## 実装パターン

Compositeには2つの実装パターンがある:

| パターン | 用途 | 例 |
|---------|------|-----|
| **Compound Components** | 柔軟性が必要、複雑な構造 | Modal, Sheet |
| **Props** | シンプルな固定構造 | EmptyState, Alert |

### 判断基準

| 状況 | パターン |
|------|---------|
| スロット内のコンテンツが自由 | Compound Components |
| スロット内のコンテンツが固定的 | Props |
| 構造のカスタマイズが必要 | Compound Components |
| 構造が完全に固定 | Props |

---

## フォームフィールドパターン

フォームフィールド（ラベル + 入力 + エラーメッセージ）はCompositeに分類される。

**理由**:
- 複数のスロット（label/input/error）を持つ
- 配置・余白を内部で制御
- Atomic Designにおける「Molecule」に相当

### 特徴

| 項目 | 内容 |
|------|------|
| className | ❌ 受け入れない（`Omit<..., "className">`） |
| 内部構造 | label → input → error の固定順序 |
| 幅 | `w-full` を内部で持つ（業界標準） |
| React Hook Form | `forwardRef` で統合 |

### Do: フォームフィールドの実装

```tsx
// ui/composite/TextField.tsx
type TextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & {
  readonly label?: string;
  readonly error?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        ref={ref}
        className="w-full rounded-md border px-3 py-2"
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  )
);
```

---

## Do / Don't

### Do: Compound Components（Modal）- classNameなし

```tsx
// ui/composite/Modal.tsx - サブコンポーネントはclassNameを受け付けない

// サブコンポーネント: classNameなし、余白は内部で固定
type BodyProps = { readonly children: ReactNode };
const Body = ({ children }: BodyProps) => (
  <div className="px-6 py-4">{children}</div>  // 余白を内部で定義
);

type FooterProps = { readonly children: ReactNode };
const Footer = ({ children }: FooterProps) => (
  <div className="flex justify-end gap-2 border-t border-border-light px-6 py-4">
    {children}
  </div>
);

// Compound Component としてエクスポート
export const Modal = Object.assign(ModalRoot, { Header, Body, Footer });
```

### Do: Props（EmptyState）

```tsx
// ui/composite/EmptyState.tsx
import { ReactNode } from "react";

type EmptyStateProps = {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
};

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="text-center py-12 px-6">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      {description && <p className="text-text-secondary mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
```

### Do: Props（Alert）

```tsx
// ui/composite/Alert.tsx - Propsパターン、classNameなし
type AlertProps = {
  readonly variant: "success" | "warning" | "error" | "info";
  readonly title?: string;
  readonly children: ReactNode;
};

export const Alert = ({ variant, title, children }: AlertProps) => (
  <div role="alert" className={`rounded-lg border p-4 ${variantConfig[variant].bgColor}`}>
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5" />
      <div className="flex-1">
        {title && <h3 className="font-medium mb-1">{title}</h3>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  </div>
);
```

### Don't: 呼び出し側に余白を要求

```tsx
// NG: 呼び出し側で毎回余白を指定
<Modal isOpen={isOpen} onClose={onClose}>
  <div className="px-6 py-4 border-b">  {/* 毎回書く */}
    <h2>タイトル</h2>
  </div>
  <div className="px-6 py-4">  {/* 毎回書く */}
    <p>コンテンツ</p>
  </div>
</Modal>

// OK: サブコンポーネントが余白を持つ
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>タイトル</Modal.Header>
  <Modal.Body>コンテンツ</Modal.Body>
</Modal>
```

### Don't: classNameで余白を上書き

```tsx
// NG: classNameで上書き（そもそも受け付けない）
<Modal.Body className="p-0">
  <FullWidthImage src={imageSrc} />
</Modal.Body>

// OK: 必要ならvariantを追加（コンポーネント修正）
<Modal.Body noPadding>
  <FullWidthImage src={imageSrc} />
</Modal.Body>
```

---

## 使用例

### Modal

```tsx
import { Modal, Button } from "@/app/lib/ui";

<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>プロジェクトの削除</Modal.Header>
  <Modal.Body>
    <p className="text-text-secondary">
      プロジェクト「{project.name}」を削除してもよろしいですか？
      この操作は取り消せません。
    </p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={onClose}>キャンセル</Button>
    <Button variant="danger" onClick={handleDelete}>削除</Button>
  </Modal.Footer>
</Modal>
```

### EmptyState

```tsx
import { EmptyState, Button } from "@/app/lib/ui";
import { FolderIcon } from "@heroicons/react/24/outline";

<EmptyState
  icon={<FolderIcon className="h-16 w-16 text-neutral-400" />}
  title="プロジェクトがありません"
  description="新しいプロジェクトを作成して始めましょう"
  action={<Button variant="primary">新規プロジェクト</Button>}
/>
```

### Alert

```tsx
import { Alert } from "@/app/lib/ui";

<Alert variant="error" title="エラーが発生しました">
  プロジェクトの読み込みに失敗しました。
</Alert>
```

---

## 関連ドキュメント

- `10-ui-overview.md`: UIプリミティブ設計概要
- `../component/20-selector-strategy.md`: セレクタ戦略
