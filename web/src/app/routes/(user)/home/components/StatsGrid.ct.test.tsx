import { test, expect } from "@playwright/experimental-ct-react";
import { StatsGrid } from "./StatsGrid";

test.describe("StatsGrid", () => {
  test("未着手のTODO数が表示される", async ({ mount }) => {
    const component = await mount(
      <StatsGrid todoCount={5} inProgressCount={3} doneCount={10} />,
    );

    const todoCard = component.getByTestId("stats-todo");
    await expect(todoCard).toBeVisible();
    await expect(component.getByTestId("stats-todo-count")).toHaveText("5");
  });

  test("進行中のTODO数が表示される", async ({ mount }) => {
    const component = await mount(
      <StatsGrid todoCount={5} inProgressCount={3} doneCount={10} />,
    );

    const inProgressCard = component.getByTestId("stats-in-progress");
    await expect(inProgressCard).toBeVisible();
    await expect(component.getByTestId("stats-in-progress-count")).toHaveText(
      "3",
    );
  });

  test("完了したTODO数が表示される", async ({ mount }) => {
    const component = await mount(
      <StatsGrid todoCount={5} inProgressCount={3} doneCount={10} />,
    );

    const doneCard = component.getByTestId("stats-done");
    await expect(doneCard).toBeVisible();
    await expect(component.getByTestId("stats-done-count")).toHaveText("10");
  });

  test("すべてのカウントが0の場合も正しく表示される", async ({ mount }) => {
    const component = await mount(
      <StatsGrid todoCount={0} inProgressCount={0} doneCount={0} />,
    );

    await expect(component.getByTestId("stats-todo-count")).toHaveText("0");
    await expect(component.getByTestId("stats-in-progress-count")).toHaveText(
      "0",
    );
    await expect(component.getByTestId("stats-done-count")).toHaveText("0");
  });

  test("大きな数値も正しく表示される", async ({ mount }) => {
    const component = await mount(
      <StatsGrid todoCount={999} inProgressCount={500} doneCount={1234} />,
    );

    await expect(component.getByTestId("stats-todo-count")).toHaveText("999");
    await expect(component.getByTestId("stats-in-progress-count")).toHaveText(
      "500",
    );
    await expect(component.getByTestId("stats-done-count")).toHaveText("1234");
  });
});
