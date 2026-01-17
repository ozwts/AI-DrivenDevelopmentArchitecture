# テストカバレッジの適切性検証

## @what

UseCaseのSmall Testがビジネスルール検証のみをカバーし、シナリオで定義されたすべてのケースをテストしているか検証

## @why

各テスト層の責務を明確にし、重複テストを避け、かつシナリオで定義されたすべてのケースを網羅することで、保守性と信頼性を高めるため

## @failure

以下のパターンを検出した場合に警告:
- **シナリオの例外ケースがテストされていない**（最重要）
- **シナリオの正常系がテストされていない**
- UseCase Small Testで型レベルの境界値テスト（文字列長等）を実施している
- UseCase Small Testでドメインルールテスト（Value Object制約）を重複実施している
- Entity Dummyファクトリを使用していない

---

## 核心原則

**テストピラミッドと責務のMECE**: 各テスト層は固有の責務を持ち、重複しない。

**参照**:
- `guardrails/constitution/co-evolution/testing-principles.md`（テストの原則）
- `guardrails/constitution/structural-discipline/responsibility-principles.md`（責務のMECE）

---

## テスト層の責務

| 層       | テストすべきこと           | テストしないこと           |
| -------- | -------------------------- | -------------------------- |
| Handler  | 型制約（OpenAPI）          | ビジネスルール             |
| Domain   | ドメインルール、不変条件   | 型制約                     |
| UseCase  | ビジネスルール             | ドメインルール、型制約     |
| E2E      | 層を跨ぐ結合動作           | 単一層で検証可能なこと     |

---

## シナリオとテストケースの対応関係（最重要）

**核心原則**: シナリオで定義されたすべてのケースがテストケースとして実装されていること。

分岐網羅は前提として、**シナリオの各ケースがテストとして実装されているか**を検証する。

### 1. シナリオの正常系とテストの対応

**シナリオの「どうなる」セクション**に記載された正常系の振る舞いがテストされているか。

**シナリオ例（register-todo.md）**:
```markdown
## どうなる

- TODOが作成される
- 作成者が担当者として設定される
- ステータスは未着手で初期化される
```

**対応するテストケース**:
```typescript
describe("RegisterTodoUseCaseImpl", () => {
  describe("正常系", () => {
    test("TODOを登録できる", async () => {
      // Arrange
      const useCase = new RegisterTodoUseCaseImpl({ ... });

      // Act
      const result = await useCase.execute({
        title: "新しいTODO",
        userId: "user-1",
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("新しいTODO");
        expect(result.data.assigneeId).toBe("user-1");  // ✅ 作成者が担当者
        expect(result.data.status).toBe("notStarted");   // ✅ 未着手で初期化
      }
    });
  });
});
```

### 2. シナリオの例外系とテストの対応（最重要）

**シナリオの「例外」セクション**に記載されたすべての例外ケースがテストされているか。

**シナリオ例（register-todo.md）**:
```markdown
## 例外

- タイトルが空の場合、登録できない
- 既に同じタイトルのTODOがある場合、登録できない
- 期限が過去の場合、登録できない
```

**対応するテストケース（すべて必須）**:
```typescript
describe("RegisterTodoUseCaseImpl", () => {
  describe("例外系", () => {
    test("タイトルが空の場合、ValidationErrorを返す", async () => {
      // ✅ シナリオの例外1に対応
      const result = await useCase.execute({ title: "", userId: "user-1" });
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
    });

    test("既に同じタイトルのTODOがある場合、ConflictErrorを返す", async () => {
      // ✅ シナリオの例外2に対応
      const result = await useCase.execute({ title: "既存TODO", userId: "user-1" });
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictError);
    });

    test("期限が過去の場合、DomainErrorを返す", async () => {
      // ✅ シナリオの例外3に対応
      const result = await useCase.execute({
        title: "新しいTODO",
        dueDate: "2020-01-01",  // 過去
        userId: "user-1",
      });
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(DomainError);
    });
  });
});
```

**検証ポイント**:
- [ ] シナリオの「例外」セクションに記載された**すべてのケース**がテストされているか？
- [ ] 逆に、テストケースが**シナリオに記載されていない例外**をテストしていないか？
- [ ] 例外の網羅性（MECE）が保証されているか？

### 3. Bad例: シナリオの例外が漏れている

```typescript
describe("RegisterTodoUseCaseImpl", () => {
  describe("例外系", () => {
    test("タイトルが空の場合、ValidationErrorを返す", async () => {
      // ✅ シナリオの例外1に対応
    });

    test("既に同じタイトルのTODOがある場合、ConflictErrorを返す", async () => {
      // ✅ シナリオの例外2に対応
    });

    // ❌ シナリオの例外3（期限が過去）がテストされていない
  });
});
```

**検証結果**: ❌ FAIL - シナリオで定義された「期限が過去の場合」のテストが欠けている

---

## UseCase Small Testの責務

### テストすべきこと

UseCase層では**ビジネスルール（DB参照を伴う検証）**のみをテストする:

1. **権限チェック**: リソースへのアクセス権限確認
2. **リソース存在確認**: 参照先データの存在チェック
3. **重複チェック**: ユニーク制約の検証
4. **状態遷移ルール**: ビジネス文脈での状態変更可否

### テストしないこと

