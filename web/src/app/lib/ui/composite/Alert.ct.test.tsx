import { test, expect } from "@playwright/experimental-ct-react";
import { Alert } from "./Alert";

test.describe("Alert Component", () => {
  test("role=alertが設定されている", async ({ mount }) => {
    const component = await mount(<Alert>メッセージ</Alert>);
    // component自体がrole="alert"を持つ
    await expect(component).toHaveAttribute("role", "alert");
  });

  test("childrenが正しく表示される", async ({ mount }) => {
    const component = await mount(<Alert>アラートメッセージ</Alert>);
    await expect(component.getByText("アラートメッセージ")).toBeVisible();
  });

  test("titleが表示される", async ({ mount }) => {
    const component = await mount(
      <Alert title="警告">詳細メッセージ</Alert>,
    );
    await expect(component.getByRole("heading", { name: "警告" })).toBeVisible();
    await expect(component.getByText("詳細メッセージ")).toBeVisible();
  });

  test("variant=successで表示される", async ({ mount }) => {
    const component = await mount(<Alert variant="success">成功</Alert>);
    await expect(component).toBeVisible();
    await expect(component.getByText("成功")).toBeVisible();
  });

  test("variant=errorで表示される", async ({ mount }) => {
    const component = await mount(<Alert variant="error">エラー</Alert>);
    await expect(component).toBeVisible();
    await expect(component.getByText("エラー")).toBeVisible();
  });

  test("variant=warningで表示される", async ({ mount }) => {
    const component = await mount(<Alert variant="warning">警告</Alert>);
    await expect(component).toBeVisible();
    await expect(component.getByText("警告")).toBeVisible();
  });

  test("variant=infoで表示される", async ({ mount }) => {
    const component = await mount(<Alert variant="info">情報</Alert>);
    await expect(component).toBeVisible();
    await expect(component.getByText("情報")).toBeVisible();
  });

  test("閉じるボタンが表示される（onClose指定時）", async ({ mount }) => {
    const component = await mount(
      <Alert onClose={() => {}}>閉じられるアラート</Alert>,
    );
    await expect(component.getByRole("button", { name: "閉じる" })).toBeVisible();
  });

  test("閉じるボタンをクリックするとonCloseが呼ばれる", async ({ mount }) => {
    let closed = false;
    const component = await mount(
      <Alert onClose={() => { closed = true; }}>閉じられるアラート</Alert>,
    );

    await component.getByRole("button", { name: "閉じる" }).click();
    expect(closed).toBe(true);
  });

  test("onCloseがない場合は閉じるボタンが表示されない", async ({ mount }) => {
    const component = await mount(<Alert>閉じられないアラート</Alert>);
    await expect(component.getByRole("button", { name: "閉じる" })).not.toBeVisible();
  });
});
