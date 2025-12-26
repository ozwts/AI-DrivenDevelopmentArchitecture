# TODO管理アプリケーション E2Eテストプラン

## Application Overview

このテストプランは、TODO管理アプリケーションの主要なユーザーフローを検証するためのものです。アプリケーションは、ユーザーがタスクを作成・管理し、プロジェクトで整理できる機能を提供します。

E2Eテストの範囲:
- 認証フロー（Cognitoとの統合）
- クリティカルなユーザーフロー（TODO作成、プロジェクト管理）
- フロントエンド・サーバー境界のデータ受け渡し

テストピラミッドのMECE原則に基づき、ビジネスロジックやUI操作の詳細は他のテスト層（Small、Medium、CT）でカバーされます。

## Test Scenarios

### 1. 認証フロー

**Seed:** `e2e/tests/auth.setup.ts`

#### 1.1. 正常系: 有効な認証情報でログインできる

**File:** `e2e/tests/auth/login-success.spec.ts`

**Steps:**
  1. ログインページ（/auth）に遷移する
  2. メールアドレス入力欄にE2Eユーザーのメールアドレスを入力
  3. パスワード入力欄にE2Eユーザーのパスワードを入力
  4. 「ログイン」ボタンをクリック

**Expected Results:**
  - ホーム画面（/）にリダイレクトされる
  - URL が /auth でないことを確認
  - 認証状態が保存され、ページリロード後も維持される

#### 1.2. 異常系: 不正な認証情報でエラーメッセージが表示される

**File:** `e2e/tests/auth/login-invalid-credentials.spec.ts`

**Steps:**
  1. ログインページ（/auth）に遷移する
  2. メールアドレス入力欄に「invalid@example.com」を入力
  3. パスワード入力欄に「wrongpassword」を入力
  4. 「ログイン」ボタンをクリック

**Expected Results:**
  - エラーメッセージ（role="alert"）が表示される
  - ログインページに留まる（URLが /auth のまま）
  - 入力欄がクリアされない（ユーザーが修正しやすい）

#### 1.3. 異常系: 空のメールアドレスでバリデーションエラーが表示される

**File:** `e2e/tests/auth/login-empty-email.spec.ts`

**Steps:**
  1. ログインページ（/auth）に遷移する
  2. メールアドレス入力欄を空のままにする
  3. パスワード入力欄に「password123」を入力
  4. 「ログイン」ボタンをクリック

**Expected Results:**
  - メールアドレス入力欄のバリデーションエラーが表示される
  - エラーメッセージに「メールアドレスを入力してください」が含まれる
  - サーバーリクエストが送信されない

### 2. TODO管理フロー

**Seed:** `e2e/tests/auth.setup.ts`

#### 2.1. 正常系: 新規TODOを作成できる

**File:** `e2e/tests/todos/create-todo.spec.ts`

**Steps:**
  1. TODO一覧ページ（/todos）に遷移する
  2. 「新規TODO」ボタンをクリック
  3. タイトル入力欄に「E2Eテスト用TODO」を入力
  4. 説明入力欄に「これはE2Eテストで作成されたTODOです」を入力
  5. 「作成」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「TODOを作成しました」が表示される
  - TODO一覧ページ（/todos）にリダイレクトされる
  - 作成したTODOが一覧に表示される
  - TODOのステータスが「未着手」（TODO）である

#### 2.2. 正常系: TODOのステータスを変更できる

**File:** `e2e/tests/todos/update-todo-status.spec.ts`

**Steps:**
  1. TODO一覧ページ（/todos）に遷移する
  2. 既存のTODOカードを探す
  3. ステータスドロップダウンをクリック
  4. 「進行中」（IN_PROGRESS）を選択

**Expected Results:**
  - 成功トーストメッセージ「ステータスを更新しました」が表示される
  - TODOカードのステータスが「進行中」に更新される
  - ページリロード後もステータスが維持される

#### 2.3. 正常系: TODOを削除できる

**File:** `e2e/tests/todos/delete-todo.spec.ts`

