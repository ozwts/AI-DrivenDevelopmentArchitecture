import { rest } from "msw";
import urlJoin from "url-join";
import { z } from "zod";
import { config } from "../config";
import { schemas } from "../generated/zod-schemas";
import {
  UserDummy1,
  UserDummy2,
  UserDummy3,
  TodoDummy1,
  TodoDummy2,
  TodoDummy3,
  TodoDummy4,
  TodoDummy5,
  ProjectDummy1,
  ProjectDummy2,
  ProjectDummy3,
  AttachmentDummy1,
  AttachmentDummy2,
  AttachmentDummy3,
} from "./mock-data";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type TodosResponse = z.infer<typeof schemas.TodosResponse>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type ProjectsResponse = z.infer<typeof schemas.ProjectsResponse>;
type UserResponse = z.infer<typeof schemas.UserResponse>;
type UsersResponse = z.infer<typeof schemas.UsersResponse>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;
type AttachmentsResponse = z.infer<typeof schemas.AttachmentsResponse>;
type PrepareAttachmentResponse = z.infer<
  typeof schemas.PrepareAttachmentResponse
>;

const allProjects = [ProjectDummy1, ProjectDummy2, ProjectDummy3];
let projects = [...allProjects];

const allTodos = [TodoDummy1, TodoDummy2, TodoDummy3, TodoDummy4, TodoDummy5];
let todos = [...allTodos];

const allUsers = [UserDummy1, UserDummy2, UserDummy3];
let users = [...allUsers];

const allAttachments = [AttachmentDummy1, AttachmentDummy2, AttachmentDummy3];
let attachments = [...allAttachments];

// 現在のユーザー（モック用）
let currentUser = UserDummy1;

