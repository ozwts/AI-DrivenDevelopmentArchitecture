# リファクタリング契機と判断基準

## 核心原則

ユースケース実装時に**非効率・重複・責務違反**を発見したら、目先の修正で終わらせず**根本的にリファクタリング**する。

## リファクタリング契機の判断フロー

```
1. 同じロジックを複数のUseCaseで実装している？
   → YES: ドメインモデルのメソッドに抽出（貧血症防止）

2. 同じビジネスルールを複数のUseCaseで重複実装している？
   → YES: 共通関数に抽出

3. N+1問題など非効率なデータアクセスがある？
   → YES: リポジトリインターフェースにメソッドを追加

4. 複数Entityの協調ロジックが複雑になっている？
   → YES: ドメインサービスの導入を検討

5. プリミティブ型で表現しているがドメイン固有の制約がある？
   → YES: Value Objectの追加を検討
```

## 契機1: ドメインモデル貧血症の発見

### 貧血ドメインモデルとは

**定義**: ドメインモデルがデータの入れ物（getter/setterのみ）となり、ビジネスロジックがUseCase層やService層に漏れ出す状態。

**問題点**:

- ビジネスロジックが分散し、保守性が低下
- ドメインの知識がコードに表現されない
- 同じバリデーションや計算が複数箇所に重複
- テストが困難（ロジックの所在が不明確）

### 良いドメインモデルの特徴（Rich Domain Model）

- ビジネスロジックがEntity/Value Objectに集約
- ユビキタス言語を反映したメソッド名
- 不変条件がドメイン層で保護される
- UseCase層はドメインオブジェクトの組み立てに専念

### 症状と対処

複数のUseCaseで同じEntity操作ロジックを実装している場合、Entityメソッドに抽出する。

```typescript
// ❌ Bad: 複数のUseCaseで同じステータス遷移チェックを実装
// update-todo-use-case.ts
if (existingTodo.status.value === "COMPLETED") {
  return Result.err(new DomainError("完了済みTODOは更新できません"));
}

// complete-todo-use-case.ts
if (existingTodo.status.value === "COMPLETED") {
  return Result.err(new DomainError("すでに完了しています"));
}

// ✅ Good: Entityメソッドを使用（状態遷移ルールはEntity内に実装済み）
// UseCase層では単にメソッドを呼ぶだけ
const completeResult = existingTodo.complete(now, now);
if (!completeResult.success) {
  return completeResult; // 遷移不可エラーがあればそのまま伝播
}
```

### 判断基準

| 条件                             | 対処                   |
| -------------------------------- | ---------------------- |
| 同じロジックが2箇所以上          | Entityメソッドに抽出   |
| Entity全体を見た不変条件         | Entityメソッドに抽出   |
| 複数フィールドの連動更新         | Entityメソッドに抽出   |
| ビジネスの意図を表現する操作     | Entityメソッドに抽出   |

**参照**: `12-entity-operation-patterns.md` - ドメインメソッド追加のタイミング

## 契機2: ビジネスルールの重複

### 症状

同じビジネスルール（権限チェック等）を複数のUseCaseで重複実装している。

### 対処

共通関数に抽出する。

```typescript
// ❌ Bad: 権限チェックを各UseCaseで重複実装
// update-project-use-case.ts
if (project.userSub !== currentUserSub) {
  return Result.err(new ForbiddenError("プロジェクトへのアクセス権限がありません"));
}

// delete-project-use-case.ts
if (project.userSub !== currentUserSub) {
  return Result.err(new ForbiddenError("プロジェクトへのアクセス権限がありません"));
}

// ✅ Good: 共通関数に抽出
// use-case/shared/project-permission.ts
export const checkProjectOwnership = (
  project: Project,
  currentUserSub: string,
): Result<void, ForbiddenError> => {
  if (project.userSub !== currentUserSub) {
    return Result.err(new ForbiddenError("プロジェクトへのアクセス権限がありません"));
  }
  return Result.ok(undefined);
};

// 各UseCaseで使用
const permissionResult = checkProjectOwnership(project, currentUserSub);
if (!permissionResult.success) {
  return Result.err(permissionResult.error);
}
```

### 配置場所

```
use-case/
├── shared/                          # 共通関数
│   ├── project-permission.ts        # プロジェクト権限チェック
│   └── todo-permission.ts           # TODO権限チェック
├── project/
└── todo/
```

## 契機3: 非効率なデータアクセス（N+1問題）

### 症状

ループ内で個別にデータ取得している。

### 対処

リポジトリインターフェースにバッチ取得メソッドを追加する。

```typescript
// ❌ Bad: N+1問題
const projects: Project[] = [];
for (const projectId of projectIds) {
  const result = await projectRepository.findById({ id: projectId });
  if (result.success && result.data) {
    projects.push(result.data);
  }
}

// ✅ Good: リポジトリインターフェースにfindByIdsを追加
// project.repository.ts（インターフェース）
export type ProjectRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findByIds(props: { ids: string[] }): Promise<FindByIdsResult>; // 追加
};

// UseCase層
const projectsResult = await projectRepository.findByIds({ ids: projectIds });
```

### 追加すべきメソッドのパターン

| 症状                       | 追加メソッド                |
| -------------------------- | --------------------------- |
| IDリストで個別取得         | `findByIds(ids: string[])`  |
| 条件で個別カウント         | `countBy(condition)`        |
| 存在チェックの繰り返し     | `existsAll(ids: string[])`  |
| 関連エンティティの個別取得 | `findWithRelations(id)`     |

