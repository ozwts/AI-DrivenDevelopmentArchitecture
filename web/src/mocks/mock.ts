import { http, HttpResponse, delay } from "msw";
import urlJoin from "url-join";
import { z } from "zod";
import { config } from "../config/config";
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
  SearchUserDummy1,
  SearchUserDummy2,
  SearchUserDummy3,
  SearchUserDummy4,
  ProjectMemberDummy1,
  ProjectMemberDummy2,
  ProjectMemberDummy3,
  ProjectMemberDummy4,
  ProjectMemberDummy5,
  ProjectMemberDummy6,
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
type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;
type ProjectMembersResponse = z.infer<typeof schemas.ProjectMembersResponse>;
type SearchUserResponse = z.infer<typeof schemas.SearchUserResponse>;
type SearchUsersResponse = z.infer<typeof schemas.SearchUsersResponse>;

const allProjects = [ProjectDummy1, ProjectDummy2, ProjectDummy3];
let projects = [...allProjects];

const allTodos = [TodoDummy1, TodoDummy2, TodoDummy3, TodoDummy4, TodoDummy5];
let todos = [...allTodos];

const allUsers = [UserDummy1, UserDummy2, UserDummy3];
let users = [...allUsers];

const allAttachments = [AttachmentDummy1, AttachmentDummy2, AttachmentDummy3];
let attachments = [...allAttachments];

const allProjectMembers = [
  ProjectMemberDummy1,
  ProjectMemberDummy2,
  ProjectMemberDummy3,
  ProjectMemberDummy4,
  ProjectMemberDummy5,
  ProjectMemberDummy6,
];
let projectMembers = [...allProjectMembers];

const allSearchUsers = [
  SearchUserDummy1,
  SearchUserDummy2,
  SearchUserDummy3,
  SearchUserDummy4,
];

// 現在のユーザー（モック用）
let currentUser = UserDummy1;

// TODOリストのハンドラー
export const TodosResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/todos"), async ({ request }) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const projectIdParam = url.searchParams.get("projectId");

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

    await delay(100);
    return HttpResponse.json(filteredTodos satisfies TodosResponse);
  }),
];

// TODO詳細のハンドラー
export const TodoResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/todos/:todoId"), async ({ params }) => {
    const { todoId } = params;
    const todo = todos.find((t) => t.id === todoId);

    if (todo) {
      await delay(100);
      return HttpResponse.json(todo satisfies TodoResponse);
    }

    return new HttpResponse(null, { status: 404 });
  }),
];

// TODO作成のハンドラー
export const CreateTodoResponseDummy = [
  http.post(urlJoin(config.apiUrl, "/todos"), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newTodo: TodoResponse = {
      id: String(todos.length + 1),
      title: body.title as string,
      description: body.description as string | undefined,
      status: (body.status as TodoResponse["status"]) || "TODO",
      priority: (body.priority as TodoResponse["priority"]) || "MEDIUM",
      dueDate: body.dueDate as string | undefined,
      projectId: body.projectId as string,
      assigneeUserId: (body.assigneeUserId as string) || currentUser.id, // 省略時は現在のユーザーを担当者にする
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.push(newTodo);

    await delay(100);
    return HttpResponse.json(newTodo satisfies TodoResponse, { status: 201 });
  }),
];

