import { test, expect } from "@playwright/experimental-ct-react";
import { MemberList } from "./MemberList";
import { MembershipDummy1, MembershipDummy2, MembershipDummy3 } from "@/mocks/mock-data";
import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";

type ProjectMembershipResponse = z.infer<typeof schemas.ProjectMembershipResponse>;

const mockMembers: ProjectMembershipResponse[] = [
  MembershipDummy1, // OWNER - user-1
  MembershipDummy2, // MEMBER - user-2
  MembershipDummy3, // MEMBER - user-3
];

const currentUserId = "user-1"; // 田中太郎

test.describe("MemberList", () => {
  test("メンバー一覧が表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    await expect(component.getByText("田中太郎")).toBeVisible();
    await expect(component.getByText("佐藤花子")).toBeVisible();
    await expect(component.getByText("鈴木一郎")).toBeVisible();
  });

  test("現在のユーザーに「あなた」バッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    await expect(component.getByText("あなた")).toBeVisible();
  });

  test("オーナーには「オーナー」バッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    const ownerBadge = component.getByTestId(`role-badge-${MembershipDummy1.userId}`);
    await expect(ownerBadge).toContainText("オーナー");
  });

  test("メンバーには「メンバー」バッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    const memberBadge = component.getByTestId(`role-badge-${MembershipDummy2.userId}`);
    await expect(memberBadge).toContainText("メンバー");
  });

  test("オーナーが他のメンバーの「オーナーに昇格」ボタンをクリックするとonGrantOwnerが呼ばれる", async ({ mount }) => {
    let grantedUserId: string | null = null;

    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={(userId) => {
          grantedUserId = userId;
        }}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    const memberRow = component.getByTestId(`member-${MembershipDummy2.userId}`);
    await memberRow.getByRole("button", { name: "オーナーに昇格" }).click();
    expect(grantedUserId).toBe(MembershipDummy2.userId);
  });

  test("オーナーが他のメンバーの「メンバーを削除」ボタンをクリックするとonRemoveが呼ばれる", async ({ mount }) => {
    let removedUserId: string | null = null;

    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={(userId) => {
          removedUserId = userId;
        }}
        onLeave={() => {}}
      />,
    );

    const memberRow = component.getByTestId(`member-${MembershipDummy2.userId}`);
    await memberRow.getByRole("button", { name: "メンバーを削除" }).click();
    expect(removedUserId).toBe(MembershipDummy2.userId);
  });

  test("最後のオーナーは脱退ボタンが無効化される", async ({ mount }) => {
    const singleOwner: ProjectMembershipResponse[] = [MembershipDummy1];

    const component = await mount(
      <MemberList
        members={singleOwner}
        currentUserId={currentUserId}
        isCurrentUserOwner={true}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    const leaveButton = component.getByRole("button", { name: "プロジェクトから脱退" });
    await expect(leaveButton).toBeDisabled();
  });

  test("メンバー（非オーナー）は他のメンバーの操作ボタンが表示されない", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId="user-2" // 佐藤花子（メンバー）
        isCurrentUserOwner={false}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    // 他のメンバーの操作ボタンは表示されない
    await expect(component.getByRole("button", { name: "オーナーに昇格" })).not.toBeVisible();
    await expect(component.getByRole("button", { name: "メンバーを削除" })).not.toBeVisible();
  });

  test("メンバー（非オーナー）は自分の脱退ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList
        members={mockMembers}
        currentUserId="user-2" // 佐藤花子（メンバー）
        isCurrentUserOwner={false}
        onGrantOwner={() => {}}
        onRevokeOwner={() => {}}
        onRemove={() => {}}
        onLeave={() => {}}
      />,
    );

    await expect(component.getByRole("button", { name: "プロジェクトから脱退" })).toBeVisible();
  });
});
