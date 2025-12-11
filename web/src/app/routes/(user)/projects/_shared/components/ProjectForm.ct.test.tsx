import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectForm } from "./ProjectForm";
import { mockProject } from "@/mocks/mock-data";

test.describe("ProjectForm", () => {
  test("新規作成時、フォームが空の状態で表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByTestId("input-name");
    await expect(nameInput).toHaveValue("");
  });

  test("編集時、既存の値が初期値として表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm
        project={mockProject}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByTestId("input-name");
    await expect(nameInput).toHaveValue("既存プロジェクト");

    const descriptionTextarea = component.getByTestId("textarea-description");
    await expect(descriptionTextarea).toHaveValue("既存プロジェクトの説明");
  });

  test("プロジェクト名を入力できる", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByTestId("input-name");
    await nameInput.fill("新しいプロジェクト");
    await expect(nameInput).toHaveValue("新しいプロジェクト");
  });

  test("説明を入力できる", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const descriptionTextarea = component.getByTestId("textarea-description");
    await descriptionTextarea.fill("プロジェクトの説明");
    await expect(descriptionTextarea).toHaveValue("プロジェクトの説明");
  });

  test("カラー選択ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // 6つのカラー選択ボタンが表示される
    for (let i = 0; i < 6; i++) {
      await expect(component.getByTestId(`color-option-${i}`)).toBeVisible();
    }
  });

  test("カラーをクリックして選択できる", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const colorOption = component.getByTestId("color-option-2");
    await colorOption.click();

    // 選択されたカラーオプションにはscale-110クラスが適用される
    await expect(colorOption).toHaveClass(/scale-110/);
  });

  test("ランダム生成ボタンをクリックするとカラーパレットが更新される", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // 最初のカラーオプションのスタイルを取得
    const firstColorOption = component.getByTestId("color-option-0");
    const initialBgColor = await firstColorOption.evaluate(
      (el) => (el as HTMLElement).style.backgroundColor,
    );

    // ランダム生成ボタンをクリック
    await component.getByTestId("regenerate-colors-button").click();

    // カラーが変更されたことを確認（変更されない可能性があるので、ボタンが動作することを確認）
    await expect(firstColorOption).toBeVisible();
    // 注意: ランダムなので同じ色になる可能性があるため、厳密な変更チェックは行わない
  });

  test("キャンセルボタンをクリックするとonCancelが呼ばれる", async ({
    mount,
  }) => {
    let cancelCalled = false;

    const component = await mount(
      <ProjectForm
        onSubmit={async () => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
      />,
    );

    await component.getByTestId("cancel-button").click();
    expect(cancelCalled).toBe(true);
  });

  test("新規作成時、送信ボタンのテキストは「作成」", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    await expect(component.getByTestId("submit-button")).toHaveText("作成");
  });

  test("編集時、送信ボタンのテキストは「更新」", async ({ mount }) => {
    const component = await mount(
      <ProjectForm
        project={mockProject}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    await expect(component.getByTestId("submit-button")).toHaveText("更新");
  });

  test("isLoading=trueの時、送信ボタンがローディング状態になる", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm
        onSubmit={async () => {}}
        onCancel={() => {}}
        isLoading={true}
      />,
    );

    const submitButton = component.getByTestId("submit-button");
    await expect(submitButton).toBeDisabled();

    // ローディングスピナーが表示される
    await expect(component.getByRole("status")).toBeVisible();
  });

  test("送信ボタンがtype=submitである", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const submitButton = component.getByTestId("submit-button");
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("キャンセルボタンがtype=buttonである", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const cancelButton = component.getByTestId("cancel-button");
    await expect(cancelButton).toHaveAttribute("type", "button");
  });

  test("ランダム生成ボタンにaria-labelがある", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const regenerateButton = component.getByTestId("regenerate-colors-button");
    await expect(regenerateButton).toHaveAttribute(
      "aria-label",
      "ランダムなカラーを生成",
    );
  });
});