**Steps:**
  1. TODO一覧ページ（/todos）に遷移する
  2. 削除対象のTODOカードを探す
  3. 削除ボタンをクリック
  4. 確認ダイアログで「OK」をクリック

**Expected Results:**
  - 成功トーストメッセージ「TODOを削除しました」が表示される
  - 削除したTODOが一覧から消える
  - 他のTODOは影響を受けない

#### 2.4. 正常系: ステータスでTODOをフィルタリングできる

**File:** `e2e/tests/todos/filter-by-status.spec.ts`

**Steps:**
  1. TODO一覧ページ（/todos）に遷移する
  2. ステータスフィルタドロップダウンをクリック
  3. 「完了」（COMPLETED）を選択

**Expected Results:**
  - URLのクエリパラメータに「?status=COMPLETED」が追加される
  - 完了ステータスのTODOのみが表示される
  - 未完了のTODOは表示されない
  - フィルタをクリアすると全てのTODOが表示される

#### 2.5. 正常系: ファイル添付付きTODOを作成できる

**File:** `e2e/tests/todos/create-todo-with-attachment.spec.ts`

**Steps:**
  1. TODO一覧ページ（/todos）に遷移する
  2. 「新規TODO」ボタンをクリック
  3. タイトル入力欄に「ファイル添付テスト」を入力
  4. ファイル選択ボタンをクリックし、テスト用ファイルを選択
  5. 「作成」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「TODOを作成し、1個のファイルをアップロードしました」が表示される
  - TODO詳細ページ（/todos/{todoId}）にリダイレクトされる
  - 添付ファイルセクションにアップロードしたファイルが表示される
  - ファイル名が正しく表示される

#### 2.6. エッジケース: 期限をクリアできる（PATCH 3値セマンティクス）

**File:** `e2e/tests/todos/clear-due-date.spec.ts`

**Steps:**
  1. 期限が設定されたTODOの編集ページ（/todos/{todoId}/edit）に遷移する
  2. 期限入力欄をクリア（空にする）
  3. 「更新」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「TODOを更新しました」が表示される
  - TODO詳細ページで期限が表示されない
  - サーバーに送信されたPATCHリクエストで dueDate: null が含まれる
  - 他のフィールド（タイトル、説明など）は変更されない

### 3. プロジェクト管理フロー

**Seed:** `e2e/tests/auth.setup.ts`

#### 3.1. 正常系: 新規プロジェクトを作成できる

**File:** `e2e/tests/projects/create-project.spec.ts`

**Steps:**
  1. プロジェクト一覧ページ（/projects）に遷移する
  2. 「新規プロジェクト」ボタンをクリック
  3. プロジェクト名入力欄に「E2Eテストプロジェクト」を入力
  4. 説明入力欄に「これはE2Eテストで作成されたプロジェクトです」を入力
  5. 「作成」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「プロジェクトを作成しました」が表示される
  - プロジェクト一覧ページ（/projects）にリダイレクトされる
  - 作成したプロジェクトが一覧に表示される
  - プロジェクトカードにTODO数「0件」が表示される

#### 3.2. 正常系: プロジェクトを削除できる

**File:** `e2e/tests/projects/delete-project.spec.ts`

**Steps:**
  1. プロジェクト一覧ページ（/projects）に遷移する
  2. 削除対象のプロジェクトカードを探す
  3. 削除ボタンをクリック
  4. 削除確認モーダルが表示される
  5. モーダルの「削除」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「プロジェクトを削除しました」が表示される
  - 削除したプロジェクトが一覧から消える
  - モーダルが閉じる
  - そのプロジェクトに紐づくTODOも削除される

#### 3.3. 正常系: プロジェクトでTODOをフィルタリングできる

**File:** `e2e/tests/projects/filter-todos-by-project.spec.ts`

**Steps:**
  1. プロジェクト一覧ページ（/projects）に遷移する
  2. 任意のプロジェクトカードをクリック

**Expected Results:**
  - TODO一覧ページ（/todos）に遷移する
  - URLのクエリパラメータに「?projectId={projectId}」が追加される
  - そのプロジェクトに紐づくTODOのみが表示される
  - プロジェクトフィルタドロップダウンが該当プロジェクトで選択状態になる

