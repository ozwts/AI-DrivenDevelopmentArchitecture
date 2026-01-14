import { test, expect } from "@playwright/experimental-ct-react";
import { InviteMemberForm } from "./InviteMemberForm";
import { UserDummy1, UserDummy2, UserDummy3, MembershipDummy1 } from "@/mocks/mock-data";
import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type ProjectMembershipResponse = z.infer<typeof schemas.ProjectMembershipResponse>;

const mockSearchResults: UserResponse[] = [UserDummy1, UserDummy2, UserDummy3];
const mockExistingMembers: ProjectMembershipResponse[] = [MembershipDummy1]; // user-1のみ

test.describe("InviteMemberForm", () => {
  test("検索入力欄が表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={[]}
        existingMembers={[]}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    await expect(component.getByTestId("search-input")).toBeVisible();
    await expect(component.getByPlaceholder("名前またはメールアドレスで検索...")).toBeVisible();
  });

  test("初期状態では「ユーザーを検索して招待できます」が表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={[]}
        existingMembers={[]}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    await expect(component.getByTestId("initial-state")).toBeVisible();
    await expect(component.getByText("ユーザーを検索して招待できます")).toBeVisible();
  });

  test("検索中は「検索中...」が表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={[]}
        existingMembers={[]}
        isSearching={true}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    // 検索クエリを入力して検索中状態を再現
    await component.getByTestId("search-input").fill("test");
    await expect(component.getByText("検索中...")).toBeVisible();
  });

  test("検索入力でonSearchが呼ばれる", async ({ mount }) => {
    let searchedQuery = "";

    const component = await mount(
      <InviteMemberForm
        searchResults={[]}
        existingMembers={[]}
        isSearching={false}
        onSearch={(query) => {
          searchedQuery = query;
        }}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    await component.getByTestId("search-input").fill("佐藤");
    expect(searchedQuery).toBe("佐藤");
  });

  test("招待可能なユーザーが表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={mockSearchResults}
        existingMembers={mockExistingMembers}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    // 検索クエリを入力
    await component.getByTestId("search-input").fill("test");

    // 招待可能セクションが表示される
    await expect(component.getByText("招待可能なユーザー")).toBeVisible();

    // user-2, user-3は招待可能
    await expect(component.getByTestId(`invitable-user-${UserDummy2.id}`)).toBeVisible();
    await expect(component.getByTestId(`invitable-user-${UserDummy3.id}`)).toBeVisible();
  });

  test("既にメンバーのユーザーは「参加済み」と表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={mockSearchResults}
        existingMembers={mockExistingMembers}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    // 検索クエリを入力
    await component.getByTestId("search-input").fill("test");

    // 既にメンバーセクションが表示される
    await expect(component.getByText("既にメンバー")).toBeVisible();

    // user-1は既にメンバー
    await expect(component.getByTestId(`existing-member-${UserDummy1.id}`)).toBeVisible();
    await expect(component.getByText("参加済み")).toBeVisible();
  });

  test("招待ボタンをクリックするとonInviteが呼ばれる", async ({ mount }) => {
    let invitedUserId: string | null = null;

    const component = await mount(
      <InviteMemberForm
        searchResults={mockSearchResults}
        existingMembers={mockExistingMembers}
        isSearching={false}
        onSearch={() => {}}
        onInvite={(userId) => {
          invitedUserId = userId;
        }}
        isInviting={false}
      />,
    );

    // 検索クエリを入力
    await component.getByTestId("search-input").fill("test");

    // 招待ボタンをクリック
    const invitableUser = component.getByTestId(`invitable-user-${UserDummy2.id}`);
    await invitableUser.getByRole("button", { name: `${UserDummy2.name}を招待` }).click();

    expect(invitedUserId).toBe(UserDummy2.id);
  });

  test("招待中はボタンが無効化される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={mockSearchResults}
        existingMembers={mockExistingMembers}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={true}
      />,
    );

    // 検索クエリを入力
    await component.getByTestId("search-input").fill("test");

    // 招待ボタンが無効化されている
    const invitableUser = component.getByTestId(`invitable-user-${UserDummy2.id}`);
    await expect(invitableUser.getByRole("button", { name: `${UserDummy2.name}を招待` })).toBeDisabled();
  });

  test("検索結果がない場合は「該当するユーザーが見つかりません」が表示される", async ({ mount }) => {
    const component = await mount(
      <InviteMemberForm
        searchResults={[]}
        existingMembers={[]}
        isSearching={false}
        onSearch={() => {}}
        onInvite={() => {}}
        isInviting={false}
      />,
    );

    // 検索クエリを入力
    await component.getByTestId("search-input").fill("存在しないユーザー");

    await expect(component.getByTestId("no-results")).toBeVisible();
    await expect(component.getByText("該当するユーザーが見つかりません")).toBeVisible();
  });
});
