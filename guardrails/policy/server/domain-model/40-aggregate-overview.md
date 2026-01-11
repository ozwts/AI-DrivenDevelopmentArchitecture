# 集約パターン（Aggregate Pattern）

## 核心原則

集約は**整合性境界**であり、関連するエンティティ群を1つの単位として扱い、**1集約 = 1リポジトリ**で永続化する。

## 関連ドキュメント

| トピック           | ファイル                              |
| ------------------ | ------------------------------------- |
| 永続化パターン     | `../repository/20-aggregate-persistence.md` |
| Entity設計         | `20-entity-overview.md`                     |
| リポジトリIF       | `30-repository-interface-overview.md`       |
| ディレクトリ構成   | `10-domain-model-overview.md`               |

## 設計思想：フラットなディレクトリ構造と集約サイズ

本プロジェクトでは**アグリゲートごとに1ディレクトリ**のフラット構造を採用している。この構造は**集約を適切なサイズに保つ意思表明**である。

### なぜフラット構造か

1. **集約の肥大化を防ぐ**: ディレクトリが深くなる = 集約が大きすぎる兆候
2. **境界の可視化**: 1ディレクトリ = 1集約 = 1トランザクション境界
3. **認知負荷の軽減**: ファイル数が多すぎる場合は集約分割を検討するサイン

## 責務

### 実施すること

1. **整合性境界の定義**: どのエンティティ群を1つの整合性単位とするか
2. **集約ルートの設計**: 外部から参照される唯一のエンティティ
3. **子エンティティの管理**: 集約ルート経由でのみアクセス

### 実施しないこと

1. **永続化の詳細** → Repository実装層
2. **トランザクション管理** → UnitOfWork
3. **技術的制約の露出** → インフラ層

## 設計原則

### 1. 子エンティティに親IDを含めない

子エンティティのドメインモデルには親のIDを含めない。親子関係は永続化層で管理する。

#### ✅ Good

```typescript
export class Attachment {
  readonly id: string;      // 子エンティティもIDを持つ
  readonly fileName: string;
  // todoIdは永続化層で管理
}

export class ProjectMember {
  readonly id: string;      // 子エンティティもIDを持つ
  readonly userId: string;  // 別集約への参照はOK
  readonly role: MemberRole;
  // projectIdは永続化層で管理
}
```

#### ❌ Bad

```typescript
export class Attachment {
  readonly todoId: string; // 親IDはドメインモデルに不要
}

export class ProjectMember {
  readonly projectId: string; // 親IDはドメインモデルに不要
  readonly userId: string;
}
```

**なぜ親IDを含めないのか**:
- 親子関係は集約ルートが管理する責務
- 永続化層で親子関係をマッピングする
- ドメインモデルをシンプルに保つ

### 2. 集約ルートで子エンティティを保持

**必須**: ビジネス契約（`contracts/business/*/definition.md`）の「集約」セクションで「子エンティティ」と定義されたエンティティは、集約ルートのプロパティとして保持する。

#### ✅ Good

```typescript
export class Project {
  readonly id: string;
  readonly name: string;
  readonly members: ProjectMember[]; // 子エンティティのリスト

  addMember(member: ProjectMember, updatedAt: string): Project {
    return new Project({
      ...this,
      members: [...this.members, member],
      updatedAt,
    });
  }
}

// 子エンティティの操作は集約ルート経由
const updatedProject = project.addMember(newMember, now);
const updatedProject = project.removeMember(memberId, now);
```

#### ❌ Bad

```typescript
// 子エンティティを保持していない
export class Project {
  readonly id: string;
  readonly name: string;
  // members がない → 集約パターン違反
}

// 子エンティティを直接操作
member.update({ role: newRole });
```

### 3. リポジトリは集約単位で作る（1集約 = 1リポジトリ）

**禁止**: 子エンティティ専用のリポジトリ（`{子Entity名}Repository`）を作成してはならない。また、集約ルートのリポジトリに子エンティティ専用のCRUDメソッド（`save{子Entity名}`, `find{子Entity名}*`, `remove{子Entity名}*`）を設けてはならない。

#### ✅ Good

```typescript
// 集約ルート単位（子エンティティは集約ルート経由で保存）
export type TodoRepository = {
  todoId(): string;
  attachmentId(): string; // 子エンティティのID生成も提供
  findById(props: { id: string }): Promise<FindByIdResult>; // Todo（attachments含む）を返す
  save(props: { todo: Todo }): Promise<SaveResult>; // Todo（attachments含む）を保存
};

export type ProjectRepository = {
  projectId(): string;
  projectMemberId(): string; // 子エンティティのID生成も提供
  findById(props: { id: string }): Promise<FindByIdResult>; // Project（members含む）を返す
  save(props: { project: Project }): Promise<SaveResult>; // Project（members含む）を保存
};
```

#### ❌ Bad

```typescript
// 子エンティティ専用リポジトリ
export type AttachmentRepository = { ... };
export type ProjectMemberRepository = { ... };

// 集約ルートリポジトリに子エンティティ専用メソッド
export type ProjectRepository = {
  // ... 集約ルートのメソッド ...
  saveMember(props: { member: ProjectMember; projectId: string }): Promise<...>;
  findMembersByProjectId(props: { projectId: string }): Promise<...>;
  removeMember(props: { projectId: string; userId: string }): Promise<...>;
};
```

**なぜ子エンティティ専用リポジトリ・メソッドを禁止するのか**:
- 集約の整合性境界が崩れる
- トランザクション境界が曖昧になる
- 親子関係の一貫性を保証できなくなる
- 集約ルートを経由しない操作は不変条件を破壊しうる

### 4. 集約のサイズ制限（階層の深さ）

IDの参照関係は**1階層まで**に留める。

#### ✅ Good

```
親-子の1階層
Todo (TodoId)
└── Attachment (AttachmentId)
```

#### ❌ Bad

```
2階層（深すぎる）
Project (ProjectId)
└── Task (TaskId)
    └── SubTask (SubTaskId) ← 深すぎる
```

### 5. 別の集約への参照はID参照

#### ✅ Good

```typescript
export class Todo {
  readonly projectId: string | undefined;
}
```

#### ❌ Bad

```typescript
export class Todo {
  readonly project: Project | undefined; // 別の集約を直接保持しない
}
```

## 集約の境界

### 1つの集約に含める基準

- **強い整合性が必要**: 同時に更新される必要がある
- **ライフサイクルが同じ**: 親が削除されたら子も削除される
- **同じトランザクション境界**: 同時に保存される

### 別の集約に分ける基準

- **独立したライフサイクル**: 別々に作成・削除される
- **異なる更新頻度**: 片方だけが頻繁に更新される
- **結果整合性で十分**: 即座の整合性が不要

**注**: Entityの識別子（ID）に関するルールは `20-entity-overview.md` を参照。
