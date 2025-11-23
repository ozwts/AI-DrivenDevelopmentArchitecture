import { test, expect } from "@playwright/experimental-ct-react";
import { ProfileEditForm } from "./ProfileEditForm";
import { mockUser } from "@/testing-utils/mock-data";

test.describe("ProfileEditForm", () => {
  test("ユーザー情報が初期値として正しく表示される", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
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
        onSuccess={() => {}}
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

    // onCancelが呼ばれたことを確認
    expect(cancelCalled).toBe(true);
  });

  test("更新ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    // 更新ボタンが表示される（data-testid + アクセシビリティ検証）
    const submitButton = component.getByTestId("submit-button");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveRole("button");
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("名前フィールドが編集可能", async ({ mount }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("新しい名前");
    await expect(nameInput).toHaveValue("新しい名前");
  });

  test("フォーム送信時にバリデーションエラーが表示される（空文字列）", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    // 名前を空にする
    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("");

    // フォームを送信
    await component.getByTestId("submit-button").click();

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
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    // 101文字の名前を入力
    const nameInput = component.getByLabel("ユーザー名");
    const longName = "あ".repeat(101);
    await nameInput.fill(longName);

    // フォームを送信
    await component.getByTestId("submit-button").click();

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
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    // 有効な名前を入力
    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("田中太郎");

    // フォームを送信
    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 1文字の名前でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    await nameInput.fill("太");

    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 100文字の名前でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <ProfileEditForm
        user={mockUser}
        onSuccess={() => {}}
        onCancel={() => {}}
      />,
    );

    const nameInput = component.getByLabel("ユーザー名");
    const validName = "あ".repeat(100);
    await nameInput.fill(validName);

    await component.getByTestId("submit-button").click();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });
});