// TODO更新のハンドラー
export const UpdateTodoResponseDummy = [
  http.put(
    urlJoin(config.apiUrl, "/todos/:todoId"),
    async ({ params, request }) => {
      const { todoId } = params;
      const body = (await request.json()) as Record<string, unknown>;
      const todoIndex = todos.findIndex((t) => t.id === todoId);

      if (todoIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const updatedTodo: TodoResponse = {
        ...todos[todoIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      todos[todoIndex] = updatedTodo;

      await delay(100);
      return HttpResponse.json(updatedTodo satisfies TodoResponse);
    },
  ),
];

// TODO削除のハンドラー
export const DeleteTodoResponseDummy = [
  http.delete(urlJoin(config.apiUrl, "/todos/:todoId"), async ({ params }) => {
    const { todoId } = params;
    const todoIndex = todos.findIndex((t) => t.id === todoId);

    if (todoIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    todos = todos.filter((t) => t.id !== todoId);

    await delay(100);
    return new HttpResponse(null, { status: 204 });
  }),
];

// プロジェクトリストのハンドラー
export const ProjectsResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/projects"), async () => {
    await delay(100);
    return HttpResponse.json(projects satisfies ProjectsResponse);
  }),
];

// プロジェクト詳細のハンドラー
export const ProjectResponseDummy = [
  http.get(
    urlJoin(config.apiUrl, "/projects/:projectId"),
    async ({ params }) => {
      const { projectId } = params;
      const project = projects.find((p) => p.id === projectId);

      if (project) {
        await delay(100);
        return HttpResponse.json(project satisfies ProjectResponse);
      }

      return new HttpResponse(null, { status: 404 });
    },
  ),
];

// プロジェクト作成のハンドラー
export const CreateProjectResponseDummy = [
  http.post(urlJoin(config.apiUrl, "/projects"), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const projectId = `project-${projects.length + 1}`;
    const newProject: ProjectResponse = {
      id: projectId,
      name: body.name as string,
      description: body.description as string | undefined,
      color: body.color as string,
      myRole: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);

    // 作成者をオーナーとして登録
    const ownerMember: ProjectMemberResponse = {
      id: `member-${projectMembers.length + 1}`,
      userId: currentUser.id,
      projectId: projectId,
      role: "OWNER",
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projectMembers.push(ownerMember);

    await delay(100);
    return HttpResponse.json(newProject satisfies ProjectResponse, {
      status: 201,
    });
  }),
];

// プロジェクト更新のハンドラー
export const UpdateProjectResponseDummy = [
  http.put(
    urlJoin(config.apiUrl, "/projects/:projectId"),
    async ({ params, request }) => {
      const { projectId } = params;
      const body = (await request.json()) as Record<string, unknown>;
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const updatedProject: ProjectResponse = {
        ...projects[projectIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      projects[projectIndex] = updatedProject;

      await delay(100);
      return HttpResponse.json(updatedProject satisfies ProjectResponse);
    },
  ),
];

// プロジェクト削除のハンドラー
export const DeleteProjectResponseDummy = [
  http.delete(
    urlJoin(config.apiUrl, "/projects/:projectId"),
    async ({ params }) => {
      const { projectId } = params;
      const projectIndex = projects.findIndex((p) => p.id === projectId);

      if (projectIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      // プロジェクトを削除
      projects = projects.filter((p) => p.id !== projectId);

      // プロジェクトに紐づくTODOも全て削除
      todos = todos.filter((t) => t.projectId !== projectId);

      await delay(100);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

// ユーザーリストのハンドラー
export const UsersResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/users"), async () => {
    await delay(100);
    return HttpResponse.json(users satisfies UsersResponse);
  }),
];

// 現在のユーザー取得のハンドラー
export const CurrentUserResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/users/me"), async () => {
    await delay(100);
    return HttpResponse.json(currentUser satisfies UserResponse);
  }),
];

// 現在のユーザー更新のハンドラー
export const UpdateCurrentUserResponseDummy = [
  http.put(urlJoin(config.apiUrl, "/users/me"), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    currentUser = {
      ...currentUser,
      name: (body.name as string) ?? currentUser.name,
      email: (body.email as string) ?? currentUser.email,
      emailVerified:
        (body.emailVerified as boolean) ?? currentUser.emailVerified,
      updatedAt: new Date().toISOString(),
    };

    // usersリスト内も更新
    const userIndex = users.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = currentUser;
    }

    await delay(100);
    return HttpResponse.json(currentUser satisfies UserResponse);
  }),
];

