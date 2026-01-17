# ポート層の責務（セマンティックレビュー）

> **Note:** このファイルは静的解析で検証できない設計判断についてのセマンティックレビュー基準を定義します。

## レビュー観点

### 1. 抽象度の適切性

ポートは**使用側（UseCase）の視点**で設計されているか？

**確認項目:**
- [ ] メソッド名がドメインの操作を表現しているか
- [ ] 引数・戻り値が技術詳細を露出していないか
- [ ] 実装の差し替え（S3→GCS等）がUseCase側に影響しない設計か

**Good:**
```typescript
// UseCase視点の操作
generatePresignedUploadUrl(props: { key: string; contentType: string }): Promise<Result<string, UnexpectedError>>;
```

**Bad:**
```typescript
// 技術詳細を露出
putObject(props: { bucket: string; key: string; body: Buffer }): Promise<void>;
```

---

### 2. Dummy実装の存在

各ポートにはテスト用のDummy実装が提供されているか？

**確認項目:**
- [ ] `dummy.ts` または `*.dummy.ts` ファイルが存在するか
- [ ] Dummy実装が全メソッドをカバーしているか
- [ ] Dummy実装がテストで使いやすい設計か（値の設定が可能等）

**ファイル構成:**
```
port/
├── logger/
│   ├── index.ts      # インターフェース定義
│   └── dummy.ts      # Dummy実装
├── unit-of-work/
│   ├── index.ts
│   └── unit-of-work-runner.dummy.ts  # 命名パターンも許容
```

---

### 3. 責務の分離

ポートが担うべき責務のみを定義しているか？

**実施すること:**
- 外部サービスへの抽象インターフェース定義
- 戻り値・引数の型定義（DTO）
- Dummy実装の提供

**実施しないこと:**
- ビジネスロジック（→ UseCase層）
- ドメインルール（→ Domain層）
- 具体的な実装（→ Infrastructure層）
- 複数ポートを組み合わせた操作

---

### 4. 技術非依存性（概念レベル）

> **Note:** 命名の技術非依存性は `technology-agnostic-naming.ts` で静的解析されます。
> ここでは概念レベルでの技術非依存性をレビューします。

**確認項目:**
- [ ] インターフェースの契約が特定技術の概念に依存していないか
- [ ] 戻り値の構造が特定技術のレスポンス形式を反映していないか
- [ ] エラー型が特定技術のエラーコードを露出していないか

**Good:**
```typescript
type AuthError = InvalidTokenError | ExpiredTokenError;
```

**Bad:**
```typescript
type AuthError = CognitoNotAuthorizedException | CognitoExpiredTokenException;
```

---

### 5. 依存性の方向

ポートは他のレイヤーに依存していないか？

**許可される依存:**
- ドメインモデル（Entity, ValueObject）の参照
- 共通エラー型（Result, UnexpectedError等）の使用

**禁止される依存:**
- Infrastructure層への依存
- UseCase層への依存
- Handler層への依存
- 他のポートへの依存（UnitOfWork内での例外を除く）

---

## 関連ポリシー

### 静的解析ポリシー

| ファイル | 検証内容 |
|---------|---------|
| `type-alias-definition.ts` | typeエイリアスの使用（interfaceではなく） |
| `result-type-return.ts` | 失敗しうるメソッドのResult型返却 |
| `props-pattern.ts` | 複数引数でのPropsパターン使用 |
| `port-structure.ts` | ディレクトリ構造（index.ts + dummy.ts） |

### セマンティックレビューポリシー

| ファイル | 検証内容 |
|---------|---------|
| `technology-agnostic-naming.md` | 技術非依存の命名 |
| `port-responsibility.md` | ポート層の責務（本ファイル） |
