import { test, expect } from "@playwright/experimental-ct-react";
import { UserSelectItem } from "./InviteMemberDialog";
import { mockUser } from "@/mocks/mock-data";

test.describe("UserSelectItem", () => {
  test("ユーザー名が表示される", async ({ mount }) => {
    const component = await mount(
      <UserSelectItem user={mockUser} isSelected={false} onSelect={() => {}} />,
    );

    // ユーザー名は動的コンテンツのためgetByTextを使用
    await expect(component.getByText(mockUser.name)).toBeVisible();
  });

  test("メールアドレスが表示される", async ({ mount }) => {
    const component = await mount(
      <UserSelectItem user={mockUser} isSelected={false} onSelect={() => {}} />,
    );

    // メールアドレスは動的コンテンツのためgetByTextを使用
    await expect(component.getByText(mockUser.email)).toBeVisible();
  });

  test("クリックするとonSelectが呼ばれる", async ({ mount }) => {
    let selectCalled = false;
    const component = await mount(
      <UserSelectItem
        user={mockUser}
        isSelected={false}
        onSelect={() => {
          selectCalled = true;
        }}
      />,
    );

    // ユーザー名は動的コンテンツのためgetByTextを使用
    // ユーザー名をクリックしてonSelectが呼ばれることを確認
    await component.getByText(mockUser.name).click();

    expect(selectCalled).toBe(true);
  });

  test("isSelected=falseの場合、非選択状態で表示される", async ({ mount }) => {
    const component = await mount(
      <UserSelectItem user={mockUser} isSelected={false} onSelect={() => {}} />,
    );

    // ユーザー名・メールアドレスは動的コンテンツのためgetByTextを使用
    // ユーザー情報が表示されることを確認（スタイルはSSテストで検証）
    await expect(component.getByText(mockUser.name)).toBeVisible();
    await expect(component.getByText(mockUser.email)).toBeVisible();
  });

  test("isSelected=trueの場合、選択状態で表示される", async ({ mount }) => {
    const component = await mount(
      <UserSelectItem user={mockUser} isSelected={true} onSelect={() => {}} />,
    );

    // ユーザー名・メールアドレスは動的コンテンツのためgetByTextを使用
    // ユーザー情報が表示されることを確認（スタイルはSSテストで検証）
    await expect(component.getByText(mockUser.name)).toBeVisible();
    await expect(component.getByText(mockUser.email)).toBeVisible();
  });

  test("ユーザーアイコンにaria-hidden属性が設定されている", async ({
    mount,
  }) => {
    const component = await mount(
      <UserSelectItem user={mockUser} isSelected={false} onSelect={() => {}} />,
    );

    const icons = component.locator("svg[aria-hidden='true']");
    await expect(icons.first()).toBeVisible();
  });
});