// 現在のユーザー削除のハンドラー
export const DeleteCurrentUserResponseDummy = [
  http.delete(urlJoin(config.apiUrl, "/users/me"), async () => {
    // ユーザーをリストから削除
    users = users.filter((u) => u.id !== currentUser.id);

    // 別のユーザーに切り替え（モック環境用）
    currentUser = users[0] || UserDummy2;

    await delay(100);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ユーザー詳細のハンドラー
export const UserResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/users/:userId"), async ({ params }) => {
    const { userId } = params;
    const user = users.find((u) => u.id === userId);

    if (user) {
      await delay(100);
      return HttpResponse.json(user satisfies UserResponse);
    }

    return new HttpResponse(null, { status: 404 });
  }),
];

// ユーザー登録のハンドラー（Cognito認証後の初回登録）
export const RegisterUserResponseDummy = [
  http.post(urlJoin(config.apiUrl, "/users"), async () => {
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

    await delay(100);
    return HttpResponse.json(newUser satisfies UserResponse, { status: 201 });
  }),
];

// ユーザー検索のハンドラー
export const SearchUsersResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/users/search"), async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";

    // 自分自身を除外し、名前またはメールアドレスで部分一致検索
    const results = allSearchUsers.filter(
      (user) =>
        user.id !== currentUser.id &&
        (user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())),
    );

    await delay(100);
    return HttpResponse.json(results satisfies SearchUsersResponse);
  }),
];

// プロジェクトメンバー一覧のハンドラー
export const ProjectMembersResponseDummy = [
  http.get(
    urlJoin(config.apiUrl, "/projects/:projectId/members"),
    async ({ params }) => {
      const { projectId } = params;
      const members = projectMembers.filter((m) => m.projectId === projectId);

      await delay(100);
      return HttpResponse.json(members satisfies ProjectMembersResponse);
    },
  ),
];

// メンバー招待のハンドラー
export const InviteMemberResponseDummy = [
  http.post(
    urlJoin(config.apiUrl, "/projects/:projectId/members"),
    async ({ params, request }) => {
      const { projectId } = params;
      const body = (await request.json()) as Record<string, unknown>;

      // プロジェクト存在チェック
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        return new HttpResponse(null, { status: 404 });
      }

      // 招待者がオーナーかチェック
      const inviterMember = projectMembers.find(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );
      if (!inviterMember || inviterMember.role !== "OWNER") {
        return new HttpResponse(null, { status: 403 });
      }

      // 既にメンバーかチェック
      const existingMember = projectMembers.find(
        (m) => m.projectId === projectId && m.userId === body.userId,
      );
      if (existingMember) {
        return new HttpResponse(null, { status: 422 });
      }

      // ユーザー情報を取得
      const targetUser = allSearchUsers.find((u) => u.id === body.userId);
      if (!targetUser) {
        return new HttpResponse(null, { status: 404 });
      }

      const newMember: ProjectMemberResponse = {
        id: `member-${projectMembers.length + 1}`,
        userId: body.userId as string,
        projectId: projectId as string,
        role: (body.role as "OWNER" | "MEMBER") || "MEMBER",
        user: targetUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      projectMembers.push(newMember);

      await delay(100);
      return HttpResponse.json(newMember satisfies ProjectMemberResponse, {
        status: 201,
      });
    },
  ),
];

