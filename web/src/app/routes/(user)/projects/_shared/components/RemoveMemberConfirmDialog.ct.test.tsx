import { test, expect } from "@playwright/experimental-ct-react";
import { RemoveMemberConfirmDialog } from "./RemoveMemberConfirmDialog";
import {
  ProjectMemberDummy1,
  ProjectMemberDummy2,
} from "@/mocks/mock-data";

test.describe("RemoveMemberConfirmDialog", () => {
  test("ダイアログが開いている時にメンバー名が表示される", async ({ mount }) => {
    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        member={ProjectMemberDummy2}
      />,
    );

    await expect(component.getByRole("dialog")).toBeVisible();
    // ProjectMemberDummy2のユーザーは佐藤花子
    await expect(component.getByText("佐藤花子")).toBeVisible();
  });

  test("ダイアログが閉じている時は表示されない", async ({ mount }) => {
    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={false}
        onClose={() => {}}
        projectId="project-1"
        member={ProjectMemberDummy2}
      />,
    );

    await expect(component.getByRole("dialog")).not.toBeVisible();
  });

  test("memberがnullの場合はダイアログが表示されない", async ({ mount }) => {
    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        member={null}
      />,
    );

    await expect(component.getByRole("dialog")).not.toBeVisible();
  });

  test("キャンセルボタンをクリックするとonCloseが呼ばれる", async ({ mount }) => {
    let closeCalled = false;

    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={true}
        onClose={() => {
          closeCalled = true;
        }}
        projectId="project-1"
        member={ProjectMemberDummy2}
      />,
    );

    await component.getByRole("button", { name: "キャンセル" }).click();
    expect(closeCalled).toBe(true);
  });

  test("削除ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        member={ProjectMemberDummy2}
      />,
    );

    await expect(
      component.getByRole("button", { name: "削除する" }),
    ).toBeVisible();
  });

  test("説明文が表示される", async ({ mount }) => {
    const component = await mount(
      <RemoveMemberConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        member={ProjectMemberDummy2}
      />,
    );

    await expect(
      component.getByText("この操作は取り消せません"),
    ).toBeVisible();
  });
});
