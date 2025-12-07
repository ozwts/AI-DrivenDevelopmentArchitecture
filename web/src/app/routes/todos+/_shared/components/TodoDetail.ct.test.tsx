import { test, expect } from "@playwright/experimental-ct-react";
import { TodoDetail } from "./TodoDetail";
import type { z } from "zod";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

const mockTodo: TodoResponse = {
  id: "todo-1",
  title: "データベース設計を完了する",
  description: "ユーザーテーブルとプロジェクトテーブルの設計を行う",
  status: "IN_PROGRESS",
  priority: "HIGH",
  dueDate: "2025-12-31",
  projectId: "project-1",
  assigneeUserId: "user-1",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
  attachments: [],
};

const mockProject: ProjectResponse = {
  id: "project-1",
  name: "新規プロジェクト",
  description: "プロジェクトの説明",
  color: "#3B82F6",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
};

test("タイトルが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // タイトルは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("データベース設計を完了する")).toBeVisible();
});

test("説明が表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // 説明は動的コンテンツのためgetByTextを使用
  await expect(
    component.getByText("ユーザーテーブルとプロジェクトテーブルの設計を行う"),
  ).toBeVisible();
});

test("説明がない場合は表示されない", async ({ mount }) => {
  const todoWithoutDescription: TodoResponse = {
    ...mockTodo,
    description: "",
  };

  const component = await mount(<TodoDetail todo={todoWithoutDescription} />);

  // タイトルは表示される（動的コンテンツ）
  await expect(
    component.getByRole("heading", { name: "データベース設計を完了する" }),
  ).toBeVisible();
  // 説明テキストが表示されないことを確認（動的コンテンツ）
  await expect(
    component.getByText("ユーザーテーブルとプロジェクトテーブルの設計を行う"),
  ).not.toBeVisible();
});

test("ステータスラベルが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // ラベルとステータスは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("ステータス:")).toBeVisible();
  await expect(component.getByText("進行中")).toBeVisible();
});

test("優先度ラベルが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // ラベルと優先度は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("優先度:")).toBeVisible();
  await expect(component.getByText("高")).toBeVisible();
});

test("期限が表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // ラベルと期限は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("期限:")).toBeVisible();
  await expect(component.getByText("2025/12/31")).toBeVisible();
});

test("期限がない場合は表示されない", async ({ mount }) => {
  const todoWithoutDueDate: TodoResponse = {
    ...mockTodo,
    dueDate: undefined,
  };

  const component = await mount(<TodoDetail todo={todoWithoutDueDate} />);

  await expect(component.getByText("期限:")).not.toBeVisible();
});

test("プロジェクト名が表示される", async ({ mount }) => {
  const component = await mount(
    <TodoDetail todo={mockTodo} project={mockProject} />,
  );

  await expect(component.getByText("プロジェクト:")).toBeVisible();
  await expect(component.getByText("新規プロジェクト")).toBeVisible();
});

test("プロジェクトがない場合は表示されない", async ({ mount }) => {
  const todoWithoutProject: TodoResponse = {
    ...mockTodo,
    projectId: undefined,
  };

  const component = await mount(<TodoDetail todo={todoWithoutProject} />);

  await expect(component.getByText("プロジェクト:")).not.toBeVisible();
});

test("プロジェクトIDがあってもprojectオブジェクトがない場合は表示されない", async ({
  mount,
}) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  await expect(component.getByText("プロジェクト:")).not.toBeVisible();
});

test("添付ファイルセクションが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  await expect(component.getByTestId("attachment-section")).toBeVisible();
  // セクションタイトルはheading roleで検証（アクセシビリティベストプラクティス）
  await expect(
    component.getByRole("heading", { name: "添付ファイル", exact: true }),
  ).toBeVisible();
});

test("AttachmentUploadコンポーネントが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // AttachmentUploadコンポーネントのファイル選択ボタンが存在することを確認（動的コンテンツ）
  await expect(component.getByText("ファイルを選択")).toBeVisible();
});

test("AttachmentListコンポーネントが表示される", async ({ mount }) => {
  const component = await mount(<TodoDetail todo={mockTodo} />);

  // AttachmentListコンポーネントが表示されることを確認（空の状態、動的コンテンツ）
  await expect(component.getByText("添付ファイルなし")).toBeVisible();
});
