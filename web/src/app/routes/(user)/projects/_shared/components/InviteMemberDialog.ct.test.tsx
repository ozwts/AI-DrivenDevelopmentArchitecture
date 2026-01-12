import { test, expect } from "@playwright/experimental-ct-react";
import { InviteMemberDialog } from "./InviteMemberDialog";

test.describe("InviteMemberDialog", () => {
  test("ダイアログが開いている時にヘッダーが表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await expect(component.getByRole("dialog")).toBeVisible();
    await expect(component.getByText("メンバーを招待")).toBeVisible();
  });

  test("ダイアログが閉じている時は表示されない", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={false}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await expect(component.getByRole("dialog")).not.toBeVisible();
  });

  test("検索入力欄が表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await expect(
      component.getByPlaceholder("名前またはメールアドレスで検索"),
    ).toBeVisible();
  });

  test("招待ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await expect(
      component.getByRole("button", { name: "招待する" }),
    ).toBeVisible();
  });

  test("キャンセルボタンをクリックするとonCloseが呼ばれる", async ({ mount }) => {
    let closeCalled = false;

    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {
          closeCalled = true;
        }}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await component.getByRole("button", { name: "キャンセル" }).click();
    expect(closeCalled).toBe(true);
  });

  test("ユーザーが選択されていない場合、招待ボタンが無効", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    await expect(
      component.getByRole("button", { name: "招待する" }),
    ).toBeDisabled();
  });

  test("検索フィールドに入力できる", async ({ mount }) => {
    const component = await mount(
      <InviteMemberDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        existingMemberIds={[]}
      />,
    );

    const searchInput = component.getByPlaceholder(
      "名前またはメールアドレスで検索",
    );
    await searchInput.fill("田中");
    await expect(searchInput).toHaveValue("田中");
  });
});
