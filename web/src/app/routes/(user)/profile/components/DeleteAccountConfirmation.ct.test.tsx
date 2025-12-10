import { test, expect } from "@playwright/experimental-ct-react";
import { DeleteAccountConfirmation } from "./DeleteAccountConfirmation";
import { mockUser } from "@/mocks/mock-data";

test.describe("DeleteAccountConfirmation", () => {
  test("削除確認UIが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    // 警告メッセージが表示される
    await expect(component.getByText("この操作は取り消せません")).toBeVisible();
    await expect(
      component.getByText(
        "アカウントを削除すると、すべてのデータが完全に失われます。",
      ),
    ).toBeVisible();

    // アカウント情報が表示される
    await expect(component.getByText("削除されるアカウント")).toBeVisible();
    await expect(
      component.getByText(/テストユーザー.*test@example\.com/),
    ).toBeVisible();

    // 削除されるデータリストが表示される
    await expect(component.getByText("削除されるデータ:")).toBeVisible();
    await expect(component.getByText("プロフィール情報")).toBeVisible();
    await expect(component.getByText("作成したTODO")).toBeVisible();
    await expect(component.getByText("参加しているプロジェクト")).toBeVisible();
    await expect(component.getByText("アカウント設定")).toBeVisible();

    // 注意メッセージが表示される
    await expect(
      component.getByText(
        /削除後は自動的にログアウトされ、このアカウントでの再ログインはできなくなります/,
      ),
    ).toBeVisible();
  });

  test("キャンセルボタンが正しく表示され、アクセシビリティ要件を満たす", async ({
    mount,
  }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    const cancelButton = component.getByTestId("cancel-button");
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toHaveRole("button");
    await expect(cancelButton).toHaveAttribute("type", "button");
  });

  test("キャンセルボタンをクリックするとonCancelが呼ばれる", async ({
    mount,
  }) => {
    let cancelCalled = false;
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
        isDeleting={false}
      />,
    );

    const cancelButton = component.getByTestId("cancel-button");
    await cancelButton.click();

    expect(cancelCalled).toBe(true);
  });

  test("削除ボタンが正しく表示され、アクセシビリティ要件を満たす", async ({
    mount,
  }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    const deleteButton = component.getByTestId("delete-button");
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toHaveRole("button");
    await expect(deleteButton).toHaveAttribute("type", "button");
    await expect(deleteButton).toHaveAttribute(
      "aria-label",
      "アカウントを完全に削除する",
    );
  });

  test("削除ボタンをクリックするとonConfirmが呼ばれる", async ({ mount }) => {
    let confirmCalled = false;
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {
          confirmCalled = true;
        }}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    const deleteButton = component.getByTestId("delete-button");
    await deleteButton.click();

    expect(confirmCalled).toBe(true);
  });

  test("isDeleting=trueの時、キャンセルボタンが無効化される", async ({
    mount,
  }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={true}
      />,
    );

    const cancelButton = component.getByTestId("cancel-button");
    await expect(cancelButton).toBeDisabled();
  });

  test("isDeleting=trueの時、削除ボタンがローディング状態になる", async ({
    mount,
  }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={true}
      />,
    );

    // ローディングスピナーが表示される
    await expect(component.getByRole("status")).toBeVisible();
  });

  test("エラーAlertが正しいvariantで表示される", async ({ mount }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    // Alertコンポーネントにはroleがないのでテキストでチェック
    const errorAlert = component.locator(".bg-red-50").first();
    await expect(errorAlert).toBeVisible();
  });

  test("警告アイコンにaria-hidden属性が設定されている", async ({ mount }) => {
    const component = await mount(
      <DeleteAccountConfirmation
        user={mockUser}
        onConfirm={() => {}}
        onCancel={() => {}}
        isDeleting={false}
      />,
    );

    // ExclamationTriangleIconにaria-hidden="true"が設定されている
    const icons = component.locator("svg[aria-hidden='true']");
    await expect(icons.first()).toBeVisible();
  });
});
