import { test, expect } from "@playwright/experimental-ct-react";
import { UserSearchCombobox } from "./UserSearchCombobox";

test.describe("UserSearchCombobox", () => {
  test("入力欄が表示される", async ({ mount }) => {
    const component = await mount(
      <UserSearchCombobox
        onSelect={() => {}}
        excludeUserIds={[]}
        placeholder="検索..."
      />,
    );

    await expect(component.getByPlaceholder("検索...")).toBeVisible();
  });

  test("プレースホルダーが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <UserSearchCombobox
        onSelect={() => {}}
        excludeUserIds={[]}
        placeholder="名前またはメールアドレスで検索"
      />,
    );

    await expect(
      component.getByPlaceholder("名前またはメールアドレスで検索"),
    ).toBeVisible();
  });

  test("入力欄に文字を入力できる", async ({ mount }) => {
    const component = await mount(
      <UserSearchCombobox
        onSelect={() => {}}
        excludeUserIds={[]}
        placeholder="検索..."
      />,
    );

    const input = component.getByPlaceholder("検索...");
    await input.fill("田中");
    await expect(input).toHaveValue("田中");
  });

  test("入力欄をクリアすると値が空になる", async ({ mount }) => {
    const component = await mount(
      <UserSearchCombobox
        onSelect={() => {}}
        excludeUserIds={[]}
        placeholder="検索..."
      />,
    );

    const input = component.getByPlaceholder("検索...");
    await input.fill("田中");
    await input.clear();
    await expect(input).toHaveValue("");
  });

  test("disabledの場合、入力欄が無効になる", async ({ mount }) => {
    const component = await mount(
      <UserSearchCombobox
        onSelect={() => {}}
        excludeUserIds={[]}
        placeholder="検索..."
        disabled={true}
      />,
    );

    await expect(component.getByPlaceholder("検索...")).toBeDisabled();
  });
});
