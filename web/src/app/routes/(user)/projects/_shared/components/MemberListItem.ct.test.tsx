import { test, expect } from "@playwright/experimental-ct-react";
import { MemberListItem } from "./MemberListItem";
import {
  ProjectMemberDummy1,
  ProjectMemberDummy2,
} from "@/mocks/mock-data";

test.describe("MemberListItem", () => {
  test("メンバー名が表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={2}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(component.getByText("田中太郎")).toBeVisible();
  });

  test("メールアドレスが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={2}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(component.getByText("tanaka@example.com")).toBeVisible();
  });

  test("オーナーメンバーの場合、オーナーバッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={2}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(component.getByText("オーナー")).toBeVisible();
  });

  test("通常メンバーの場合、メンバーバッジが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy2}
        projectId="project-1"
        isOwner={true}
        ownerCount={1}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(component.getByText("メンバー")).toBeVisible();
  });

  test("オーナーが他メンバーを見る場合、削除ボタンが表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy2}
        projectId="project-1"
        isOwner={true}
        ownerCount={1}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(
      component.getByRole("button", { name: /削除/ }),
    ).toBeVisible();
  });

  test("オーナーでない場合、削除ボタンが表示されない", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy2}
        projectId="project-1"
        isOwner={false}
        ownerCount={1}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(
      component.getByRole("button", { name: /削除/ }),
    ).not.toBeVisible();
  });

  test("通常メンバーの場合、昇格ボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy2}
        projectId="project-1"
        isOwner={true}
        ownerCount={1}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(
      component.getByRole("button", { name: /昇格/ }),
    ).toBeVisible();
  });

  test("オーナーメンバー（最後のオーナーでない）の場合、降格ボタンが表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={2}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(
      component.getByRole("button", { name: /降格/ }),
    ).toBeVisible();
  });

  test("最後のオーナーの場合、最後のオーナーテキストが表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={1}
        onRemoveRequest={() => {}}
      />,
    );

    await expect(component.getByText("最後のオーナー")).toBeVisible();
  });

  test("削除ボタンをクリックするとonRemoveRequestが呼ばれる", async ({
    mount,
  }) => {
    let removedMember = null;

    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy2}
        projectId="project-1"
        isOwner={true}
        ownerCount={1}
        onRemoveRequest={(member) => {
          removedMember = member;
        }}
      />,
    );

    await component.getByRole("button", { name: /削除/ }).click();
    expect(removedMember).toEqual(ProjectMemberDummy2);
  });

  test("アバターにユーザー名の頭文字が表示される", async ({ mount }) => {
    const component = await mount(
      <MemberListItem
        member={ProjectMemberDummy1}
        projectId="project-1"
        isOwner={true}
        ownerCount={2}
        onRemoveRequest={() => {}}
      />,
    );

    // 「田中太郎」の頭文字「田」がアバター内に表示される
    // アバターのspan要素内のテキストを検索
    await expect(component.locator(".rounded-full span")).toContainText("田");
  });
});
