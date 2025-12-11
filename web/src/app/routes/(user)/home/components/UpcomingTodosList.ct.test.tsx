import { test, expect } from "@playwright/experimental-ct-react";
import { UpcomingTodosList } from "./UpcomingTodosList";
import { TodoDummy1, TodoDummy2 } from "@/mocks/mock-data";
import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodoWithDueDate = TodoResponse & { dueDate: string };

// 明日の日付を取得
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split("T")[0];

// 昨日の日付を取得（期限切れ用）
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split("T")[0];

const mockTodos: TodoWithDueDate[] = [
  {
    ...TodoDummy1,
    id: "upcoming-1",
    title: "期限が近いタスク1",
    status: "TODO",
    priority: "HIGH",
    dueDate: tomorrowStr,
  },
  {
    ...TodoDummy2,
    id: "upcoming-2",
    title: "期限が近いタスク2",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    dueDate: tomorrowStr,
  },
];

const overdueTodos: TodoWithDueDate[] = [
  {
    ...TodoDummy1,
    id: "overdue-1",
    title: "期限切れタスク",
    status: "TODO",
    priority: "HIGH",
    dueDate: yesterdayStr,
  },
];

test.describe("UpcomingTodosList", () => {
  test("空の配列の場合、何も表示されない", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={[]} onTodoClick={() => {}} />,
    );

    await expect(component).toBeEmpty();
  });

  test("タイトルが表示される", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    await expect(
      component.getByRole("heading", {
        name: "期限が近いタスク（3日以内）",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("TODOのタイトルが表示される", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    // 動的コンテンツのためgetByTextを使用
    await expect(component.getByText("期限が近いタスク1")).toBeVisible();
    await expect(component.getByText("期限が近いタスク2")).toBeVisible();
  });

  test("すべて表示リンクが表示される", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    const viewAllLink = component.getByTestId("upcoming-todos-view-all");
    await expect(viewAllLink).toBeVisible();
    await expect(viewAllLink).toHaveAttribute("href", "/todos");
  });

  test("TODOをクリックするとonTodoClickが呼ばれる", async ({ mount }) => {
    let clickedTodo: TodoResponse | null = null;

    const component = await mount(
      <UpcomingTodosList
        todos={mockTodos}
        onTodoClick={(todo) => {
          clickedTodo = todo;
        }}
      />,
    );

    await component.getByTestId("upcoming-todo-upcoming-1").click();
    expect(clickedTodo).not.toBeNull();
    expect(clickedTodo?.id).toBe("upcoming-1");
  });

  test("期限切れのタスクにはoverdue-badgeが表示される", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={overdueTodos} onTodoClick={() => {}} />,
    );

    const overdueBadge = component.getByTestId("overdue-badge-overdue-1");
    await expect(overdueBadge).toBeVisible();
  });

  test("TODOボタンに適切なaria-labelがある", async ({ mount }) => {
    const component = await mount(
      <UpcomingTodosList todos={mockTodos} onTodoClick={() => {}} />,
    );

    const button = component.getByTestId("upcoming-todo-upcoming-1");
    await expect(button).toHaveAttribute(
      "aria-label",
      /タスク:.*期限が近いタスク1/,
    );
  });
});
