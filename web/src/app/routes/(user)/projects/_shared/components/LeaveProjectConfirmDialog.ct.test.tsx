import { test, expect } from "@playwright/experimental-ct-react";
import { LeaveProjectConfirmDialog } from "./LeaveProjectConfirmDialog";

test.describe("LeaveProjectConfirmDialog", () => {
  test("ダイアログが開いている時にプロジェクト名が表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={false}
      />,
    );

    await expect(component.getByRole("dialog")).toBeVisible();
    await expect(component.getByText("テストプロジェクト")).toBeVisible();
  });

  test("ダイアログが閉じている時は表示されない", async ({ mount }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={false}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={false}
      />,
    );

    await expect(component.getByRole("dialog")).not.toBeVisible();
  });

  test("最後のオーナーでない場合、脱退ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={false}
      />,
    );

    await expect(
      component.getByRole("button", { name: "脱退する" }),
    ).toBeVisible();
  });

  test("最後のオーナーの場合、脱退ボタンが表示されない", async ({ mount }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={true}
      />,
    );

    await expect(
      component.getByRole("button", { name: "脱退する" }),
    ).not.toBeVisible();
  });

  test("最後のオーナーの場合、警告メッセージが表示される", async ({ mount }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={true}
      />,
    );

    await expect(
      component.getByText("あなたはこのプロジェクトの最後のオーナーです"),
    ).toBeVisible();
    await expect(
      component.getByText("他のメンバーをオーナーに昇格させてください"),
    ).toBeVisible();
  });

  test("キャンセルボタンをクリックするとonCloseが呼ばれる", async ({ mount }) => {
    let closeCalled = false;

    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {
          closeCalled = true;
        }}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={false}
      />,
    );

    await component.getByRole("button", { name: "キャンセル" }).click();
    expect(closeCalled).toBe(true);
  });

  test("説明文が表示される", async ({ mount }) => {
    const component = await mount(
      <LeaveProjectConfirmDialog
        isOpen={true}
        onClose={() => {}}
        projectId="project-1"
        projectName="テストプロジェクト"
        isLastOwner={false}
      />,
    );

    await expect(
      component.getByText("脱退後、このプロジェクトにアクセスできなくなります"),
    ).toBeVisible();
  });
});
