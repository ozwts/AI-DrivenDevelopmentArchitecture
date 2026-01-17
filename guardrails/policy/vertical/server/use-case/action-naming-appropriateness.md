# アクション命名規則の適切性検証

## @what

UseCaseのアクション名（register, create, get, list, update, delete等）が適切に使い分けられているか検証

## @why

アクション名を統一することで、コードの予測可能性を高め、理解しやすくするため

## @failure

以下のパターンを検出した場合に警告:
- アクション名の使い分けが不適切（register vs create等）
- シナリオとUseCaseでアクション名が不一致
- 慣用的でないアクション名を使用している

---

## 核心原則

**アクション名の統一**: 同じ意味のアクションには同じ動詞を使用する。プロジェクト全体で一貫したアクション名の使い分けを行う。

**参照**:
- `guardrails/constitution/user-first/user-first-principles.md`（最小驚きの原則）
- `guardrails/constitution/co-evolution/evolution-principles.md`（ユビキタス言語）

---

## アクション名の使い分け

### register vs create

| アクション | 意味               | 使用場面                   | 例                |
| ---------- | ------------------ | -------------------------- | ----------------- |
| register   | 新規登録           | ユーザー・メンバー等の登録 | register-user     |
| create     | 作成               | リソースの作成             | create-project    |

**使い分けの基準**:
- **register**: 人や組織をシステムに登録する（認証・認可と関連）
- **create**: データやリソースを作成する

**Good**: 適切な使い分け
```
- register-user-use-case.ts      ✅ ユーザー登録
- create-project-use-case.ts     ✅ プロジェクト作成
- create-todo-use-case.ts        ✅ TODO作成（registerではない）
```

**Bad**: 不適切な使い分け
```
- create-user-use-case.ts        ❌ register-user が正しい
- register-project-use-case.ts   ❌ create-project が正しい
```

---

### get vs find vs fetch

| アクション | 意味           | 使用場面           | 例                     |
| ---------- | -------------- | ------------------ | ---------------------- |
| get        | 単一取得       | IDによる取得       | get-todo               |
| list       | 一覧取得       | 複数件取得         | list-todos             |
| find       | 検索           | 条件による検索     | (UseCaseでは使用しない) |
| fetch      | 取得（内部）   | Repository層のみ   | (UseCaseでは使用しない) |

**使い分けの基準**:
- **get**: IDによる単一リソース取得（UseCase層）
- **list**: 複数リソースの一覧取得（UseCase層）
- **find**: Repository層の内部実装で使用（findById, findByName等）
- **fetch**: Repository層の内部実装で使用（fetchAll等）

**Good**: 適切な使い分け
```
- get-todo-use-case.ts           ✅ 単一取得
- list-todos-use-case.ts         ✅ 一覧取得
```

**Bad**: 不適切な使い分け
```
- find-todo-use-case.ts          ❌ get-todo が正しい
- fetch-todo-use-case.ts         ❌ get-todo が正しい
- get-todos-use-case.ts          ❌ list-todos が正しい（複数形）
```

---

### update vs edit vs modify

| アクション | 意味     | 使用場面           | 例                |
| ---------- | -------- | ------------------ | ----------------- |
| update     | 更新     | リソースの更新     | update-todo       |
| edit       | 編集     | (使用しない)       | -                 |
| modify     | 変更     | (使用しない)       | -                 |

**使い分けの基準**:
- **update**: リソースの更新（UseCaseで統一）
- **edit/modify**: 使用しない（updateに統一）

**Good**: 適切な使い分け
```
- update-todo-use-case.ts        ✅ 更新
- update-project-use-case.ts     ✅ 更新
```

**Bad**: 不適切な使い分け
```
- edit-todo-use-case.ts          ❌ update-todo が正しい
- modify-project-use-case.ts     ❌ update-project が正しい
```

---

### delete vs remove

| アクション | 意味         | 使用場面         | 例            |
| ---------- | ------------ | ---------------- | ------------- |
| delete     | 削除         | リソースの削除   | delete-todo   |
| remove     | 取り外し     | 関連の解除       | (使用場面限定) |

**使い分けの基準**:
- **delete**: リソースそのものを削除
- **remove**: 関連を解除（例: メンバーをプロジェクトから外す）

**Good**: 適切な使い分け
```
- delete-todo-use-case.ts        ✅ TODO削除
- delete-project-use-case.ts     ✅ プロジェクト削除
```

**Bad**: 不適切な使い分け
```
- remove-todo-use-case.ts        ❌ delete-todo が正しい（削除の場合）
```

---

### 特殊なアクション

| アクション  | 意味           | 使用場面                     | 例                       |
| ----------- | -------------- | ---------------------------- | ------------------------ |
| prepare-*   | 準備処理       | 非同期処理の開始             | prepare-upload           |
| complete-*  | 完了処理       | 非同期処理の完了             | complete-upload          |
| cancel-*    | キャンセル     | 処理のキャンセル             | cancel-subscription      |
| activate-*  | 有効化         | リソースの有効化             | activate-project         |
| deactivate-* | 無効化        | リソースの無効化             | deactivate-project       |
| archive-*   | アーカイブ     | リソースのアーカイブ         | archive-project          |
| restore-*   | 復元           | リソースの復元               | restore-project          |

---

## シナリオとの一致

シナリオのタイトルとUseCaseのアクション名は一致すること:

**Good**: 一致している
```markdown
# シナリオ: contracts/business/todo/scenario/register-todo.md
# TODOを登録する

# UseCase: server/use-case/todo/register-todo-use-case.ts
export class RegisterTodoUseCaseImpl { ... }
```

**Bad**: 不一致
```markdown
# シナリオ: contracts/business/todo/scenario/register-todo.md
# TODOを登録する

# UseCase: server/use-case/todo/create-todo-use-case.ts ❌
export class CreateTodoUseCaseImpl { ... }
```

---

## RESTful API との対応

UseCaseのアクション名はRESTful APIのHTTPメソッドと対応すること:

| アクション | HTTPメソッド | エンドポイント例           |
| ---------- | ------------ | -------------------------- |
| register   | POST         | POST /users                |
| create     | POST         | POST /projects             |
| get        | GET          | GET /todos/:id             |
| list       | GET          | GET /todos                 |
| update     | PUT/PATCH    | PUT/PATCH /todos/:id       |
| delete     | DELETE       | DELETE /todos/:id          |

---

## レビュー時のチェックリスト

- [ ] アクション名が適切に使い分けられているか？（register vs create等）
- [ ] シナリオのタイトルとUseCaseのアクション名が一致しているか？
- [ ] プロジェクト全体で一貫したアクション名を使用しているか？
- [ ] RESTful APIのHTTPメソッドと対応しているか？
- [ ] 慣用的なアクション名を使用しているか？（edit/modifyを避けてupdateに統一等）

---

## 関連ドキュメント

- **最小驚きの原則**: `guardrails/constitution/user-first/user-first-principles.md`
- **ユビキタス言語**: `guardrails/constitution/co-evolution/evolution-principles.md`
- **UseCase概要**: `guardrails/policy/server/use-case/10-use-case-overview.md`
- **シナリオ命名**: `guardrails/policy/vertical/semantic/server/use-case/scenario-usecase-name-alignment.md`
