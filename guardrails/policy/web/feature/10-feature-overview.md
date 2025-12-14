# Feature設計概要

## 核心原則

Featureは**アプリケーション固有の概念を持ち、3つ以上のルートで共通利用される横断的機能**を配置する場所である。

**根拠となる憲法**:
- `module-cohesion-principles.md`: 原則4「共通化の判断基準」
- `architecture-principles.md`: モジュールの独立、依存の制御

## 判断基準

### features/ vs lib/

**唯一の判断基準: アプリケーション固有の概念を知っているか？**

| 固有の概念 | 配置先 |
|-----------|--------|
| 知っている | `features/` |
| 知らない | `lib/` |

この基準は**コードの形態に関わらず適用**される：
- 関数、Hook、Provider/Context、API、コンポーネント...すべて同じ基準

### features/ vs routes/

| 使用箇所 | 配置先 |
|---------|--------|
| 3+ルート | `features/` |
| 1-2ルート | 各ルートに個別配置（重複許容） |
| 親子ルート間共有 | `{feature}/_shared/`（詳細は`route/30-shared-placement.md`）|

## 依存の方向

```
routes/ → features/ → lib/
   ↓         ↓          ↓
  OK        OK         OK（最下層）

features/ → routes/     ← NG（逆方向禁止）
features/A → features/B ← NG（feature間禁止）
```

## 実施すること

1. **固有概念を持つ横断的機能の配置**: 3+ルートで使用される機能
2. **feature内のコロケーション**: components/, hooks/, contexts/, api/を各feature内に
3. **Public API（index.ts）による公開**: 内部実装を隠蔽

## 実施しないこと

1. **2箇所以下での共通化** → 各ルートに個別配置（重複許容）
2. **feature間の直接インポート** → `routes/`で組み合わせる
3. **固有概念を持たないコード** → `lib/`に配置

## ディレクトリ構造

```
features/{feature}/
├── api/                    # 機能固有のAPIエンドポイント
├── components/             # 機能固有のUIコンポーネント
├── contexts/               # Context + Provider + Hook（同一ファイル）
├── hooks/                  # Context以外のカスタムフック（必要な場合）
└── index.ts                # Public API
```

**注意**: Provider は `components/` ではなく `contexts/` に配置する。詳細は `20-provider-context-pattern.md` を参照。

## Do / Don't

### Do

```typescript
// routes/から features/と lib/をインポート
import { useAuth } from "@/app/features/auth";
import { useToast } from "@/app/lib/contexts/ToastContext";
import { Button } from "@/app/lib/ui";
```

### Don't

```typescript
// features/から routes/をインポート（NG: 逆方向）
import { SomeComponent } from "@/app/routes/.../components/...";

// feature間の直接インポート（NG）
import { useOther } from "@/app/features/other";

// lib/が固有概念を知る（NG）
import { TodoResponse } from "@/generated/...";
```

## 関連ドキュメント

- `20-provider-context-pattern.md`: Provider/Contextパターン
- `../lib/10-lib-overview.md`: 技術基盤設計概要
- `../api/10-api-overview.md`: API通信基盤とコロケーション
- `../route/30-shared-placement.md`: 共通化の配置基準