// TODOリストのハンドラー
export const TodosResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/todos"), (req, res, ctx) => {
    const statusParam = req.url.searchParams.get("status");
    const projectIdParam = req.url.searchParams.get("projectId");

    let filteredTodos = todos;
    if (statusParam) {
      filteredTodos = filteredTodos.filter(
        (todo) => todo.status === statusParam,
      );
    }
    if (projectIdParam) {
      filteredTodos = filteredTodos.filter(
        (todo) => todo.projectId === projectIdParam,
      );
    }

    return res(
      ctx.json(filteredTodos satisfies TodosResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// TODO詳細のハンドラー
export const TodoResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/todos/:todoId"), (req, res, ctx) => {
    const { todoId } = req.params;
    const todo = todos.find((t) => t.id === todoId);

    if (todo) {
      return res(
        ctx.json(todo satisfies TodoResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    }

    return res(ctx.status(404));
  }),
];

// TODO作成のハンドラー
export const CreateTodoResponseDummy = [
  rest.post(urlJoin(config.apiUrl, "/todos"), async (req, res, ctx) => {
    const body = await req.clone().json();
    const newTodo: TodoResponse = {
      id: String(todos.length + 1),
      title: body.title,
      description: body.description,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      dueDate: body.dueDate,
      projectId: body.projectId,
      assigneeUserId: body.assigneeUserId || currentUser.id, // 省略時は現在のユーザーを担当者にする
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.push(newTodo);

    return res(
      ctx.json(newTodo satisfies TodoResponse),
      ctx.delay(100),
      ctx.status(201),
    );
  }),
];

// TODO更新のハンドラー
export const UpdateTodoResponseDummy = [
  rest.put(urlJoin(config.apiUrl, "/todos/:todoId"), async (req, res, ctx) => {
    const { todoId } = req.params;
    const body = await req.clone().json();
    const todoIndex = todos.findIndex((t) => t.id === todoId);

    if (todoIndex === -1) {
      return res(ctx.status(404));
    }

    const updatedTodo: TodoResponse = {
      ...todos[todoIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    todos[todoIndex] = updatedTodo;

    return res(
      ctx.json(updatedTodo satisfies TodoResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// TODO削除のハンドラー
export const DeleteTodoResponseDummy = [
  rest.delete(urlJoin(config.apiUrl, "/todos/:todoId"), (req, res, ctx) => {
    const { todoId } = req.params;
    const todoIndex = todos.findIndex((t) => t.id === todoId);

    if (todoIndex === -1) {
      return res(ctx.status(404));
    }

    todos = todos.filter((t) => t.id !== todoId);

    return res(ctx.delay(100), ctx.status(204));
  }),
];

// プロジェクトリストのハンドラー
export const ProjectsResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/projects"), (_req, res, ctx) => {
    return res(
      ctx.json(projects satisfies ProjectsResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// プロジェクト詳細のハンドラー
export const ProjectResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/projects/:projectId"), (req, res, ctx) => {
    const { projectId } = req.params;
    const project = projects.find((p) => p.id === projectId);

    if (project) {
      return res(
        ctx.json(project satisfies ProjectResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    }

    return res(ctx.status(404));
  }),
];

// プロジェクト作成のハンドラー
export const CreateProjectResponseDummy = [
  rest.post(urlJoin(config.apiUrl, "/projects"), async (req, res, ctx) => {
    const body = await req.clone().json();
    const newProject: ProjectResponse = {
      id: `project-${projects.length + 1}`,
      name: body.name,
      description: body.description,
      color: body.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);

    return res(
      ctx.json(newProject satisfies ProjectResponse),
      ctx.delay(100),
      ctx.status(201),
    );
  }),
];

// プロジェクト更新のハンドラー
export const UpdateProjectResponseDummy = [
  rest.put(
    urlJoin(config.apiUrl, "/projects/:projectId"),
    async (req, res, ctx) => {
      const { projectId } = req.params;
      const body = await req.clone().json();
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex === -1) {
        return res(ctx.status(404));
      }

      const updatedProject: ProjectResponse = {
        ...projects[projectIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      projects[projectIndex] = updatedProject;

      return res(
        ctx.json(updatedProject satisfies ProjectResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    },
  ),
];

// プロジェクト削除のハンドラー
export const DeleteProjectResponseDummy = [
  rest.delete(
    urlJoin(config.apiUrl, "/projects/:projectId"),
    (req, res, ctx) => {
      const { projectId } = req.params;
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex === -1) {
        return res(ctx.status(404));
      }

      // プロジェクトを削除
      projects = projects.filter((p) => p.id !== projectId);

      // プロジェクトに紐づくTODOも全て削除
      todos = todos.filter((t) => t.projectId !== projectId);

      return res(ctx.delay(100), ctx.status(204));
    },
  ),
];

// ユーザーリストのハンドラー
export const UsersResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/users"), (_req, res, ctx) => {
    return res(
      ctx.json(users satisfies UsersResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// 現在のユーザー取得のハンドラー
export const CurrentUserResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/users/me"), (_req, res, ctx) => {
    return res(
      ctx.json(currentUser satisfies UserResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// 現在のユーザー更新のハンドラー
export const UpdateCurrentUserResponseDummy = [
  rest.put(urlJoin(config.apiUrl, "/users/me"), async (req, res, ctx) => {
    const body = await req.clone().json();
    currentUser = {
      ...currentUser,
      name: body.name ?? currentUser.name,
      email: body.email ?? currentUser.email,
      emailVerified: body.emailVerified ?? currentUser.emailVerified,
      updatedAt: new Date().toISOString(),
    };

    // usersリスト内も更新
    const userIndex = users.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = currentUser;
    }

    return res(
      ctx.json(currentUser satisfies UserResponse),
      ctx.delay(100),
      ctx.status(200),
    );
  }),
];

// 現在のユーザー削除のハンドラー
export const DeleteCurrentUserResponseDummy = [
  rest.delete(urlJoin(config.apiUrl, "/users/me"), (_req, res, ctx) => {
    // ユーザーをリストから削除
    users = users.filter((u) => u.id !== currentUser.id);

    // 別のユーザーに切り替え（モック環境用）
    currentUser = users[0] || UserDummy2;

    return res(ctx.delay(100), ctx.status(204));
  }),
];

// ユーザー詳細のハンドラー
export const UserResponseDummy = [
  rest.get(urlJoin(config.apiUrl, "/users/:userId"), (req, res, ctx) => {
    const { userId } = req.params;
    const user = users.find((u) => u.id === userId);

    if (user) {
      return res(
        ctx.json(user satisfies UserResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    }

    return res(ctx.status(404));
  }),
];

// ユーザー登録のハンドラー（Cognito認証後の初回登録）
export const RegisterUserResponseDummy = [
  rest.post(urlJoin(config.apiUrl, "/users"), async (_req, res, ctx) => {
    // 実際にはCognitoトークンから情報を取得するが、モックでは新規ユーザーを作成
    const newUser: UserResponse = {
      id: `user-${users.length + 1}`,
      sub: `cognito-sub-${users.length + 1}`,
      name: `新規ユーザー${users.length + 1}`,
      email: `newuser${users.length + 1}@example.com`,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    currentUser = newUser;

    return res(
      ctx.json(newUser satisfies UserResponse),
      ctx.delay(100),
      ctx.status(201),
    );
  }),
];

// 添付ファイル一覧のハンドラー
export const AttachmentsResponseDummy = [
  rest.get(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments"),
    (req, res, ctx) => {
      const { todoId } = req.params;
      // uploadedステータスのもののみ返す
      const todoAttachments = attachments.filter(
        (a) => a.todoId === todoId && a.status === "UPLOADED",
      );

      return res(
        ctx.json(todoAttachments satisfies AttachmentsResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    },
  ),
];

// 添付ファイル準備のハンドラー（署名付きURL取得）
export const PrepareAttachmentResponseDummy = [
  rest.post(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments"),
    async (req, res, ctx) => {
      const { todoId } = req.params;
      const body = await req.clone().json();

      const newAttachment: AttachmentResponse = {
        id: `attachment-${attachments.length + 1}`,
        todoId: todoId as string,
        filename: body.filename,
        contentType: body.contentType,
        filesize: body.filesize,
        status: "PREPARED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      attachments.push(newAttachment);

      // モック署名付きURL（実際にはS3へアップロード可能なURLではない）
      const uploadUrl = `https://mock-s3-bucket.s3.amazonaws.com/attachments/${todoId}/attachment-${attachments.length}/${body.filename}?signature=mock`;

      const response: PrepareAttachmentResponse = {
        attachment: newAttachment,
        uploadUrl,
      };

      return res(
        ctx.json(response satisfies PrepareAttachmentResponse),
        ctx.delay(100),
        ctx.status(201),
      );
    },
  ),
];

// 添付ファイル詳細のハンドラー
export const AttachmentResponseDummy = [
  rest.get(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    (req, res, ctx) => {
      const { attachmentId } = req.params;
      const attachment = attachments.find((a) => a.id === attachmentId);

      if (attachment) {
        return res(
          ctx.json(attachment satisfies AttachmentResponse),
          ctx.delay(100),
          ctx.status(200),
        );
      }

      return res(ctx.status(404));
    },
  ),
];

// 添付ファイル更新のハンドラー（ステータスをuploadedに変更）
export const UpdateAttachmentResponseDummy = [
  rest.put(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    async (req, res, ctx) => {
      const { attachmentId } = req.params;
      const body = await req.clone().json();
      const attachmentIndex = attachments.findIndex(
        (a) => a.id === attachmentId,
      );

      if (attachmentIndex === -1) {
        return res(ctx.status(404));
      }

      const updatedAttachment: AttachmentResponse = {
        ...attachments[attachmentIndex],
        status: body.status,
        updatedAt: new Date().toISOString(),
      };

      attachments[attachmentIndex] = updatedAttachment;

      return res(
        ctx.json(updatedAttachment satisfies AttachmentResponse),
        ctx.delay(100),
        ctx.status(200),
      );
    },
  ),
];

// 添付ファイル削除のハンドラー
export const DeleteAttachmentResponseDummy = [
  rest.delete(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    (req, res, ctx) => {
      const { attachmentId } = req.params;
      const attachmentIndex = attachments.findIndex(
        (a) => a.id === attachmentId,
      );

      if (attachmentIndex === -1) {
        return res(ctx.status(404));
      }

      attachments = attachments.filter((a) => a.id !== attachmentId);

      return res(ctx.delay(100), ctx.status(204));
    },
  ),
];

// 添付ファイルダウンロードURL取得のハンドラー
export const DownloadUrlResponseDummy = [
  rest.get(
    urlJoin(
      config.apiUrl,
      "/todos/:todoId/attachments/:attachmentId/download-url",
    ),
    (req, res, ctx) => {
      const { attachmentId } = req.params;
      const attachment = attachments.find((a) => a.id === attachmentId);

      if (!attachment) {
        return res(ctx.status(404));
      }

      // モック署名付きダウンロードURL（実際にはS3からダウンロード可能なURLではない）
      const downloadUrl = `https://mock-s3-bucket.s3.amazonaws.com/attachments/${attachment.todoId}/${attachment.id}/${attachment.filename}?signature=mock-download`;

      return res(ctx.json({ downloadUrl }), ctx.delay(100), ctx.status(200));
    },
  ),
];

// S3へのファイルアップロードをモック（実際のS3ではなくモック）
export const S3UploadResponseDummy = [
  rest.put(
    "https://mock-s3-bucket.s3.amazonaws.com/attachments/*",
    (_req, res, ctx) => {
      // アップロード成功をシミュレート
      return res(ctx.delay(200), ctx.status(200));
    },
  ),
];

// ハンドラーセットの定義
const getHandlersByType = (type: string) => {
  switch (type) {
    case "HAS_ALL":
      // データをリセット
      todos = [...allTodos];
      projects = [...allProjects];
      attachments = [...allAttachments];
      return [
        ...TodosResponseDummy,
        ...TodoResponseDummy,
        ...CreateTodoResponseDummy,
        ...UpdateTodoResponseDummy,
        ...DeleteTodoResponseDummy,
        ...ProjectsResponseDummy,
        ...ProjectResponseDummy,
        ...CreateProjectResponseDummy,
        ...UpdateProjectResponseDummy,
        ...DeleteProjectResponseDummy,
        ...UsersResponseDummy,
        ...CurrentUserResponseDummy,
        ...UpdateCurrentUserResponseDummy,
        ...DeleteCurrentUserResponseDummy,
        ...UserResponseDummy,
        ...RegisterUserResponseDummy,
        ...AttachmentsResponseDummy,
        ...PrepareAttachmentResponseDummy,
        ...AttachmentResponseDummy,
        ...UpdateAttachmentResponseDummy,
        ...DeleteAttachmentResponseDummy,
        ...DownloadUrlResponseDummy,
        ...S3UploadResponseDummy,
      ];
    case "EMPTY":
      // 空データのみ（CRUD操作は可能だが、初期状態は空）
      todos = [];
      projects = [];
      attachments = [];
      return [
        ...TodosResponseDummy,
        ...TodoResponseDummy,
        ...CreateTodoResponseDummy,
        ...UpdateTodoResponseDummy,
        ...DeleteTodoResponseDummy,
        ...ProjectsResponseDummy,
        ...ProjectResponseDummy,
        ...CreateProjectResponseDummy,
        ...UpdateProjectResponseDummy,
        ...DeleteProjectResponseDummy,
        ...UsersResponseDummy,
        ...CurrentUserResponseDummy,
        ...UpdateCurrentUserResponseDummy,
        ...DeleteCurrentUserResponseDummy,
        ...UserResponseDummy,
        ...RegisterUserResponseDummy,
      ];
    default:
      return [
        ...TodosResponseDummy,
        ...TodoResponseDummy,
        ...CreateTodoResponseDummy,
        ...UpdateTodoResponseDummy,
        ...DeleteTodoResponseDummy,
        ...ProjectsResponseDummy,
        ...ProjectResponseDummy,
        ...CreateProjectResponseDummy,
        ...UpdateProjectResponseDummy,
        ...DeleteProjectResponseDummy,
        ...UsersResponseDummy,
        ...CurrentUserResponseDummy,
        ...UpdateCurrentUserResponseDummy,
        ...DeleteCurrentUserResponseDummy,
        ...UserResponseDummy,
        ...RegisterUserResponseDummy,
      ];
  }
};

export const startMockServer = async () => {
  // ブラウザ環境でのみ実行
  if (typeof window === "undefined") {
    return;
  }

  // setupWorkerを動的インポート（SSRビルド時のエラーを回避）
  const { setupWorker } = await import("msw");

  const response = getHandlersByType(config.mockType ?? "HAS_ALL");

  const worker = setupWorker(...response);
  await worker.start();

  // PlaywrightテストからMSWハンドラーを動的に切り替えられるようにする
  window.msw = {
    worker,
    rest,
    // ハンドラーを切り替える関数
    setHandlers: (type: string) => {
      const handlers = getHandlersByType(type);
      worker.resetHandlers(...handlers);
    },
  };

  return worker;
};
