import { z } from "zod";
import { schemas } from "../generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

/**
 * コンポーネントテスト用のモックデータ
 */
export const mockUser: UserResponse = {
  id: "test-user-id",
  sub: "test-sub",
  name: "テストユーザー",
  email: "test@example.com",
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockProject: ProjectResponse = {
  id: "test-project-id",
  name: "既存プロジェクト",
  description: "既存プロジェクトの説明",
  color: "#FF5733",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockAttachment: AttachmentResponse = {
  id: "test-attachment-id",
  todoId: "test-todo-id",
  filename: "document.pdf",
  contentType: "application/pdf",
  filesize: 1024000,
  status: "UPLOADED" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockTodo: TodoResponse = {
  id: "test-todo-id",
  title: "既存TODO",
  description: "既存TODOの説明",
  status: "IN_PROGRESS" as const,
  priority: "HIGH" as const,
  dueDate: "2025-12-31",
  projectId: "project-1",
  assigneeUserId: "user-1",
  createdBy: "creator-id",
  attachments: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/**
 * スナップショットテスト / モックサーバー用のダミーデータ
 */

// ユーザーダミーデータ
export const UserDummy1: UserResponse = {
  id: "user-1",
  sub: "cognito-sub-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  emailVerified: true,
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
};

export const UserDummy2: UserResponse = {
  id: "user-2",
  sub: "cognito-sub-2",
  name: "佐藤花子",
  email: "sato@example.com",
  emailVerified: true,
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

export const UserDummy3: UserResponse = {
  id: "user-3",
  sub: "cognito-sub-3",
  name: "鈴木一郎",
  email: "suzuki@example.com",
  emailVerified: false,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

// 添付ファイルダミーデータ
export const AttachmentDummy1: AttachmentResponse = {
  id: "attachment-1",
  todoId: "1",
  filename: "database-design.pdf",
  contentType: "application/pdf",
  filesize: 1024000,
  status: "UPLOADED",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const AttachmentDummy2: AttachmentResponse = {
  id: "attachment-2",
  todoId: "1",
  filename: "er-diagram.png",
  contentType: "image/png",
  filesize: 512000,
  status: "UPLOADED",
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export const AttachmentDummy3: AttachmentResponse = {
  id: "attachment-3",
  todoId: "3",
  filename: "api-specification.yaml",
  contentType: "application/x-yaml",
  filesize: 256000,
  status: "UPLOADED",
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export const AttachmentDummy4: AttachmentResponse = {
  id: "attachment-4",
  todoId: "5",
  filename: "review-comments.xlsx",
  contentType:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  filesize: 768000,
  status: "UPLOADED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// TODOダミーデータ
export const TodoDummy1: TodoResponse = {
  id: "1",
  title: "データベース設計を完了する",
  description: "ユーザーテーブルとTODOテーブルのER図を作成する",
  status: "IN_PROGRESS",
  priority: "HIGH",
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  projectId: "project-1",
  assigneeUserId: "user-1",
  createdBy: "user-1",
  attachments: [AttachmentDummy1, AttachmentDummy2],
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export const TodoDummy2: TodoResponse = {
  id: "2",
  title: "API実装",
  description: "RESTful APIのエンドポイントを実装する",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  projectId: "project-2",
  assigneeUserId: "user-2",
  createdBy: "user-2",
  attachments: [],
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const TodoDummy3: TodoResponse = {
  id: "3",
  title: "テストコード作成",
  description: "ユニットテストとE2Eテストを書く",
  status: "TODO",
  priority: "LOW",
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  projectId: "project-1",
  assigneeUserId: "user-3",
  createdBy: "user-3",
  attachments: [AttachmentDummy3],
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export const TodoDummy4: TodoResponse = {
  id: "4",
  title: "ドキュメント作成",
  description: "READMEとAPIドキュメントを更新する",
  status: "COMPLETED",
  priority: "MEDIUM",
  projectId: "project-3",
  assigneeUserId: "user-1",
  attachments: [],
  createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

export const TodoDummy5: TodoResponse = {
  id: "5",
  title: "コードレビュー対応",
  description: "指摘事項を修正する",
  status: "IN_PROGRESS",
  priority: "HIGH",
  dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
  projectId: "project-2",
  assigneeUserId: "user-2",
  attachments: [AttachmentDummy4],
  createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

// プロジェクトダミーデータ
export const ProjectDummy1: ProjectResponse = {
  id: "project-1",
  name: "システム刷新プロジェクト",
  description: "レガシーシステムのモダナイゼーション",
  color: "#001964",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

export const ProjectDummy2: ProjectResponse = {
  id: "project-2",
  name: "新規サービス開発",
  description: "AI活用の新サービス企画・開発",
  color: "#4CAF50",
  createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const ProjectDummy3: ProjectResponse = {
  id: "project-3",
  name: "運用改善プロジェクト",
  description: "DevOps体制の構築とCI/CD導入",
  color: "#FFA726",
  createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};
