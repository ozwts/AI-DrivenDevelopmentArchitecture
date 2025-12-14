import { test, expect } from "@playwright/experimental-ct-react";
import { Header } from "./Header";

test.describe("Header", () => {
  test("ロゴが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    // 動的コンテンツのためgetByTextを使用
    await expect(component.getByText("TODO App")).toBeVisible();
  });

  test("ホームリンクが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(component.getByRole("link", { name: "ホーム" })).toBeVisible();
  });

  test("TODOリンクが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(
      component.getByRole("link", { name: "TODO", exact: true }),
    ).toBeVisible();
  });

  test("プロジェクトリンクが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(
      component.getByRole("link", { name: "プロジェクト" }),
    ).toBeVisible();
  });

  test("プロフィールリンクが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(
      component.getByRole("link", { name: "プロフィール" }),
    ).toBeVisible();
  });

  test("ログアウトボタンが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    // getByRole: 暗黙的a11y検証
    const logoutButton = component.getByRole("button", { name: "ログアウト" });
    await expect(logoutButton).toBeVisible();
  });

  test("ナビゲーションリンクが正しいパスを持つ", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(component.getByRole("link", { name: "ホーム" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(
      component.getByRole("link", { name: "TODO", exact: true }),
    ).toHaveAttribute("href", "/todos");
    await expect(
      component.getByRole("link", { name: "プロジェクト" }),
    ).toHaveAttribute("href", "/projects");
    await expect(
      component.getByRole("link", { name: "プロフィール" }),
    ).toHaveAttribute("href", "/profile");
  });
});
