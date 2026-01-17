# 用語集との一致検証（ユビキタス言語）

## @what

コード内のEntity名・プロパティ名・型定義が用語集（`contracts/business/glossary.md`）と一致しているか検証

## @why

ユビキタス言語を維持し、ビジネスとコードの間で共通の語彙を使用することで、コミュニケーションコストを削減するため

## @failure

以下のパターンを検出した場合に警告:
- 用語集にないEntity名やプロパティ名を使用している
- 用語集の定義と異なる型を使用している
- 日本語と英語の対応が用語集と一致していない

---

## 核心原則

**ユビキタス言語の強制**: すべてのドメインモデル（Entity、ValueObject、Repository等）は用語集で定義された語彙を使用する。用語集にない概念をコードに独自に追加してはならない。

**参照**:
- `guardrails/constitution/co-evolution/evolution-principles.md`（ユビキタス言語）
- `guardrails/constitution/co-evolution/traceability-principles.md`（追跡可能性）

---

## 用語集の構造

用語集は以下の情報を含む:

| 項目       | 内容                     | 例                                               |
| ---------- | ------------------------ | ------------------------------------------------ |
| 用語       | 日本語の用語名           | TODO                                             |
| 英語名     | コードで使用する英語名   | Todo                                             |
| 定義       | ビジネス上の定義         | やるべきタスク。タイトル、説明、ステータス...   |
| 属性       | 持つ属性とその型         | タイトル（string）、説明（string）、ステータス... |

---

## 検証ルール

### ルール1: Entity名の一致

コード内のEntity名は用語集の「英語名」と一致すること:

| 用語集の定義       | コード内のEntity名 | 判定 |
| ------------------ | ------------------ | ---- |
| TODO → Todo        | `class Todo`       | ✅   |
| TODOステータス → TodoStatus | `class TodoStatus` | ✅ |
| プロジェクト → Project | `class Project` | ✅ |

**検証方法**:
- Entity/ValueObjectファイル（`.entity.ts`, `.vo.ts`）のクラス名が用語集の英語名と一致するか
- PascalCase形式で命名されているか

---

### ルール2: プロパティ名の一致

Entity/ValueObjectのプロパティ名は用語集の「属性」と一致すること:

**用語集**: `contracts/business/glossary.md`
```markdown
| 用語 | 英語名 | 定義 |
|------|--------|------|
| TODO | Todo | やるべきタスク。タイトル、説明、ステータス、優先度、期限、担当者を持つ |
```

**Good**: プロパティ名が一致
```typescript
// domain/todo.entity.ts
export type TodoProps = {
  readonly id: string;
  readonly title: string;          // ✅ 用語集の「タイトル」
  readonly description?: string;   // ✅ 用語集の「説明」
  readonly status: TodoStatus;     // ✅ 用語集の「ステータス」
  readonly priority: Priority;     // ✅ 用語集の「優先度」
  readonly dueDate?: Date;         // ✅ 用語集の「期限」
  readonly assigneeId?: string;    // ✅ 用語集の「担当者」
};
```

**Bad**: 用語集にないプロパティ
```typescript
// domain/todo.entity.ts
export type TodoProps = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: TodoStatus;
  readonly priority: Priority;
  readonly dueDate?: Date;
  readonly assigneeId?: string;
  readonly tags: string[];         // ❌ 用語集にない属性
  readonly estimatedHours?: number; // ❌ 用語集にない属性
};
```

**検証結果**: ❌ FAIL
- `tags`と`estimatedHours`は用語集の「TODO」の定義にない
- 新しい属性が必要なら、まず用語集に追加すべき

---

### ルール3: 型の一致

プロパティの型は用語集の定義と一致すること:

**用語集**: `contracts/business/glossary.md`
```markdown
| 用語 | 英語名 | 定義 |
|------|--------|------|
| TODOステータス | TodoStatus | TODOの進捗状況。未着手、作業中、完了のいずれか |
| 優先度 | Priority | TODOの重要度。低、中、高のいずれか |
```

**Good**: 型が一致
```typescript
// domain/todo.entity.ts
export type TodoProps = {
  readonly status: TodoStatus;     // ✅ ValueObject型
  readonly priority: Priority;     // ✅ ValueObject型
  readonly dueDate?: Date;         // ✅ 日時型
};
```

**Bad**: 型が不一致
```typescript
// domain/todo.entity.ts
export type TodoProps = {
  readonly status: string;         // ❌ プリミティブ型（用語集ではValueObject）
  readonly priority: number;       // ❌ プリミティブ型（用語集ではValueObject）
  readonly dueDate?: string;       // ❌ 文字列型（用語集では日時型）
};
```

**検証結果**: ❌ FAIL
- `status`と`priority`はValueObjectとして定義すべき
- `dueDate`はDate型であるべき

---

### ルール4: 日本語と英語の対応

コメント、エラーメッセージ等で使用する日本語は用語集の「用語」と一致すること:

**用語集**: `contracts/business/glossary.md`
```markdown
| 用語 | 英語名 | 定義 |
|------|--------|------|
| TODO | Todo | やるべきタスク |
```

**Good**: 用語集の用語を使用
```typescript
// domain/todo.entity.ts
/**
 * TODO
 *
 * やるべきタスク。タイトル、説明、ステータス、優先度、期限、担当者を持つ。
 */
export class Todo {
  // ✅ 用語集の定義と一致
}

// use-case/register-todo-use-case.ts
return Result.err(new NotFoundError("TODOが見つかりません"));
// ✅ 「TODO」を使用
```

**Bad**: 用語集にない用語を使用
```typescript
// domain/todo.entity.ts
/**
 * タスク ❌ 用語集では「TODO」
 *
 * やるべきこと。 ❌ 用語集では「やるべきタスク」
 */
export class Todo {
  // ...
}

// use-case/register-todo-use-case.ts
return Result.err(new NotFoundError("タスクが見つかりません"));
// ❌ 用語集では「TODO」
```

**検証結果**: ❌ FAIL
- 「タスク」ではなく「TODO」を使用すべき
- 定義文も用語集と一致させるべき

---

## 用語集の更新タイミング

新しい概念が必要になった場合の手順:

1. **用語集に追加**: `contracts/business/glossary.md`に用語、英語名、定義を追加
2. **ビジネス契約に追加**: `contracts/business/{entity}/definition.md`に詳細を記載
3. **コード実装**: 用語集の英語名を使用してEntity/ValueObjectを実装

**逆順で行わない**: コードから先に実装し、後で用語集に追加するのは禁止。用語集が真実の情報源である。

---

## レビュー時のチェックリスト

- [ ] Entity名が用語集の「英語名」と一致しているか？
- [ ] プロパティ名が用語集の「属性」と一致しているか？
- [ ] 型が用語集の定義と一致しているか？（ValueObject vs プリミティブ）
- [ ] コメント・エラーメッセージで用語集の「用語」を使用しているか？
- [ ] 新しい概念を導入する場合、用語集に追加したか？

---

## 関連ドキュメント

- **ユビキタス言語**: `guardrails/constitution/co-evolution/evolution-principles.md`
- **追跡可能性の原則**: `guardrails/constitution/co-evolution/traceability-principles.md`
- **用語集**: `contracts/business/glossary.md`
- **ビジネス契約**: `contracts/business/{entity}/definition.md`
