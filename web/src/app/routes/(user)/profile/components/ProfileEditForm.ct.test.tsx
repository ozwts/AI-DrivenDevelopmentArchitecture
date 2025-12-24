import { test, expect } from "@playwright/experimental-ct-react";
import { ProfileEditForm } from "./ProfileEditForm";
import { mockUser } from "@/mocks/mock-data";

test.describe("ProfileEditForm", () => {
  test("ユーザー情報が初期値として正しく表示される", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // ユーザー名の初期値が表示される
    const nameInput = component.getByLabel("ユーザー名");
    await expect(nameInput).toHaveValue("テストユーザー");

    // メールアドレスが読み取り専用として表示される
    await expect(component.getByText("test@example.com")).toBeVisible();
    await expect(
      component.getByText(
        "メールアドレスはCognito認証で管理されているため、ここでは変更できません。",
      ),
    ).toBeVisible();
  });

  test("キャンセルボタンをクリックするとonCancelが呼ばれる", async ({
    mount,
  }) => {
    let cancelCalled = false;
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
      />,
    );

    // キャンセルボタンをクリック（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "キャンセル" }).click();

    // onCancelが呼ばれたことを確認
    expect(cancelCalled).toBe(true);
  });

  test("更新ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // 更新ボタンが表示される（getByRole: 暗黙的a11y検証）
    const submitButton = component.getByRole("button", { name: "更新" });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("名前フィールドが編集可能", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("新しい名前");
    await expect(nameInput).toHaveValue("新しい名前");
  });

  test("フォーム送信時にonSubmitが呼ばれる（有効なデータ）", async ({
    mount,
  }) => {
    let submittedData = null;
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={(data) => {
          submittedData = data;
        }}
        onCancel={() => {}}
      />,
    );

    // 名前を変更
    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("新しい名前");

    // フォームを送信（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "更新" }).click();

    // onSubmitが正しいデータで呼ばれたことを確認
    expect(submittedData).toEqual({ name: "新しい名前" });
  });

  test("バリデーションエラー時、フォーム送信がブロックされる（空のユーザー名）", async ({
    mount,
  }) => {
    let submitCalled = false;
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {
          submitCalled = true;
        }}
        onCancel={() => {}}
      />,
    );

    // 名前を空にする
    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("");

    // フォームを送信（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "更新" }).click();

    // onSubmitが呼ばれていないことを確認
    expect(submitCalled).toBe(false);

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/1文字以上/);
  });

  test("フォーム送信時にバリデーションエラーが表示される（101文字）", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // 101文字の名前を入力
    const nameInput = component.getByLabel("ユーザー名");
    const longName = "あ".repeat(101);
    await nameInput.fill(longName);

    // フォームを送信（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "更新" }).click();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/100.*文字/i);
  });

  test("有効な名前の場合、バリデーションエラーが表示されない", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // 有効な名前を入力
    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("");
    await nameInput.blur(); // touchedにする
    await nameInput.fill("田中太郎");
    await nameInput.blur(); // バリデーションを実行

    // バリデーションエラーメッセージが表示されないことを確認
    await expect(component.locator('[role="alert"]')).toHaveCount(0);
  });

  test("境界値テスト: 1文字の名前でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("");
    await nameInput.blur(); // touchedにする
    await nameInput.fill("太");
    await nameInput.blur(); // バリデーションを実行

    // バリデーションエラーメッセージが表示されないことを確認
    await expect(component.locator('[role="alert"]')).toHaveCount(0);
  });

  test("境界値テスト: 100文字の名前でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("");
    await nameInput.blur(); // touchedにする
    const validName = "あ".repeat(100);
    await nameInput.fill(validName);
    await nameInput.blur(); // バリデーションを実行

    // バリデーションエラーメッセージが表示されないことを確認
    await expect(component.locator('[role="alert"]')).toHaveCount(0);
  });

  test("isLoading=trueの時、ボタンがローディング状態になる", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSubmit={() => {}}
        onCancel={() => {}}
        isLoading={true}
      />,
    );

    // キャンセルボタンが無効化される（getByRole: 暗黙的a11y検証）
    const cancelButton = component.getByRole("button", { name: "キャンセル" });
    await expect(cancelButton).toBeDisabled();

    // 送信ボタンがローディング状態になる（テキストが「処理中...」に変わる）
    const submitButton = component.getByRole("button", { name: /処理中/ });
    await expect(submitButton).toBeDisabled();

    // ローディングスピナーが表示される
    await expect(component.getByRole("status")).toBeVisible();
  });

});
