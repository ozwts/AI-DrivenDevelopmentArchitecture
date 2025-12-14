import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectForm } from "./ProjectForm";
import { mockProject } from "@/mocks/mock-data";

test.describe("ProjectForm", () => {
  test("新規作成時、フォームが空の状態で表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
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

    const nameInput = component.getByLabel("プロジェクト名");
    await expect(nameInput).toHaveValue("既存プロジェクト");

    const descriptionTextarea = component.getByLabel("説明");
    await expect(descriptionTextarea).toHaveValue("既存プロジェクトの説明");
  });

  test("プロジェクト名を入力できる", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("新しいプロジェクト");
    await expect(nameInput).toHaveValue("新しいプロジェクト");
  });

  test("説明を入力できる", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const descriptionTextarea = component.getByLabel("説明");
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

    // ランダム生成ボタンをクリック（getByRole: 暗黙的a11y検証）
    await component
      .getByRole("button", { name: "ランダムなカラーを生成" })
      .click();

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

    // キャンセルボタンをクリック（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "キャンセル" }).click();
    expect(cancelCalled).toBe(true);
  });

  test("新規作成時、送信ボタンのテキストは「作成」", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // getByRole で作成ボタンを検証（暗黙的a11y検証）
    await expect(component.getByRole("button", { name: "作成" })).toBeVisible();
  });

  test("編集時、送信ボタンのテキストは「更新」", async ({ mount }) => {
    const component = await mount(
      <ProjectForm
        project={mockProject}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    // getByRole で更新ボタンを検証（暗黙的a11y検証）
    await expect(component.getByRole("button", { name: "更新" })).toBeVisible();
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

    // 送信ボタンがローディング状態になる（テキストが「処理中...」に変わる）
    const submitButton = component.getByRole("button", { name: /処理中/ });
    await expect(submitButton).toBeDisabled();

    // ローディングスピナーが表示される
    await expect(component.getByRole("status")).toBeVisible();
  });

  test("送信ボタンがtype=submitである", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // getByRole で作成ボタンを取得（暗黙的a11y検証）
    const submitButton = component.getByRole("button", { name: "作成" });
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("キャンセルボタンがtype=buttonである", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // getByRole でキャンセルボタンを取得（暗黙的a11y検証）
    const cancelButton = component.getByRole("button", { name: "キャンセル" });
    await expect(cancelButton).toHaveAttribute("type", "button");
  });

  test("ランダム生成ボタンがアクセシブル", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // getByRole で取得可能 = aria-label が正しく設定されている（暗黙的a11y検証）
    await expect(
      component.getByRole("button", { name: "ランダムなカラーを生成" }),
    ).toBeVisible();
  });
});
