# ルート設計概要

## 核心原則

ルートは**機能境界**である。関連するすべてのコード（コンポーネント、フック、ロジック、テスト）を同一ディレクトリに配置し、データフローをディレクトリ内で完結させる。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 機能的凝集、コロケーション
- `architecture-principles.md`: モジュールの独立
- `analyzability-principles.md`: 影響範囲の静的追跡

## 技術スタック

- **React Router v7** (framework モード)
- **routes.ts**: 明示的なルート定義（ファイルベースルーティングは使用しない）

## ポリシー構成

| ファイル | 責務 | キーワード |
|----------|------|-----------|
| `10-route-overview.md` | 概要 | 原則、命名、依存 |
| `15-role-design.md` | **WHO**: 誰向けか | ロール、サブロール、features/auth |
| `20-colocation-patterns.md` | **HOW**: どう配置するか | route.tsx、Outlet、責務分離 |
| `30-shared-placement.md` | **WHERE**: どこに置くか | _shared/、_layout/、昇格フロー |
| `40-test-patterns.md` | **TEST**: テスト | SS、決定論的テスト |

## 全体構造

```
app/
├── features/           # 3+ルート横断（詳細: ../feature/）
├── routes/
│   └── ({role})/       # ロール（詳細: 15-role-design.md）
│       ├── _layout/    # ロールレイアウト（詳細: 30-shared-placement.md）
│       └── {feature}/  # 機能（詳細: 20-colocation-patterns.md）
│           ├── _layout/    # 機能固有レイアウト（必要時のみ）
│           ├── _shared/
│           ├── route.tsx
│           └── [param]/
└── lib/                # 純粋ユーティリティ（詳細: ../lib/）
```

## 命名規則

| 種類 | 命名 | 説明 |
|------|------|------|
| ロール | `({role})/` | 括弧あり、URLに現れない |
| 機能 | `{feature}/` | 括弧なし、機能のグループ |
| 動的セグメント | `[param]/` | Next.js 風 |
| 共通（非ルート） | `_shared/` | `_` で非ルートを明示 |
| ロールレイアウト | `({role})/_layout/` | ロール共通のシェル |
| 機能レイアウト | `{feature}/_layout/` | 親と異なるシェルが必要な場合のみ |

## 依存の方向

```
app/routes/ → app/features/ → app/lib/
```

**一方向のみ許可**。逆方向のインポートは禁止。

## Do / Don't

| Do | Don't |
|----|-------|
| `(buyer)/auth/login/` | `auth/login/` ❌ ロール外に認証ページ |
| `(buyer)/auth/login/` | `(guest)/login/` ❌ 認証状態をロールとして扱う |
| `_layout/Header.tsx` | `_shared/Header.tsx` ❌ レイアウト専用は_layout/に |
| `features/auth/` に認証ロジック | `features/auth/UserLayout.tsx` ❌ レイアウトをfeaturesに |

## 関連ドキュメント

- `15-role-design.md`: ロール設計（WHO）
- `20-colocation-patterns.md`: コロケーション（HOW）
- `30-shared-placement.md`: 配置基準（WHERE）
- `40-test-patterns.md`: テスト（TEST）
- `../feature/10-feature-overview.md`: Feature設計
- `../logger/10-logger-overview.md`: ログ出力基盤
