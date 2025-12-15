# ロール設計

## 核心原則

ロールは**責務の境界**である。同じリソースでもロールごとに責務が異なる場合は、ディレクトリ構造で分離し、コロケーションを優先する。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集（一緒に変更されるものを一緒に置く）

## ロールの定義

### ロールとは

ロールは「**誰向けの機能か**」を表す。認証ページも含め、そのロール向けの機能はすべて同一ロール内に配置する。

### 基本構造

```
routes/
├── (buyer)/                    # 購入者向け
│   ├── auth/                   # 認証ページ
│   │   └── _layout/
│   ├── _layout/                # アプリ用レイアウト
│   ├── products/               # 商品検索・閲覧
│   └── cart/                   # カート・購入
│
└── (seller)/                   # 出品者向け
    ├── auth/                   # 認証ページ（必要に応じて）
    │   └── _layout/
    ├── _layout/                # アプリ用レイアウト
    ├── products/               # 商品管理
    ├── orders/                 # 受注管理
    └── inventory/              # 在庫管理
```

### features/ との整合

| 層 | 役割 | 内容 |
|----|------|------|
| `features/{feature}/` | **ロジック** | Provider, hooks, service |
| `routes/({role})/{feature}/` | **ページ** | UI, route.tsx |

**依存の方向**: `routes/ → features/` の一方向のみ。

## ロール分離の判断基準

| 条件 | 分離する？ | 理由 |
|------|----------|------|
| 同じリソースだが責務が異なる | Yes | 機能的凝集を優先 |
| UIが似ているが操作が異なる | Yes | 条件分岐の増殖を防ぐ |
| ワークフローが同じで権限だけ異なる | No | フラット + 権限チェック |

## ロールベース vs 機能ベース

| アプローチ | 構造 | 凝集の軸 |
|-----------|------|---------|
| **ロールベース**（採用） | `routes/(seller)/products/` | 責務で凝集 |
| 機能ベース | `routes/products/(seller)/` | リソース名で凝集 |

### 採用理由

**ロールベース**:
```
routes/(seller)/
├── products/       # 商品管理
├── orders/         # 受注管理
└── inventory/      # 在庫管理
```
- seller の仕様変更 → `(seller)/` 配下で完結
- **機能的凝集**: 一緒に変更されるものが一緒にある

**機能ベース**（非採用）:
```
routes/products/
├── (buyer)/        # 閲覧
└── (seller)/       # 管理
```
- buyer と seller は一緒に変更されない
- **論理的凝集**: 「products」という名前で括っただけ

## サブロールの扱い

### 権限の違い vs 責務の違い

**唯一の判断基準: ワークフローが同じか？**

| 質問 | 権限の違い | 責務の違い |
|------|-----------|-----------|
| 同じ画面を共有できる？ | Yes | No |
| 日常のワークフローは同じ？ | Yes | No |
| 片方だけ大幅UI変更しても他方に影響ない？ | No | Yes |

### 権限の違い（フラット + 権限チェック）

**同じ画面・同じワークフロー、操作範囲だけ異なる**

| サブロール | なぜ権限の違いか |
|-----------|-----------------|
| seller_admin / seller_staff | 両方「商品管理」、admin は価格変更可、staff は在庫のみ |
| manager / member | 両方「プロジェクト作業」、manager はメンバー編集可 |

```
routes/(seller)/
├── _layout/index.tsx     # 権限に応じてナビ出し分け
├── products/
│   └── route.tsx         # role で削除ボタンの表示/非表示
└── settings/             # admin専用（権限チェックでリダイレクト）
```

### 責務の違い（別ロールとして昇格）

**異なるワークフロー、異なるメンタルモデル**

| ロール | なぜ責務の違いか |
|--------|-----------------|
| buyer / seller | buyer は「探す・買う」、seller は「出品・販売」 |
| doctor / patient | doctor は「診断・処方」、patient は「予約・確認」 |

```
routes/
├── (buyer)/
│   └── products/         # 検索・カート・購入フロー
└── (seller)/
    └── products/         # 出品・在庫・売上管理
```

同じ「products」リソースでも、buyer と seller で全く異なる画面・ワークフローになる。

### サブロール設計の選択肢

| 選択肢 | 構造 | 適用条件 |
|--------|------|---------|
| **フラット + 権限チェック**（推奨） | `(seller)/settings/` | UIが同じ、操作権限だけ異なる |
| ネストしたロールグループ | `(seller)/(admin)/` | 共通部分が多いがレイアウトは別 |
| 別ロールとして昇格 | `(seller_admin)/` | UIが大きく異なる |

## Do / Don't

| Do | Don't |
|----|-------|
| `(buyer)/auth/login/` | `auth/login/` ❌ ロール外に認証ページ |
| `(buyer)/auth/login/` | `(guest)/login/` ❌ 認証状態をロールとして扱う |
| `(seller)/products/` | `products/(seller)/` ❌ 機能ベース + ロールサブ |
| `(seller)/settings/` + 権限チェック | `(seller)/(admin)/settings/` ❌ UIが同じならネスト不要 |

## 関連ドキュメント

- `10-route-overview.md`: ルート設計概要
- `20-colocation-patterns.md`: コロケーション（HOW）
- `30-shared-placement.md`: 配置基準・レイアウト（WHERE）
- `../feature/10-feature-overview.md`: Feature設計