## 契機4: 複雑なEntity協調ロジック

### 症状

UseCase内で複数Entityの協調ロジックが複雑になっている。

### 対処

ドメインサービスの導入を検討する。

```typescript
// ❌ Bad: UseCase内で複雑な協調ロジック
async execute(input: TransferTodoInput): Promise<Result> {
  const sourceTodo = await todoRepository.findById({ id: input.sourceTodoId });
  const targetProject = await projectRepository.findById({ id: input.targetProjectId });

  // 複雑な移動ルール（複数Entity間の整合性チェック）
  if (sourceTodo.hasAttachments() && !targetProject.allowsAttachments()) {
    return Result.err(new DomainError("添付ファイル付きTODOは移動できません"));
  }
  if (targetProject.todoCount >= targetProject.maxTodos) {
    return Result.err(new DomainError("移動先プロジェクトのTODO上限に達しています"));
  }
  // ... 更に複雑なルール
}

// ✅ Good: ドメインサービスに抽出
// domain/service/todo-transfer-service.ts
export class TodoTransferService {
  canTransfer(todo: Todo, targetProject: Project): Result<void, DomainError> {
    if (todo.hasAttachments() && !targetProject.allowsAttachments()) {
      return Result.err(new DomainError("添付ファイル付きTODOは移動できません"));
    }
    if (targetProject.todoCount >= targetProject.maxTodos) {
      return Result.err(new DomainError("移動先プロジェクトのTODO上限に達しています"));
    }
    return Result.ok(undefined);
  }
}

// UseCase層
const canTransferResult = todoTransferService.canTransfer(sourceTodo, targetProject);
if (!canTransferResult.success) {
  return Result.err(canTransferResult.error);
}
```

### ドメインサービス導入の判断基準

| 条件                                   | 導入すべき？               |
| -------------------------------------- | -------------------------- |
| 単一Entityで完結する操作               | ❌ Entityメソッドで十分    |
| 複数Entityの協調が必要                 | ✅ ドメインサービスを検討  |
| 外部サービス呼び出しが必要             | ✅ ドメインサービスを検討  |
| ロジックが3つ以上のUseCaseで共有       | ✅ ドメインサービスを検討  |

## 契機5: Value Object追加の必要性

### 症状

プリミティブ型で表現しているが、ドメイン固有の制約がある。

### 対処

Value Objectを追加する。

```typescript
// ❌ Bad: プリミティブ型で表現
type Todo = {
  id: string;
  title: string;        // 1〜100文字の制約がある
  priority: number;     // 1〜5の制約がある
  color: string;        // #RRGGBB形式の制約がある
};

// UseCase内でバリデーション
if (input.title.length < 1 || input.title.length > 100) {
  return Result.err(new DomainError("タイトルは1〜100文字です"));
}

// ✅ Good: Value Objectで表現
type Todo = {
  id: string;
  title: TodoTitle;     // Value Objectで制約を表現
  priority: Priority;   // Value Objectで制約を表現
  color: ProjectColor;  // Value Objectで制約を表現
};

// UseCase層ではValue Object生成のみ
const titleResult = TodoTitle.from({ value: input.title });
if (!titleResult.success) {
  return Result.err(titleResult.error);
}
```

### Value Object追加の判断基準

| 条件                                   | 追加すべき？ |
| -------------------------------------- | ------------ |
| ドメイン固有の形式制約がある           | ✅ 追加      |
| 複数箇所で同じバリデーションが必要     | ✅ 追加      |
| 値に対する操作（比較、変換）がある     | ✅ 追加      |
| 単なるプリミティブ型で十分             | ❌ 不要      |

**参照**: `../domain-model/30-value-object-overview.md` - Value Object設計

## 契機6: 使われていないUseCaseの発見

### 症状

実装したUseCaseがどこからも呼び出されていない。

### 対処

削除する。

```typescript
// ❌ Bad: 使われていないUseCaseを「念のため」残す
// archive-project-use-case.ts - どこからも呼ばれていない
// export-projects-use-case.ts - 今のところ必要ない
// bulk-delete-projects-use-case.ts - まだ要件にない

// ✅ Good: 現在必要なUseCaseのみ実装
// create-project-use-case.ts - 必要
// get-project-use-case.ts - 必要
// update-project-use-case.ts - 必要
// delete-project-use-case.ts - 必要
```

### 確認方法

```bash
# UseCaseの参照箇所を検索
grep -r "ArchiveProjectUseCase" src/
# → 結果が0件なら削除候補
```

## リファクタリング実施の原則

### 1. 発見時に即対処

非効率・重複を発見したら、目先の修正で終わらせず根本的に対処する。

### 2. 影響範囲を確認

リファクタリング前に、影響を受けるファイルを確認する。

### 3. テストで保護

リファクタリング後、既存テストが通ることを確認する。

### 4. 段階的に実施

大規模なリファクタリングは、小さなステップに分割して実施する。

## Do / Don't

### ✅ Good

```typescript
// 重複を発見したら即座にEntityメソッドに抽出
// N+1問題を発見したらリポジトリインターフェースを拡張
// 使われていないUseCaseは削除
// ドメイン固有の制約はValue Objectで表現
```

### ❌ Bad

```typescript
// 「後でリファクタリングする」と放置
// 重複を許容してコピペで実装
// 「念のため」使われていないUseCaseを残す
// プリミティブ型でドメイン制約を表現し続ける
```