1. **型レベルバリデーション**: Handler層でZodスキーマで検証済み
   - 文字列長（minLength/maxLength）
   - 必須性（required）
   - 型制約（string/number/boolean）
   - 形式（email/url）

2. **ドメインルール**: Domain層のValue Objectで検証済み
   - 形式制約（カラーコード、URL等）
   - 値の範囲制約（0-100等）
   - ドメイン固有のルール

---

## 例

### Good: ビジネスルールのみをテスト

```typescript
// create-project-use-case.test.ts
describe("CreateProjectUseCaseImpl", () => {
  describe("ビジネスルール検証", () => {
    it("✅ 重複チェック: 同じ名前のプロジェクトがある場合、ConflictErrorを返す", async () => {
      // Arrange: 同名プロジェクトが既に存在する状態
      const existingProject = buildProjectDummy({ name: "existing-project" });
      const repository = buildProjectRepositoryDummy({
        findByName: async () => Result.ok(existingProject),
      });

      const useCase = new CreateProjectUseCaseImpl({ repository, fetchNow: buildFetchNowDummy() });

      // Act
      const result = await useCase.execute({
        name: "existing-project",
        color: "#FF0000",
        userId: "user-1",
      });

      // Assert: ビジネスルール（重複チェック）を検証
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ConflictError);
    });
  });
});
```

**検証結果**: ✅ PASS
- ビジネスルール（重複チェック）のみをテスト
- Entity Dummyファクトリを使用
- 型レベルの境界値テストは含まない

---

### Bad: 型レベルバリデーションをテスト

```typescript
// create-project-use-case.test.ts ❌
describe("CreateProjectUseCaseImpl", () => {
  describe("型レベルバリデーション", () => {
    it("❌ 名前が空文字の場合、ValidationErrorを返す", async () => {
      // ...
      const result = await useCase.execute({
        name: "",  // ❌ 型レベルバリデーション（Handler層の責務）
        color: "#FF0000",
        userId: "user-1",
      });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
    });

    it("❌ 名前が100文字を超える場合、ValidationErrorを返す", async () => {
      // ...
      const result = await useCase.execute({
        name: "a".repeat(101),  // ❌ 型レベルバリデーション（Handler層の責務）
        color: "#FF0000",
        userId: "user-1",
      });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
    });
  });
});
```

**検証結果**: ❌ FAIL
- UseCase層で型レベルバリデーション（文字列長）をテストしている
- これはHandler層（Zodスキーマ）の責務

**理由**: Handler層でテスト済みのバリデーションを重複してテストしている

---

### Bad: ドメインルールを重複テスト

```typescript
// create-project-use-case.test.ts ❌
describe("CreateProjectUseCaseImpl", () => {
  describe("ドメインルール検証", () => {
    it("❌ カラーコードが不正な形式の場合、DomainErrorを返す", async () => {
      // ...
      const result = await useCase.execute({
        name: "project-1",
        color: "invalid-color",  // ❌ ドメインルール（Domain層の責務）
        userId: "user-1",
      });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(DomainError);
    });
  });
});
```

**検証結果**: ❌ FAIL
- UseCase層でドメインルール（カラーコード形式）をテストしている
- これはDomain層（ProjectColor.fromString()）の責務

**理由**: Domain層でテスト済みのバリデーションを重複してテストしている

---

## Entity Dummyファクトリの使用

UseCase Small Testでは、Entity Dummyファクトリを使用してテストデータを生成する:

**Good**: Entity Dummyファクトリを使用
```typescript
const existingProject = buildProjectDummy({ name: "existing-project" });
const repository = buildProjectRepositoryDummy({
  findByName: async () => Result.ok(existingProject),
});
```

**Bad**: 手動でEntityを構築
```typescript
const existingProject = new Project({  // ❌ 手動構築（保守コスト増）
  id: "project-1",
  name: "existing-project",
  color: ProjectColor.fromString("#FF0000").unwrap(),
  userId: "user-1",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
});
```

**理由**: Entity Dummyファクトリを使用することで、モデル変更時の修正を1箇所に集約できる

---

## レビュー時のチェックリスト

### シナリオとの対応（最重要）

- [ ] **シナリオの「例外」セクションに記載されたすべてのケースがテストされているか？**
- [ ] **シナリオの「どうなる」セクションに記載された正常系の振る舞いがテストされているか？**
- [ ] テストケースが**シナリオに記載されていない例外**をテストしていないか？

### 責務のMECE

- [ ] UseCase Small Testで型レベルの境界値テスト（文字列長等）をしていないか？
- [ ] UseCase Small Testでドメインルールテスト（Value Object制約）を重複していないか？
- [ ] Entity Dummyファクトリを使用してテストデータを生成しているか？
- [ ] ビジネスルール（権限、存在、重複、状態遷移）のみをテストしているか？
- [ ] 1テスト = 1検証を守っているか？

---

## 関連ドキュメント

- **テストの原則**: `guardrails/constitution/co-evolution/testing-principles.md`
- **責務のMECE**: `guardrails/constitution/structural-discipline/responsibility-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **テスト概要**: `guardrails/policy/server/use-case/30-testing-overview.md`
- **シナリオ例外との一致**: `guardrails/policy/vertical/semantic/server/use-case/scenario-exception-alignment.md`
- **Entity Dummyファクトリ**: `guardrails/policy/vertical/semantic/server/use-case/test-dummy-appropriateness.md`
