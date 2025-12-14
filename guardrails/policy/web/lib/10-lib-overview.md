# 技術基盤設計概要

## 核心原則

libは**アプリケーション固有の知識を持たない技術コード**を配置する場所である。

**根拠となる憲法**:

- `architecture-principles.md`: 依存の制御
- `module-cohesion-principles.md`: 機能的凝集

## 判断基準

**このコードはアプリケーション固有の概念を知っているか？**

| 固有の知識 | 配置先                       |
| ---------- | ---------------------------- |
| なし       | `lib/`                       |
| あり       | `features/` または `routes/` |

「固有の概念」とは、このアプリケーション特有のビジネス用語・エンティティ・ルールを指す。

## 依存の方向

```
routes/ → features/ → lib/
                        ↑
                   最下層（ドメインを知らない）
```

`lib/`は最下層であり、`features/`や`routes/`に依存してはならない。

## 実施すること

1. **ドメイン非依存のコードを配置**: どのプロジェクトでも使える汎用コード
2. **技術関心事に集中**: HTTP通信、ログ出力、UI部品、ユーティリティ関数
3. **型安全な実装**: 汎用的な型定義とバリデーション

## 実施しないこと

1. **ドメインロジックの配置** → `features/`に配置
2. **ドメイン固有の型定義** → `features/`に配置
3. **上位レイヤーへの依存** → 依存の方向を守る

## Do / Don't

### Do

```typescript
// ドメインを知らないコード
export function formatDate(dateString: string): string { ... }
export function request<T>(endpoint: string, schema: ZodType<T>): Promise<T> { ... }
export function buildLogger(component: string): Logger { ... }
```

### Don't

```typescript
// ドメインを知っているコード（NG → features/に配置）
export function calculateTodoProgress(todos: Todo[]): number { ... }
export function validateUserPermission(user: User): boolean { ... }
```

## 関連ドキュメント

- `20-ui-primitives.md`: UIプリミティブ実装パターン
- `../api/10-api-overview.md`: API通信基盤
- `../logger/10-logger-overview.md`: ログ出力基盤
- `../feature/10-feature-overview.md`: Feature設計概要
