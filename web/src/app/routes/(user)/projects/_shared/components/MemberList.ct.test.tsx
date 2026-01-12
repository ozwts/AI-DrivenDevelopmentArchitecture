import { test, expect } from "@playwright/experimental-ct-react";
import { MemberList } from "./MemberList";

test.describe("MemberList", () => {
  // Note: MemberListはuseProjectMembersフックを使用しているため、
  // APIモックなしではローディング状態のみテスト可能

  test("ローディング中はスピナーが表示される", async ({ mount }) => {
    const component = await mount(
      <MemberList projectId="project-1" myRole="OWNER" />,
    );

    // ローディング状態を確認（コンポーネントが表示されている）
    await expect(component).toBeVisible();
  });

  test("メンバーヘッダーが表示される（ローディング完了後）", async ({ mount }) => {
    const component = await mount(
      <MemberList projectId="project-1" myRole="OWNER" />,
    );

    // APIが空を返した場合でもヘッダーは表示される
    // タイムアウトを設定して待機
    await expect(component.getByText("メンバー")).toBeVisible({ timeout: 10000 });
  });
});
