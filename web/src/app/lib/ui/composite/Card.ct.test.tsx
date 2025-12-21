import { test, expect } from "@playwright/experimental-ct-react";
import { Card } from "./Card";

test.describe("Card Component", () => {
  test("Card.Bodyが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <Card>
        <Card.Body>コンテンツ</Card.Body>
      </Card>,
    );
    await expect(component.getByText("コンテンツ")).toBeVisible();
  });

  test("Card.Header, Card.Body, Card.Footerが正しく表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <Card>
        <Card.Header>ヘッダー</Card.Header>
        <Card.Body>ボディ</Card.Body>
        <Card.Footer>フッター</Card.Footer>
      </Card>,
    );
    await expect(component.getByText("ヘッダー")).toBeVisible();
    await expect(component.getByText("ボディ")).toBeVisible();
    await expect(component.getByText("フッター")).toBeVisible();
  });

  test("toneバリアントが適用される", async ({ mount }) => {
    const component = await mount(
      <Card tone="elevated">
        <Card.Body>Elevated Card</Card.Body>
      </Card>,
    );
    await expect(component.getByText("Elevated Card")).toBeVisible();
  });

  test("data-testid属性が渡される", async ({ mount }) => {
    const component = await mount(
      <Card data-testid="test-card">
        <Card.Body>テスト</Card.Body>
      </Card>,
    );
    // component自体にdata-testidが設定される
    await expect(component).toHaveAttribute("data-testid", "test-card");
  });
});
