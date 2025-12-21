import { test, expect } from "@playwright/experimental-ct-react";
import { Modal } from "./Modal";

test.describe("Modal Component", () => {
  test("isOpen=trueでモーダルが表示される", async ({ mount }) => {
    const component = await mount(
      <Modal isOpen={true} onClose={() => {}}>
        <Modal.Header>タイトル</Modal.Header>
        <Modal.Body>コンテンツ</Modal.Body>
      </Modal>,
    );

    await expect(component.getByRole("dialog")).toBeVisible();
  });

  test("isOpen=falseでモーダルが表示されない", async ({ mount }) => {
    const component = await mount(
      <Modal isOpen={false} onClose={() => {}}>
        <Modal.Header>タイトル</Modal.Header>
        <Modal.Body>コンテンツ</Modal.Body>
      </Modal>,
    );

    await expect(component.getByRole("dialog")).not.toBeVisible();
  });

  test("Modal.Header, Modal.Body, Modal.Footerが正しく表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <Modal isOpen={true} onClose={() => {}}>
        <Modal.Header>ヘッダー</Modal.Header>
        <Modal.Body>ボディ</Modal.Body>
        <Modal.Footer>フッター</Modal.Footer>
      </Modal>,
    );

    await expect(component.getByRole("heading", { name: "ヘッダー" })).toBeVisible();
    await expect(component.getByText("ボディ")).toBeVisible();
    await expect(component.getByText("フッター")).toBeVisible();
  });

  test("閉じるボタンが表示される", async ({ mount }) => {
    const component = await mount(
      <Modal isOpen={true} onClose={() => {}}>
        <Modal.Header>タイトル</Modal.Header>
        <Modal.Body>コンテンツ</Modal.Body>
      </Modal>,
    );

    await expect(component.getByRole("button", { name: "閉じる" })).toBeVisible();
  });

  test("閉じるボタンをクリックするとonCloseが呼ばれる", async ({ mount }) => {
    let closed = false;
    const component = await mount(
      <Modal isOpen={true} onClose={() => { closed = true; }}>
        <Modal.Header>タイトル</Modal.Header>
        <Modal.Body>コンテンツ</Modal.Body>
      </Modal>,
    );

    await component.getByRole("button", { name: "閉じる" }).click();
    expect(closed).toBe(true);
  });

  test("sizeバリアントが適用される", async ({ mount }) => {
    const component = await mount(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <Modal.Body>Large Modal</Modal.Body>
      </Modal>,
    );

    await expect(component.getByRole("dialog")).toBeVisible();
    await expect(component.getByText("Large Modal")).toBeVisible();
  });

  test("aria-modal属性がtrueである", async ({ mount }) => {
    const component = await mount(
      <Modal isOpen={true} onClose={() => {}}>
        <Modal.Body>コンテンツ</Modal.Body>
      </Modal>,
    );

    await expect(component.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
