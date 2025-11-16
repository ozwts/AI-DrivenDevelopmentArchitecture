import { test, expect } from "@playwright/experimental-ct-react";
import { Button } from "./Button";

test("Button renders correctly", async ({ mount }) => {
  const component = await mount(<Button>Click me</Button>);
  await expect(component).toContainText("Click me");
});
