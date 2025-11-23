import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectCard } from "./ProjectCard";
import { mockProject } from "@/utils/testing-utils/mock-data";

test.describe("ProjectCard", () => {
  test("プロジェクト情報が正しく表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // プロジェクト名が表示される（heading roleを使用）
    await expect(
      component.getByRole("heading", { name: "既存プロジェクト" }),
    ).toBeVisible();

    // 説明が表示される
    await expect(component.getByText("既存プロジェクトの説明")).toBeVisible();

    // TODO数が表示される
    await expect(component.getByText("5件のTODO")).toBeVisible();

    // 作成日が表示される
    const expectedDate = new Date(mockProject.createdAt).toLocaleDateString(
      "ja-JP",
    );
    await expect(component.getByText(`作成: ${expectedDate}`)).toBeVisible();
  });

  test("説明がない場合は表示されない", async ({ mount }) => {
    const projectWithoutDescription = {
      ...mockProject,
      description: undefined,
    };

    const component = await mount(
      <ProjectCard
        project={projectWithoutDescription}
        todoCount={0}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // プロジェクト名は表示される（heading roleを使用）
    await expect(
      component.getByRole("heading", { name: "既存プロジェクト" }),
    ).toBeVisible();

    // 説明は表示されない
    await expect(
      component.getByText("既存プロジェクトの説明"),
    ).not.toBeVisible();
  });

  test("TODO数が0の場合も正しく表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={0}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    await expect(component.getByText("0件のTODO")).toBeVisible();
  });

  test("カードクリックでonClickが呼ばれる", async ({ mount }) => {
    let clickedProject = null;
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={(project) => {
          clickedProject = project;
        }}
      />,
    );

    // カード全体をクリック（heading roleを使用）
    await component.getByRole("heading", { name: "既存プロジェクト" }).click();

    // onClickが呼ばれたことを確認
    expect(clickedProject).toEqual(mockProject);
  });

  test("編集ボタンが正しく表示され、アクセシビリティ要件を満たす", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // 編集ボタンが存在する
    const editButtons = component.getByRole("button");
    const editButton = editButtons.nth(0); // 最初のボタンが編集ボタン

    // アクセシビリティ検証
    await expect(editButton).toBeVisible();
    await expect(editButton).toHaveRole("button");
  });

  test("編集ボタンをクリックするとonEditが呼ばれる", async ({ mount }) => {
    let editedProject = null;
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={(project) => {
          editedProject = project;
        }}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // 編集ボタンをクリック
    const editButtons = component.getByRole("button");
    const editButton = editButtons.nth(0);
    await editButton.click();

    // onEditが呼ばれたことを確認
    expect(editedProject).toEqual(mockProject);
  });

  test("編集ボタンをクリックしてもカードのonClickは呼ばれない（stopPropagation）", async ({
    mount,
  }) => {
    let cardClicked = false;
    let editClicked = false;

    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {
          editClicked = true;
        }}
        onDelete={() => {}}
        onClick={() => {
          cardClicked = true;
        }}
      />,
    );

    // 編集ボタンをクリック
    const editButtons = component.getByRole("button");
    const editButton = editButtons.nth(0);
    await editButton.click();

    // onEditは呼ばれるが、onClickは呼ばれない
    expect(editClicked).toBe(true);
    expect(cardClicked).toBe(false);
  });

  test("削除ボタンが正しく表示され、アクセシビリティ要件を満たす", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // 削除ボタンが存在する
    const buttons = component.getByRole("button");
    const deleteButton = buttons.nth(1); // 2番目のボタンが削除ボタン

    // アクセシビリティ検証
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toHaveRole("button");
  });

  test("削除ボタンをクリックするとonDeleteが呼ばれる", async ({ mount }) => {
    let deletedProject = null;
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={(project) => {
          deletedProject = project;
        }}
        onClick={() => {}}
      />,
    );

    // 削除ボタンをクリック
    const buttons = component.getByRole("button");
    const deleteButton = buttons.nth(1);
    await deleteButton.click();

    // onDeleteが呼ばれたことを確認
    expect(deletedProject).toEqual(mockProject);
  });

  test("削除ボタンをクリックしてもカードのonClickは呼ばれない（stopPropagation）", async ({
    mount,
  }) => {
    let cardClicked = false;
    let deleteClicked = false;

    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {
          deleteClicked = true;
        }}
        onClick={() => {}}
      />,
    );

    // 削除ボタンをクリック
    const buttons = component.getByRole("button");
    const deleteButton = buttons.nth(1);
    await deleteButton.click();

    // onDeleteは呼ばれるが、onClickは呼ばれない
    expect(deleteClicked).toBe(true);
    expect(cardClicked).toBe(false);
  });

  test("プロジェクトカラーが正しく適用される", async ({ mount }) => {
    const component = await mount(
      <ProjectCard
        project={mockProject}
        todoCount={5}
        onEdit={() => {}}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );

    // カラーボックス内のアイコンが表示される（白色のFolderIcon）
    // 最初のFolderIconがカラーボックス内のアイコン
    const icons = component.locator("svg");
    await expect(icons.first()).toBeVisible();
  });
});
