import { test, expect } from "@playwright/experimental-ct-react";
import { MemberCard } from "./MemberListSection";
import { mockUser } from "@/mocks/mock-data";

test.describe("MemberCard", () => {
  test("メンバー名が表示される", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    // ユーザー名は動的コンテンツのためgetByTextを使用
    await expect(component.getByText(mockUser.name)).toBeVisible();
  });

  test("メールアドレスが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    // メールアドレスは動的コンテンツのためgetByTextを使用
    await expect(component.getByText(mockUser.email)).toBeVisible();
  });

  test("オーナーの場合、オーナーバッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="owner"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    // Badge UIプリミティブのためgetByTextを使用
    await expect(component.getByText("オーナー")).toBeVisible();
  });

  test("メンバーの場合、オーナーバッジが表示されない", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    // Badge UIプリミティブのためgetByTextを使用
    await expect(component.getByText("オーナー")).not.toBeVisible();
  });

  test("canDelete=trueの場合、削除ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={true}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    // getByRole: 暗黙的a11y検証
    await expect(
      component.getByRole("button", { name: `${mockUser.name}を削除` }),
    ).toBeVisible();
  });

  test("canDelete=falseの場合、削除ボタンが表示されない", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    await expect(
      component.getByRole("button", { name: `${mockUser.name}を削除` }),
    ).not.toBeVisible();
  });

  test("削除ボタンをクリックするとonDeleteが呼ばれる", async ({ mount }) => {
    let deleteCalled = false;
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={true}
        onDelete={() => {
          deleteCalled = true;
        }}
        isDeleting={false}
      />,
    );

    await component
      .getByRole("button", { name: `${mockUser.name}を削除` })
      .click();

    expect(deleteCalled).toBe(true);
  });

  test("isDeleting=trueの場合、削除ボタンが無効化される", async ({ mount }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={true}
        onDelete={() => {}}
        isDeleting={true}
      />,
    );

    await expect(
      component.getByRole("button", { name: `${mockUser.name}を削除` }),
    ).toBeDisabled();
  });

  test("ユーザーアイコンにaria-hidden属性が設定されている", async ({
    mount,
  }) => {
    const component = await mount(
      <MemberCard
        user={mockUser}
        role="member"
        canDelete={false}
        onDelete={() => {}}
        isDeleting={false}
      />,
    );

    const icons = component.locator("svg[aria-hidden='true']");
    await expect(icons.first()).toBeVisible();
  });
});
