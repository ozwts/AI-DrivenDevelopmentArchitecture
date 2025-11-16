import { test, expect } from "@playwright/experimental-ct-react";
import { ProjectForm } from "./ProjectForm";
import { mockProject } from "@/testing-utils/mock-data";

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

    // 作成ボタンが表示される
    await expect(component.getByRole("button", { name: "作成" })).toBeVisible();
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

    // 更新ボタンが表示される
    await expect(component.getByRole("button", { name: "更新" })).toBeVisible();
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

    await component.getByRole("button", { name: "キャンセル" }).click();
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
    await component.getByRole("button", { name: "作成" }).click();

    // バリデーションエラーが表示されることを確認
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
    await component.getByRole("button", { name: "作成" }).click();

    // バリデーションエラーが表示されることを確認
    await expect(component.getByText(/100.*文字/i)).toBeVisible({
      timeout: 3000,
    });
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
    await component.getByRole("button", { name: "作成" }).click();

    // バリデーションエラーが表示されることを確認
    await expect(component.getByText(/1000.*文字/i)).toBeVisible({
      timeout: 3000,
    });
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
    await component.getByRole("button", { name: "作成" }).click();

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

    await component.getByRole("button", { name: "作成" }).click();

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

    await component.getByRole("button", { name: "作成" }).click();

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

    await component.getByRole("button", { name: "作成" }).click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });
});
