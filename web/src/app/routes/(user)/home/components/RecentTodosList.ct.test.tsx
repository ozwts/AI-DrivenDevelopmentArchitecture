import { test, expect } from "@playwright/experimental-ct-react";
import { RecentTodosList } from "./RecentTodosList";
import { TodoDummy1, TodoDummy2 } from "@/mocks/mock-data";
import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;

const mockTodos: TodoResponse[] = [
  {
    ...TodoDummy1,
    id: "recent-1",
    title: "最近追加されたタスク1",
    status: "TODO",
    priority: "HIGH",
    dueDate: "2025-12-31",
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    ...TodoDummy2,
    id: "recent-2",
    title: "最近追加されたタスク2",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    createdAt: "2025-01-14T00:00:00Z",
  },
];

test.describe("RecentTodosList", () => {
  test("空の配列の場合、何も表示されない", async ({ mount }) => {
    const component = await mount(
      <RecentTodosList todos={[]} onTodoClick={() => {}} />,
    );

    await expect(component).toBeEmpty();
  });

  test("タイトルが表示される", async ({ mount }) => {
    const component = await mount(
      <RecentTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    await expect(
      component.getByRole("heading", {
        name: "最近追加されたタスク",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("TODOのタイトルが表示される", async ({ mount }) => {
    const component = await mount(
      <RecentTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    // 動的コンテンツのためgetByTextを使用
    await expect(component.getByText("最近追加されたタスク1")).toBeVisible();
    await expect(component.getByText("最近追加されたタスク2")).toBeVisible();
  });

  test("すべて表示リンクが表示される", async ({ mount }) => {
    const component = await mount(
      <RecentTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    const viewAllLink = component.getByTestId("recent-todos-view-all");
    await expect(viewAllLink).toBeVisible();
    await expect(viewAllLink).toHaveAttribute("href", "/todos");
  });

  test("TODOをクリックするとonTodoClickが呼ばれる", async ({ mount }) => {
    let clickedTodo: TodoResponse | null = null;

    const component = await mount(
      <RecentTodosList
        todos={mockTodos}
        onTodoClick={(todo) => {
          clickedTodo = todo;
        }}
      />,
    );

    await component.getByTestId("recent-todo-recent-1").click();
    expect(clickedTodo).not.toBeNull();
    expect(clickedTodo?.id).toBe("recent-1");
  });

  test("TODOボタンに適切なaria-labelがある", async ({ mount }) => {
    const component = await mount(
      <RecentTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    const button = component.getByTestId("recent-todo-recent-1");
    await expect(button).toHaveAttribute(
      "aria-label",
      "タスク: 最近追加されたタスク1",
    );
  });
});
