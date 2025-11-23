import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectForm } from "./ProjectForm";
import { mockProject } from "@/utils/testing-utils/mock-data";

test.describe("ProjectForm", () => {
  test("新規作成モード: 初期値が空で表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // プロジェクト名が空
    const nameInput = component.getByLabel("プロジェクト名");
    await expect(nameInput).toHaveValue("");

    // 説明が空
    const descriptionTextarea = component.getByLabel("説明");
    await expect(descriptionTextarea).toHaveValue("");

    // カラーパレットが表示される
    await expect(component.getByText("プロジェクトカラー")).toBeVisible();

    // 作成ボタンが表示される（data-testid + アクセシビリティ検証）
    const submitButton = component.getByTestId("submit-button");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveRole("button");
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("編集モード: 既存データが初期値として表示される", async ({ mount }) => {
    const component = await mount(
      <ProjectForm
        project={mockProject}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    // プロジェクト名の初期値が表示される
    const nameInput = component.getByLabel("プロジェクト名");
    await expect(nameInput).toHaveValue("既存プロジェクト");

    // 説明の初期値が表示される
    const descriptionTextarea = component.getByLabel("説明");
    await expect(descriptionTextarea).toHaveValue("既存プロジェクトの説明");

    // 更新ボタンが表示される（data-testid + アクセシビリティ検証）
    const submitButton = component.getByTestId("submit-button");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveRole("button");
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("プロジェクト名が編集可能", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("新しいプロジェクト");
    await expect(nameInput).toHaveValue("新しいプロジェクト");
  });

  test("説明が編集可能", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const descriptionTextarea = component.getByLabel("説明");
    await descriptionTextarea.fill("プロジェクトの詳細説明");
    await expect(descriptionTextarea).toHaveValue("プロジェクトの詳細説明");
  });

  test("ランダム生成ボタンが表示され、クリック可能", async ({ mount }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const randomButton = component.getByRole("button", {
      name: "ランダムなカラーを生成",
    });
    await expect(randomButton).toBeVisible();
    await randomButton.click();
    // クリックしてもエラーが発生しないことを確認
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

    // キャンセルボタンのアクセシビリティ検証（data-testid + getByRole）
    const cancelButton = component.getByTestId("cancel-button");
    await expect(cancelButton).toHaveRole("button");
    await expect(cancelButton).toHaveAttribute("type", "button");

    // クリック操作
    await cancelButton.click();
    expect(cancelCalled).toBe(true);
  });

  test("フォーム送信時にバリデーションエラーが表示される（空のプロジェクト名）", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // プロジェクト名を空にする
    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("");

    // フォームを送信
    await component.getByTestId("submit-button").click();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    await expect(component.getByRole("alert")).toBeVisible({
      timeout: 3000,
    });
  });

  test("フォーム送信時にバリデーションエラーが表示される（101文字のプロジェクト名）", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // 101文字のプロジェクト名を入力
    const nameInput = component.getByLabel("プロジェクト名");
    const longName = "あ".repeat(101);
    await nameInput.fill(longName);

    // フォームを送信
    await component.getByTestId("submit-button").click();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/100.*文字/i);
  });

  test("フォーム送信時にバリデーションエラーが表示される（1001文字の説明）", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // 有効なプロジェクト名を入力
    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("プロジェクト");

    // 1001文字の説明を入力
    const descriptionTextarea = component.getByLabel("説明");
    const longDescription = "あ".repeat(1001);
    await descriptionTextarea.fill(longDescription);

    // フォームを送信
    await component.getByTestId("submit-button").click();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/1000.*文字/i);
  });

  test("有効なデータの場合、バリデーションエラーが表示されない", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    // 有効なプロジェクト名を入力
    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("新プロジェクト");

    // 有効な説明を入力
    const descriptionTextarea = component.getByLabel("説明");
    await descriptionTextarea.fill("詳細説明");

    // フォームを送信
    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 1文字のプロジェクト名でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("A");

    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 100文字のプロジェクト名でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
    const validName = "あ".repeat(100);
    await nameInput.fill(validName);

    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 1000文字の説明でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProjectForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    const nameInput = component.getByLabel("プロジェクト名");
    await nameInput.fill("プロジェクト");

    const descriptionTextarea = component.getByLabel("説明");
    const validDescription = "あ".repeat(1000);
    await descriptionTextarea.fill(validDescription);

    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });
});
