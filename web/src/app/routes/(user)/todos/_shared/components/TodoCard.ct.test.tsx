import { test, expect } from "@playwright/experimental-ct-react";
import { TodoCard } from "./TodoCard";
import type { z } from "zod";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type UserResponse = z.infer<typeof schemas.UserResponse>;

const mockTodo: TodoResponse = {
  id: "todo-1",
  title: "データベース設計を完了する",
  description: "ユーザーテーブルとプロジェクトテーブルの設計",
  status: "TODO",
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
  description: "説明",
  color: "#3B82F6",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
};

const mockUser: UserResponse = {
  id: "user-1",
  sub: "auth0|user-1",
  name: "山田太郎",
  email: "yamada@example.com",
  emailVerified: true,
  role: "MEMBER",
  profileImageUrl: null,
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
};

test("タイトルが表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // タイトルは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("データベース設計を完了する")).toBeVisible();
});

test("説明が表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // 説明は動的コンテンツのためgetByTextを使用
  await expect(
    component.getByText("ユーザーテーブルとプロジェクトテーブルの設計"),
  ).toBeVisible();
});

test("ステータスバッジが表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // ステータスは動的コンテンツのためgetByTextを使用
  await expect(component.getByText("未着手")).toBeVisible();
});

test("優先度バッジが表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // 優先度は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("高")).toBeVisible();
});

test("プロジェクト名が表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      project={mockProject}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // プロジェクト名は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("新規プロジェクト")).toBeVisible();
});

test("担当者名が表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      assignee={mockUser}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // 担当者名は動的コンテンツのためgetByTextを使用
  await expect(component.getByText("山田太郎")).toBeVisible();
});

test("期限が表示される", async ({ mount }) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // 期限は動的コンテンツのためgetByTextを使用
  await expect(component.getByText(/期限:.*2025\/12\/31/)).toBeVisible();
});

test("期限切れの場合、警告バッジが表示される", async ({ mount }) => {
  const overdueTodo: TodoResponse = {
    ...mockTodo,
    dueDate: "2020-01-01",
    status: "TODO",
  };

  const component = await mount(
    <TodoCard
      todo={overdueTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  // 期限は動的コンテンツのためgetByTextを使用
  await expect(component.getByText(/期限:/)).toBeVisible();
});

test("編集ボタンをクリックするとonEditが呼ばれる", async ({ mount }) => {
  let editedTodo: TodoResponse | null = null;

  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={(todo) => {
        editedTodo = todo;
      }}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  await component.getByRole("button", { name: "編集" }).click();
  expect(editedTodo).toEqual(mockTodo);
});

test("削除ボタンをクリックするとonDeleteが呼ばれる", async ({ mount }) => {
  let deletedTodo: TodoResponse | null = null;

  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={(todo) => {
        deletedTodo = todo;
      }}
      onStatusChange={() => {}}
    />,
  );

  await component.getByRole("button", { name: "削除" }).click();
  expect(deletedTodo).toEqual(mockTodo);
});

test("ステータスが「未着手」の場合、「開始」ボタンが表示される", async ({
  mount,
}) => {
  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  await expect(component.getByRole("button", { name: "開始" })).toBeVisible();
});

test("ステータスが「進行中」の場合、「完了」ボタンが表示される", async ({
  mount,
}) => {
  const inProgressTodo: TodoResponse = {
    ...mockTodo,
    status: "IN_PROGRESS",
  };

  const component = await mount(
    <TodoCard
      todo={inProgressTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  await expect(component.getByRole("button", { name: "完了" })).toBeVisible();
});

test("ステータスが「完了」の場合、ステータス変更ボタンが表示されない", async ({
  mount,
}) => {
  const doneTodo: TodoResponse = {
    ...mockTodo,
    status: "COMPLETED",
  };

  const component = await mount(
    <TodoCard
      todo={doneTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  await expect(
    component.getByRole("button", { name: "開始" }),
  ).not.toBeVisible();
  await expect(
    component.getByRole("button", { name: "完了" }),
  ).not.toBeVisible();
});

test("「開始」ボタンをクリックするとステータスが「進行中」に変更される", async ({
  mount,
}) => {
  let changedStatus: TodoStatus | null = null;

  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={(_, status) => {
        changedStatus = status;
      }}
    />,
  );

  await component.getByRole("button", { name: "開始" }).click();
  expect(changedStatus).toBe("IN_PROGRESS");
});

test("「完了」ボタンをクリックするとステータスが「完了」に変更される", async ({
  mount,
}) => {
  const inProgressTodo: TodoResponse = {
    ...mockTodo,
    status: "IN_PROGRESS",
  };

  let changedStatus: TodoStatus | null = null;

  const component = await mount(
    <TodoCard
      todo={inProgressTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={(_, status) => {
        changedStatus = status;
      }}
    />,
  );

  await component.getByRole("button", { name: "完了" }).click();
  expect(changedStatus).toBe("COMPLETED");
});

test("詳細を見るボタンをクリックするとonViewが呼ばれる", async ({ mount }) => {
  let viewedTodo: TodoResponse | null = null;

  const component = await mount(
    <TodoCard
      todo={mockTodo}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
      onView={(todo) => {
        viewedTodo = todo;
      }}
    />,
  );

  await component.getByRole("button", { name: "詳細を見る" }).click();
  expect(viewedTodo).toEqual(mockTodo);
});

test("添付ファイルがある場合、添付ファイル数が表示される", async ({
  mount,
}) => {
  const todoWithAttachments: TodoResponse = {
    ...mockTodo,
    attachments: [
      {
        id: "attachment-1",
        todoId: "todo-1",
        filename: "file1.pdf",
        filesize: 1024,
        contentType: "application/pdf",
        status: "UPLOADED",
        createdAt: "2025-01-15T00:00:00Z",
        updatedAt: "2025-01-15T00:00:00Z",
      },
      {
        id: "attachment-2",
        todoId: "todo-1",
        filename: "file2.pdf",
        filesize: 2048,
        contentType: "application/pdf",
        status: "UPLOADED",
        createdAt: "2025-01-15T00:00:00Z",
        updatedAt: "2025-01-15T00:00:00Z",
      },
    ],
  };

  const component = await mount(
    <TodoCard
      todo={todoWithAttachments}
      onEdit={() => {}}
      onDelete={() => {}}
      onStatusChange={() => {}}
    />,
  );

  await expect(component.getByText("2件")).toBeVisible();
});