// プロジェクト脱退のハンドラー
export const LeaveProjectResponseDummy = [
  http.delete(
    urlJoin(config.apiUrl, "/projects/:projectId/members/me"),
    async ({ params }) => {
      const { projectId } = params;

      // 自分のメンバーシップを検索
      const memberIndex = projectMembers.findIndex(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );

      if (memberIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const member = projectMembers[memberIndex];

      // 最後のオーナーかチェック
      if (member.role === "OWNER") {
        const ownerCount = projectMembers.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return new HttpResponse(null, { status: 422 });
        }
      }

      projectMembers.splice(memberIndex, 1);

      await delay(100);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

// メンバー削除のハンドラー
export const RemoveMemberResponseDummy = [
  http.delete(
    urlJoin(config.apiUrl, "/projects/:projectId/members/:memberId"),
    async ({ params }) => {
      const { projectId, memberId } = params;

      // 実行者がオーナーかチェック
      const executorMember = projectMembers.find(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );
      if (!executorMember || executorMember.role !== "OWNER") {
        return new HttpResponse(null, { status: 403 });
      }

      // 削除対象のメンバーを検索
      const memberIndex = projectMembers.findIndex(
        (m) => m.projectId === projectId && m.id === memberId,
      );

      if (memberIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const targetMember = projectMembers[memberIndex];

      // 最後のオーナーは削除できない
      if (targetMember.role === "OWNER") {
        const ownerCount = projectMembers.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return new HttpResponse(null, { status: 422 });
        }
      }

      projectMembers.splice(memberIndex, 1);

      await delay(100);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

// メンバー権限変更のハンドラー
export const ChangeMemberRoleResponseDummy = [
  http.patch(
    urlJoin(config.apiUrl, "/projects/:projectId/members/:memberId/role"),
    async ({ params, request }) => {
      const { projectId, memberId } = params;
      const body = (await request.json()) as Record<string, unknown>;

      // 実行者がオーナーかチェック
      const executorMember = projectMembers.find(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );
      if (!executorMember || executorMember.role !== "OWNER") {
        return new HttpResponse(null, { status: 403 });
      }

      // 対象メンバーを検索
      const memberIndex = projectMembers.findIndex(
        (m) => m.projectId === projectId && m.id === memberId,
      );

      if (memberIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const targetMember = projectMembers[memberIndex];

      // 降格の場合、最後のオーナーかチェック
      if (targetMember.role === "OWNER" && body.role === "MEMBER") {
        const ownerCount = projectMembers.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return new HttpResponse(null, { status: 422 });
        }
      }

      // 既に同じ権限の場合
      if (targetMember.role === body.role) {
        return new HttpResponse(null, { status: 422 });
      }

      const updatedMember: ProjectMemberResponse = {
        ...targetMember,
        role: body.role as "OWNER" | "MEMBER",
        updatedAt: new Date().toISOString(),
      };

      projectMembers[memberIndex] = updatedMember;

      await delay(100);
      return HttpResponse.json(updatedMember satisfies ProjectMemberResponse);
    },
  ),
];

// 添付ファイル一覧のハンドラー
export const AttachmentsResponseDummy = [
  http.get(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments"),
    async ({ params }) => {
      const { todoId } = params;
      // uploadedステータスのもののみ返す
      const todoAttachments = attachments.filter(
        (a) => a.todoId === todoId && a.status === "UPLOADED",
      );

      await delay(100);
      return HttpResponse.json(todoAttachments satisfies AttachmentsResponse);
    },
  ),
];

// 添付ファイル準備のハンドラー（署名付きURL取得）
export const PrepareAttachmentResponseDummy = [
  http.post(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments"),
    async ({ params, request }) => {
      const { todoId } = params;
      const body = (await request.json()) as Record<string, unknown>;

      const newAttachment: AttachmentResponse = {
        id: `attachment-${attachments.length + 1}`,
        todoId: todoId as string,
        filename: body.filename as string,
        contentType: body.contentType as string,
        filesize: body.filesize as number,
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

      await delay(100);
      return HttpResponse.json(response satisfies PrepareAttachmentResponse, {
        status: 201,
      });
    },
  ),
];

// 添付ファイル詳細のハンドラー
export const AttachmentResponseDummy = [
  http.get(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    async ({ params }) => {
      const { attachmentId } = params;
      const attachment = attachments.find((a) => a.id === attachmentId);

      if (attachment) {
        await delay(100);
        return HttpResponse.json(attachment satisfies AttachmentResponse);
      }

      return new HttpResponse(null, { status: 404 });
    },
  ),
];

// 添付ファイル更新のハンドラー（ステータスをuploadedに変更）
export const UpdateAttachmentResponseDummy = [
  http.put(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    async ({ params, request }) => {
      const { attachmentId } = params;
      const body = (await request.json()) as Record<string, unknown>;
      const attachmentIndex = attachments.findIndex(
        (a) => a.id === attachmentId,
      );

      if (attachmentIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const updatedAttachment: AttachmentResponse = {
        ...attachments[attachmentIndex],
        status: body.status as AttachmentResponse["status"],
        updatedAt: new Date().toISOString(),
      };

      attachments[attachmentIndex] = updatedAttachment;

      await delay(100);
      return HttpResponse.json(updatedAttachment satisfies AttachmentResponse);
    },
  ),
];

// 添付ファイル削除のハンドラー
export const DeleteAttachmentResponseDummy = [
  http.delete(
    urlJoin(config.apiUrl, "/todos/:todoId/attachments/:attachmentId"),
    async ({ params }) => {
      const { attachmentId } = params;
      const attachmentIndex = attachments.findIndex(
        (a) => a.id === attachmentId,
      );

      if (attachmentIndex === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      attachments = attachments.filter((a) => a.id !== attachmentId);

      await delay(100);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

// 添付ファイルダウンロードURL取得のハンドラー
export const DownloadUrlResponseDummy = [
  http.get(
    urlJoin(
      config.apiUrl,
      "/todos/:todoId/attachments/:attachmentId/download-url",
    ),
    async ({ params }) => {
      const { attachmentId } = params;
      const attachment = attachments.find((a) => a.id === attachmentId);

      if (!attachment) {
        return new HttpResponse(null, { status: 404 });
      }

      // モック署名付きダウンロードURL（実際にはS3からダウンロード可能なURLではない）
      const downloadUrl = `https://mock-s3-bucket.s3.amazonaws.com/attachments/${attachment.todoId}/${attachment.id}/${attachment.filename}?signature=mock-download`;

      await delay(100);
      return HttpResponse.json({ downloadUrl });
    },
  ),
];

// S3へのファイルアップロードをモック（実際のS3ではなくモック）
export const S3UploadResponseDummy = [
  http.put(
    "https://mock-s3-bucket.s3.amazonaws.com/attachments/*",
    async () => {
      // アップロード成功をシミュレート
      await delay(200);
      return new HttpResponse(null, { status: 200 });
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
      projectMembers = [...allProjectMembers];
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
        ...SearchUsersResponseDummy,
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...LeaveProjectResponseDummy,
        ...RemoveMemberResponseDummy,
        ...ChangeMemberRoleResponseDummy,
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
      projectMembers = [];
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
        ...SearchUsersResponseDummy,
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...LeaveProjectResponseDummy,
        ...RemoveMemberResponseDummy,
        ...ChangeMemberRoleResponseDummy,
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
        ...SearchUsersResponseDummy,
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...LeaveProjectResponseDummy,
        ...RemoveMemberResponseDummy,
        ...ChangeMemberRoleResponseDummy,
      ];
  }
};

export const startMockServer = async () => {
  // ブラウザ環境でのみ実行
  if (typeof window === "undefined") {
    return;
  }

  // setupWorkerを動的インポート（SSRビルド時のエラーを回避）
  const { setupWorker } = await import("msw/browser");

  const response = getHandlersByType(config.mockType ?? "HAS_ALL");

  const worker = setupWorker(...response);
  await worker.start();

  // PlaywrightテストからMSWハンドラーを動的に切り替えられるようにする
  window.msw = {
    worker,
    http,
    // ハンドラーを切り替える関数
    setHandlers: (type: string) => {
      const handlers = getHandlersByType(type);
      worker.resetHandlers(...handlers);
    },
  };

  return worker;
};
