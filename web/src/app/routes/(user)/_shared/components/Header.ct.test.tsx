import { test, expect } from "@playwright/experimental-ct-react";
import { Header } from "./Header";

test.describe("Header", () => {
  test("ロゴが表示される", async ({ mount }) => {
    const component = await mount(<Header />);

    await expect(component.getByTestId("app-logo")).toHaveText("TODO App");
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

    const logoutButton = component.getByTestId("logout-button");
    await expect(logoutButton).toBeVisible();
  });

  test("ログアウトボタンにaria-labelがある", async ({ mount }) => {
    const component = await mount(<Header />);

    const logoutButton = component.getByTestId("logout-button");
    await expect(logoutButton).toHaveAttribute("aria-label", "ログアウト");
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
