import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectCard } from "./ProjectCard";
import { mockProject } from "@/mocks/mock-data";
import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

const testProject: ProjectResponse = {
  ...mockProject,
  id: "project-1",
  name: "テストプロジェクト",
  description: "テストプロジェクトの説明",
  color: "#3B82F6",
  createdAt: "2025-01-15T00:00:00Z",
};

test.describe("ProjectCard", () => {
  test("プロジェクト名が表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await expect(
      component.getByRole("heading", { name: "テストプロジェクト" }),
    ).toBeVisible();
  });

  test("プロジェクト説明が表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // 動的コンテンツのためgetByTextを使用
    await expect(component.getByText("テストプロジェクトの説明")).toBeVisible();
  });

  test("説明がない場合、説明が表示されない", async ({ mount }) => {
    const projectWithoutDescription: ProjectResponse = {
      ...testProject,
      description: undefined,
    };

    const component = await mount(
      <ProjectCard
        project={projectWithoutDescription}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await expect(
      component.getByRole("heading", { name: "テストプロジェクト" }),
    ).toBeVisible();
    await expect(
      component.getByText("テストプロジェクトの説明"),
    ).not.toBeVisible();
  });

  test("TODO数が表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await expect(component.getByTestId("todo-count")).toHaveText("5件のTODO");
  });

  test("TODO数が0の場合も表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        todoCount={0}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await expect(component.getByTestId("todo-count")).toHaveText("0件のTODO");
  });

  test("作成日が表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    const createdAt = component.getByTestId("created-at");
    await expect(createdAt).toBeVisible();
    await expect(createdAt).toContainText("2025/1/15");
  });

  test("編集ボタンをクリックするとonEditが呼ばれる", async ({ mount }) => {
    let editedProject: ProjectResponse | null = null;

    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={(project) => {
          editedProject = project;
        }}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await component.getByTestId("edit-button").click();
    expect(editedProject).toEqual(testProject);
  });

  test("削除ボタンをクリックするとonDeleteが呼ばれる", async ({ mount }) => {
    let deletedProject: ProjectResponse | null = null;

    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={(project) => {
          deletedProject = project;
        }}
        onClick={() => {}}
      />,
    );

    await component.getByTestId("delete-button").click();
    expect(deletedProject).toEqual(testProject);
  });

  test("カードをクリックするとonClickが呼ばれる", async ({ mount }) => {
    let clickedProject: ProjectResponse | null = null;

    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={(project) => {
          clickedProject = project;
        }}
      />,
    );

    // カードのタイトル部分をクリック
    await component
      .getByRole("heading", { name: "テストプロジェクト" })
      .click();
    expect(clickedProject).toEqual(testProject);
  });

  test("編集ボタンにaria-labelがある", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    const editButton = component.getByTestId("edit-button");
    await expect(editButton).toHaveAttribute("aria-label", "編集");
  });

  test("削除ボタンにaria-labelがある", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={testProject}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    const deleteButton = component.getByTestId("delete-button");
    await expect(deleteButton).toHaveAttribute("aria-label", "削除");
  });
});
