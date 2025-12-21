import { test, expect } from "@playwright/experimental-ct-react";
import { SelectField } from "./SelectField";

const options = [
  { value: "option1", label: "オプション1" },
  { value: "option2", label: "オプション2" },
  { value: "option3", label: "オプション3" },
];

test.describe("SelectField Component", () => {
  test("ラベルが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <SelectField label="選択してください" options={options} />,
    );
    await expect(component.getByText("選択してください")).toBeVisible();
  });

  test("ラベルとselectが正しく関連付けられている（アクセシビリティ）", async ({
    mount,
  }) => {
    const component = await mount(
      <SelectField label="カテゴリ" options={options} />,
    );

    const select = component.getByLabel("カテゴリ");
    await expect(select).toBeVisible();
  });

  test("オプションが正しく表示される", async ({ mount }) => {
    const component = await mount(
      <SelectField label="選択" options={options} />,
    );

    const select = component.getByRole("combobox");
    await expect(select).toBeVisible();

    // optionはselectの子要素として存在する（非表示だが存在は確認可能）
    await expect(component.getByRole("option", { name: "オプション1" })).toBeAttached();
    await expect(component.getByRole("option", { name: "オプション2" })).toBeAttached();
    await expect(component.getByRole("option", { name: "オプション3" })).toBeAttached();
  });

  test("エラーメッセージが表示される", async ({ mount }) => {
    const component = await mount(
      <SelectField label="選択" options={options} error="選択してください" />,
    );
    await expect(component.getByRole("alert")).toHaveText("選択してください");
  });

  test("エラー時にaria-invalidがtrueになる", async ({ mount }) => {
    const component = await mount(
      <SelectField label="選択" options={options} error="エラー" />,
    );

    const select = component.getByRole("combobox");
    await expect(select).toHaveAttribute("aria-invalid", "true");
  });

  test("required属性が指定された場合、ラベルにアスタリスクが表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <SelectField label="必須項目" options={options} required />,
    );
    await expect(component.getByText("必須項目")).toBeVisible();
    await expect(component.getByText("*")).toBeVisible();
  });
});
