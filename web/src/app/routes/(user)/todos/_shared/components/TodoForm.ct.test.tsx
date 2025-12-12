import { test, expect } from "@playwright/experimental-ct-react";
import { TodoForm } from "./TodoForm";
import { mockTodo } from "@/mocks/mock-data";

test.describe("TodoForm", () => {
  test("新規作成モード: 初期値が正しく表示される", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // タイトルが空
    const titleInput = component.getByLabel("タイトル");
    await expect(titleInput).toHaveValue("");

    // 説明が空
    const descriptionTextarea = component.getByLabel("説明");
    await expect(descriptionTextarea).toHaveValue("");

    // デフォルトのステータスがTODO
    const statusSelect = component.getByLabel("ステータス");
    await expect(statusSelect).toHaveValue("TODO");

    // デフォルトの優先度がMEDIUM
    const prioritySelect = component.getByLabel("優先度");
    await expect(prioritySelect).toHaveValue("MEDIUM");

    // 作成ボタンが表示される（getByRole: 暗黙的a11y検証）
    const submitButton = component.getByRole("button", { name: "作成" });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("編集モード: 既存データが初期値として表示される", async ({ mount }) => {
    const component = await mount(
      <TodoForm
        mode="edit"
        todo={mockTodo}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // タイトルの初期値が表示される
    const titleInput = component.getByLabel("タイトル");
    await expect(titleInput).toHaveValue("既存TODO");

    // 説明の初期値が表示される
    const descriptionTextarea = component.getByLabel("説明");
    await expect(descriptionTextarea).toHaveValue("既存TODOの説明");

    // ステータスの初期値が表示される
    const statusSelect = component.getByLabel("ステータス");
    await expect(statusSelect).toHaveValue("IN_PROGRESS");

    // 優先度の初期値が表示される
    const prioritySelect = component.getByLabel("優先度");
    await expect(prioritySelect).toHaveValue("HIGH");

    // 期限日の初期値が表示される
    const dueDateInput = component.getByLabel("期限日");
    await expect(dueDateInput).toHaveValue("2025-12-31");

    // 更新ボタンが表示される（getByRole: 暗黙的a11y検証）
    const submitButton = component.getByRole("button", { name: "更新" });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("タイトルが編集可能", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("新しいTODO");
    await expect(titleInput).toHaveValue("新しいTODO");
  });

  test("説明が編集可能", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const descriptionTextarea = component.getByLabel("説明");
    await descriptionTextarea.fill("TODOの詳細説明");
    await expect(descriptionTextarea).toHaveValue("TODOの詳細説明");
  });

  test("ステータスが選択可能", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const statusSelect = component.getByLabel("ステータス");
    await statusSelect.selectOption("COMPLETED");
    await expect(statusSelect).toHaveValue("COMPLETED");
  });

  test("優先度が選択可能", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const prioritySelect = component.getByLabel("優先度");
    await prioritySelect.selectOption("LOW");
    await expect(prioritySelect).toHaveValue("LOW");
  });

  test("期限日が入力可能", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const dueDateInput = component.getByLabel("期限日");
    await dueDateInput.fill("2025-06-30");
    await expect(dueDateInput).toHaveValue("2025-06-30");
  });

  test("キャンセルボタンをクリックするとonCancelが呼ばれる", async ({
    mount,
  }) => {
    let cancelCalled = false;
    const component = await mount(
      <TodoForm
        mode="create"
        onSubmit={() => {}}
        onCancel={() => {
          cancelCalled = true;
        }}
      />,
    );

    // キャンセルボタンをクリック（getByRole: 暗黙的a11y検証）
    await component.getByRole("button", { name: "キャンセル" }).click();
    expect(cancelCalled).toBe(true);
  });

  test("フォーカスアウト時にバリデーションエラーが表示される（空のタイトル）", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // タイトルを空にする
    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("");
    // フォーカスアウトでバリデーションが発火（mode: "onBlur"）
    await titleInput.blur();

    // バリデーションエラーが表示されることを確認
    await expect(component.getByRole("alert")).toBeVisible({
      timeout: 3000,
    });
  });

  test("フォーカスアウト時にバリデーションエラーが表示される（201文字のタイトル）", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // 201文字のタイトルを入力
    const titleInput = component.getByLabel("タイトル");
    const longTitle = "あ".repeat(201);
    await titleInput.fill(longTitle);
    await titleInput.blur();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/200.*文字/i);
  });

  test("フォーカスアウト時にバリデーションエラーが表示される（5001文字の説明）", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // 有効なタイトルを入力
    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("TODO");

    // 5001文字の説明を入力
    const descriptionTextarea = component.getByLabel("説明");
    const longDescription = "あ".repeat(5001);
    await descriptionTextarea.fill(longDescription);
    await descriptionTextarea.blur();

    // バリデーションエラーが表示されることを確認（getByRole: アクセシビリティ検証）
    const errorAlert = component.getByRole("alert");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/5000.*文字/i);
  });

  test("有効なデータの場合、バリデーションエラーが表示されない", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // 有効なタイトルを入力
    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("新TODO");
    await titleInput.blur();

    // 有効な説明を入力
    const descriptionTextarea = component.getByLabel("説明");
    await descriptionTextarea.fill("詳細説明");
    await descriptionTextarea.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 1文字のタイトルでバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("A");
    await titleInput.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 200文字のタイトルでバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    const validTitle = "あ".repeat(200);
    await titleInput.fill(validTitle);
    await titleInput.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("境界値テスト: 5000文字の説明でバリデーションを通過する", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("TODO");

    const descriptionTextarea = component.getByLabel("説明");
    const validDescription = "あ".repeat(5000);
    await descriptionTextarea.fill(validDescription);
    await descriptionTextarea.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("プロジェクトセレクトが表示される", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // プロジェクトセレクトが表示される
    const projectSelect = component.getByLabel("プロジェクト");
    await expect(projectSelect).toBeVisible();
  });

  test("担当者セレクトが表示される", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // 担当者セレクトが表示される
    const assigneeSelect = component.getByLabel("担当者");
    await expect(assigneeSelect).toBeVisible();
  });

  test("期限日にYYYY-MM-DD形式の日付を入力できる", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("期限付きTODO");

    const dueDateInput = component.getByLabel("期限日");
    await dueDateInput.fill("2025-12-31");
    await dueDateInput.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
    await expect(dueDateInput).toHaveValue("2025-12-31");
  });

  test("期限日は空でも有効", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const titleInput = component.getByLabel("タイトル");
    await titleInput.fill("期限なしTODO");

    const dueDateInput = component.getByLabel("期限日");
    await dueDateInput.fill("");
    await dueDateInput.blur();

    // エラーメッセージが表示されないことを確認
    await expect(component.getByRole("alert")).not.toBeVisible();
  });

  test("新規作成モード: ファイル添付セクションが表示される", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // ファイル添付セクション全体の確認（data-testid）
    const fileSection = component.getByTestId("file-upload-section");
    await expect(fileSection).toBeVisible();

    // ファイル入力の確認とアクセシビリティ検証（data-testid）
    const fileInput = component.getByTestId("file-input");
    await expect(fileInput).toHaveAttribute("type", "file");
    await expect(fileInput).toHaveAttribute("multiple");

    // ファイル選択ラベルの確認（data-testid）
    const fileLabel = component.getByTestId("file-select-label");
    await expect(fileLabel).toBeVisible();
    await expect(fileLabel).toHaveAttribute("for", "file-upload-todo-form");

    // ヘルプテキストが表示される（セクション内で検索）
    await expect(fileSection.getByText(/対応形式/)).toBeVisible();
  });

  test("編集モード: ファイル添付セクションが表示されない", async ({
    mount,
  }) => {
    const component = await mount(
      <TodoForm
        mode="edit"
        todo={mockTodo}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // ファイル添付セクションが表示されない（data-testid）
    await expect(
      component.getByTestId("file-upload-section"),
    ).not.toBeVisible();
  });

  test("ファイル選択後、選択されたファイルが表示される", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // ファイルを選択（data-testid）
    const fileInput = component.getByTestId("file-input");
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test content"),
    });

    // 選択されたファイルが表示される（ファイル名・サイズは動的コンテンツのためgetByTextを使用）
    await expect(component.getByText("test.txt")).toBeVisible();
    await expect(component.getByText(/Bytes • text\/plain/)).toBeVisible();

    // 選択個数が表示される（data-testid）
    await expect(component.getByTestId("file-count")).toHaveText(
      "1個のファイルを選択中",
    );
  });

  test("複数のファイルを選択できる", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    const fileInput = component.getByTestId("file-input");
    await fileInput.setInputFiles([
      {
        name: "file1.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("content 1"),
      },
      {
        name: "file2.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("content 2"),
      },
    ]);

    // 両方のファイルが表示される（ファイル名は動的コンテンツのためgetByTextを使用）
    await expect(component.getByText("file1.txt")).toBeVisible();
    await expect(component.getByText("file2.txt")).toBeVisible();

    // 選択個数が表示される（data-testid）
    await expect(component.getByTestId("file-count")).toHaveText(
      "2個のファイルを選択中",
    );
  });

  test("選択したファイルを削除できる", async ({ mount }) => {
    const component = await mount(
      <TodoForm mode="create" onSubmit={() => {}} onCancel={() => {}} />,
    );

    // ファイルを選択（data-testid）
    const fileInput = component.getByTestId("file-input");
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test content"),
    });

    // ファイルが表示されることを確認（ファイル名は動的コンテンツのためgetByTextを使用）
    await expect(component.getByText("test.txt")).toBeVisible();
    await expect(component.getByTestId("file-count")).toBeVisible();

    // aria-labelで削除ボタンを特定してクリック（getByRole: アクセシビリティ検証）
    await component.getByRole("button", { name: "test.txtを削除" }).click();

    // ファイルが削除されることを確認（ファイル名は動的コンテンツのためgetByTextを使用）
    await expect(component.getByText("test.txt")).not.toBeVisible();
    await expect(component.getByTestId("file-count")).not.toBeVisible();
  });
});
