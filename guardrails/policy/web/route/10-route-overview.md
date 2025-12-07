# ルート設計概要

## 核心原則

ルートは**機能境界**である。関連するすべてのコード（コンポーネント、フック、ロジック、テスト）を同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `architecture-principles.md`: モジュールの独立
- `analyzability-principles.md`: 影響範囲の静的追跡

## 実施すること

1. **ルート単位のコロケーション**: ルート固有のコンポーネント・フック・ロジックはルートディレクトリ内に配置
2. **ロール・コンテキストの構造的分離**: 条件分岐ではなくディレクトリ構造で分離
3. **責務による分離**: 作成・編集・参照など責務が異なれば別ルートに分割
4. **共通化の段階的昇格**: 3箇所以上で使用される場合のみ共通化

## 実施しないこと

1. **カテゴリ別の横断配置** → ルート内にコロケーション
2. **条件分岐によるロール分離** → ディレクトリ構造で分離
3. **早すぎる共通化** → 3回ルールを適用
4. **feature間の直接インポート** → app層で組み合わせ

## ディレクトリ構造

```
app/
├── features/                  # 3+ルートで共通（横断的機能）
├── lib/                       # 技術基盤（ビジネスロジックなし）
└── routes/                    # ルート = 機能境界
    ├── _buyer+/               # 購入者向けレイアウト
    ├── _seller+/              # 出品者向けレイアウト
    └── products+/
        ├── _shared/           # 親子ルート間で共通
        │   └── components/
        ├── $productId+/
        │   ├── route.tsx
        │   └── components/    # ルート内で共通
        └── new+/
            └── route.tsx
```

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
```

**一方向のみ許可**。逆方向のインポートは禁止。

**根拠となる憲法**:
- `architecture-principles.md`: 依存の制御

## 共通化の配置基準

| 使用スコープ | 配置先 | 例 |
|-------------|--------|-----|
| 同一ルート内 | `routes/{route}+/components/` | ルート固有UI |
| 親子ルート間 | `routes/{parent}+/_shared/` | 共通フォーム |
| 3+ルート横断 | `app/features/` | 認証、通知 |
| 全アプリ共通（純粋） | `app/lib/` | formatDate, Button |

## Do / Don't

### Do

```
app/routes/
├── todos+/
│   ├── route.tsx
│   ├── components/
│   │   └── todo-list.tsx      # ルート固有
│   └── hooks/
│       └── use-todos.ts       # ルート固有
```

### Don't

```
app/
├── pages/todos/               # ページのみ
├── components/todo-list.tsx   # 横断配置（どこで使う？）
├── hooks/use-todos.ts         # 横断配置（どこで使う？）
```

## 関連ドキュメント

- `20-colocation-patterns.md`: コロケーションの実装パターン
- `30-shared-placement.md`: 共通化の配置基準
- `40-test-patterns.md`: ルートテスト（スナップショット）