#### 3.4. エラーハンドリング: TODOが紐づくプロジェクト削除時に警告が表示される

**File:** `e2e/tests/projects/delete-project-with-todos.spec.ts`

**Steps:**
  1. プロジェクト一覧ページ（/projects）に遷移する
  2. TODOが1件以上紐づくプロジェクトの削除ボタンをクリック

**Expected Results:**
  - 削除確認モーダルが表示される
  - モーダル内に「このプロジェクトに紐づくTODOが X件 削除されます」という警告が表示される
  - 「この操作は取り消せません」というメッセージが表示される

### 4. プロフィール管理フロー

**Seed:** `e2e/tests/auth.setup.ts`

#### 4.1. 正常系: プロフィールを編集できる

**File:** `e2e/tests/profile/update-profile.spec.ts`

**Steps:**
  1. プロフィールページ（/profile）に遷移する
  2. 「編集」ボタンをクリック
  3. 編集モーダルが表示される
  4. 名前入力欄に「更新されたユーザー名」を入力
  5. 「保存」ボタンをクリック

**Expected Results:**
  - 成功トーストメッセージ「プロフィールを更新しました」が表示される
  - モーダルが閉じる
  - プロフィールページに更新された名前が表示される
  - サーバーに送信されたPATCHリクエストで name のみが含まれる（変更したフィールドのみ送信）

#### 4.2. 正常系: アカウント削除の確認フローが動作する

**File:** `e2e/tests/profile/delete-account-confirmation.spec.ts`

**Steps:**
  1. プロフィールページ（/profile）に遷移する
  2. 危険な操作セクションまでスクロール
  3. 「アカウントを削除」ボタンをクリック

**Expected Results:**
  - 削除確認モーダルが表示される
  - モーダルタイトルに「アカウント削除の確認」が表示される
  - 警告メッセージ「すべてのプロフィール情報、TODO、プロジェクトが完全に削除されます」が表示される
  - 「キャンセル」ボタンと削除を実行するボタンが表示される

### 5. ホーム画面フロー

**Seed:** `e2e/tests/auth.setup.ts`

#### 5.1. 正常系: ホーム画面に統計情報が表示される

**File:** `e2e/tests/home/display-stats.spec.ts`

**Steps:**
  1. ホーム画面（/）に遷移する

**Expected Results:**
  - ページタイトル「TODO App」が表示される
  - 統計グリッドが表示される
  - 未着手、進行中、完了の各ステータスのカウントが表示される
  - カウント数が数値で表示される

#### 5.2. 正常系: 期限が近いTODOが表示される

**File:** `e2e/tests/home/display-upcoming-todos.spec.ts`

**Steps:**
  1. ホーム画面（/）に遷移する
  2. 期限が近いTODOセクションまでスクロール

**Expected Results:**
  - 「期限が近いTODO」セクションが表示される
  - 3日以内に期限が来るTODOのみが表示される
  - TODOが期限の昇順でソートされている
  - 完了済みのTODOは表示されない

#### 5.3. 正常系: 最近作成されたTODOが表示される

**File:** `e2e/tests/home/display-recent-todos.spec.ts`

**Steps:**
  1. ホーム画面（/）に遷移する
  2. 最近作成されたTODOセクションまでスクロール

**Expected Results:**
  - 「最近作成されたTODO」セクションが表示される
  - 最大5件のTODOが表示される
  - 作成日時の降順でソートされている
  - 完了済みのTODOは表示されない

#### 5.4. 正常系: ホーム画面からTODO詳細に遷移できる

**File:** `e2e/tests/home/navigate-to-todo-detail.spec.ts`

**Steps:**
  1. ホーム画面（/）に遷移する
  2. 最近作成されたTODOリストから任意のTODOをクリック

**Expected Results:**
  - TODO詳細ページ（/todos/{todoId}）に遷移する
  - クリックしたTODOの詳細情報が表示される
  - URLにTODO IDが含まれる
