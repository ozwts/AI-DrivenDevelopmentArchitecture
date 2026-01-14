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
  MembershipDummy1,
  MembershipDummy2,
  MembershipDummy3,
  MembershipDummy4,
  MembershipDummy5,
  MembershipDummy6,
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
type ProjectMembershipResponse = z.infer<
  typeof schemas.ProjectMembershipResponse
>;
type ProjectMembershipsResponse = z.infer<
  typeof schemas.ProjectMembershipsResponse
>;

const allProjects = [ProjectDummy1, ProjectDummy2, ProjectDummy3];
let projects = [...allProjects];

const allTodos = [TodoDummy1, TodoDummy2, TodoDummy3, TodoDummy4, TodoDummy5];
let todos = [...allTodos];

const allUsers = [UserDummy1, UserDummy2, UserDummy3];
let users = [...allUsers];

const allAttachments = [AttachmentDummy1, AttachmentDummy2, AttachmentDummy3];
let attachments = [...allAttachments];

const allMemberships = [
  MembershipDummy1,
  MembershipDummy2,
  MembershipDummy3,
  MembershipDummy4,
  MembershipDummy5,
  MembershipDummy6,
];
let memberships = [...allMemberships];

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
    const newProject: ProjectResponse = {
      id: `project-${projects.length + 1}`,
      name: body.name as string,
      description: body.description as string | undefined,
      color: body.color as string,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);

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

// ユーザーリストのハンドラー（検索対応）
export const UsersResponseDummy = [
  http.get(urlJoin(config.apiUrl, "/users"), async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    let filteredUsers = users;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredUsers = users.filter(
        (u) =>
          u.name.toLowerCase().includes(lowerQuery) ||
          u.email.toLowerCase().includes(lowerQuery),
      );
    }

    await delay(100);
    return HttpResponse.json(filteredUsers satisfies UsersResponse);
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

// プロジェクトメンバー一覧のハンドラー
export const ProjectMembersResponseDummy = [
  http.get(
    urlJoin(config.apiUrl, "/projects/:projectId/members"),
    async ({ params }) => {
      const { projectId } = params;

      // 現在のユーザーがプロジェクトのメンバーかチェック
      const currentMembership = memberships.find(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );
      if (!currentMembership) {
        return HttpResponse.json(
          { error: "Not a member of this project" },
          { status: 403 },
        );
      }

      const projectMembers = memberships.filter(
        (m) => m.projectId === projectId,
      );

      await delay(100);
      return HttpResponse.json(
        projectMembers satisfies ProjectMembershipsResponse,
      );
    },
  ),
];

// メンバー招待のハンドラー
export const InviteMemberResponseDummy = [
  http.post(
    urlJoin(config.apiUrl, "/projects/:projectId/members"),
    async ({ params, request }) => {
      const { projectId } = params;
      const body = (await request.json()) as { userId: string };

      // 現在のユーザーがオーナーかチェック
      const currentMembership = memberships.find(
        (m) =>
          m.projectId === projectId &&
          m.userId === currentUser.id &&
          m.role === "OWNER",
      );
      if (!currentMembership) {
        return HttpResponse.json(
          { error: "Only project owner can invite members" },
          { status: 403 },
        );
      }

      // 招待するユーザーが存在するかチェック
      const invitedUser = users.find((u) => u.id === body.userId);
      if (!invitedUser) {
        return HttpResponse.json({ error: "User not found" }, { status: 404 });
      }

      // 既にメンバーかチェック
      const existingMembership = memberships.find(
        (m) => m.projectId === projectId && m.userId === body.userId,
      );
      if (existingMembership) {
        return HttpResponse.json(
          { error: "User is already a member" },
          { status: 409 },
        );
      }

      const newMembership: ProjectMembershipResponse = {
        userId: invitedUser.id,
        projectId: projectId as string,
        role: "MEMBER",
        userName: invitedUser.name,
        userEmail: invitedUser.email,
        joinedAt: new Date().toISOString(),
      };

      memberships.push(newMembership);

      await delay(100);
      return HttpResponse.json(
        newMembership satisfies ProjectMembershipResponse,
        { status: 201 },
      );
    },
  ),
];

// メンバーロール変更のハンドラー
export const UpdateMemberRoleResponseDummy = [
  http.patch(
    urlJoin(config.apiUrl, "/projects/:projectId/members/:userId"),
    async ({ params, request }) => {
      const { projectId, userId } = params;
      const body = (await request.json()) as { role?: "OWNER" | "MEMBER" };

      // 現在のユーザーがオーナーかチェック
      const currentMembership = memberships.find(
        (m) =>
          m.projectId === projectId &&
          m.userId === currentUser.id &&
          m.role === "OWNER",
      );
      if (!currentMembership) {
        return HttpResponse.json(
          { error: "Only project owner can change roles" },
          { status: 403 },
        );
      }

      // 対象メンバーを探す
      const memberIndex = memberships.findIndex(
        (m) => m.projectId === projectId && m.userId === userId,
      );
      if (memberIndex === -1) {
        return HttpResponse.json({ error: "Member not found" }, { status: 404 });
      }

      // 最後のオーナーをメンバーに降格する場合はエラー
      if (
        body.role === "MEMBER" &&
        memberships[memberIndex].role === "OWNER"
      ) {
        const ownerCount = memberships.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return HttpResponse.json(
            { error: "Cannot demote the last owner" },
            { status: 422 },
          );
        }
      }

      const updatedMembership: ProjectMembershipResponse = {
        ...memberships[memberIndex],
        role: body.role ?? memberships[memberIndex].role,
      };

      memberships[memberIndex] = updatedMembership;

      await delay(100);
      return HttpResponse.json(
        updatedMembership satisfies ProjectMembershipResponse,
      );
    },
  ),
];

// メンバー削除のハンドラー
export const RemoveMemberResponseDummy = [
  http.delete(
    urlJoin(config.apiUrl, "/projects/:projectId/members/:userId"),
    async ({ params }) => {
      const { projectId, userId } = params;

      // 現在のユーザーがオーナーかチェック
      const currentMembership = memberships.find(
        (m) =>
          m.projectId === projectId &&
          m.userId === currentUser.id &&
          m.role === "OWNER",
      );
      if (!currentMembership) {
        return HttpResponse.json(
          { error: "Only project owner can remove members" },
          { status: 403 },
        );
      }

      // 対象メンバーを探す
      const memberIndex = memberships.findIndex(
        (m) => m.projectId === projectId && m.userId === userId,
      );
      if (memberIndex === -1) {
        // 冪等性のため、存在しない場合も成功として扱う
        return new HttpResponse(null, { status: 204 });
      }

      // 最後のオーナーを削除する場合はエラー
      if (memberships[memberIndex].role === "OWNER") {
        const ownerCount = memberships.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return HttpResponse.json(
            { error: "Cannot remove the last owner" },
            { status: 422 },
          );
        }
      }

      // メンバーを削除
      memberships = memberships.filter(
        (m) => !(m.projectId === projectId && m.userId === userId),
      );

      // 削除されたメンバーが担当しているTODOの担当者をnullに
      todos = todos.map((t) =>
        t.projectId === projectId && t.assigneeUserId === userId
          ? { ...t, assigneeUserId: undefined }
          : t,
      );

      await delay(100);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

// プロジェクト脱退のハンドラー
export const LeaveProjectResponseDummy = [
  http.post(
    urlJoin(config.apiUrl, "/projects/:projectId/leave"),
    async ({ params }) => {
      const { projectId } = params;

      // 現在のユーザーがプロジェクトのメンバーかチェック
      const currentMembership = memberships.find(
        (m) => m.projectId === projectId && m.userId === currentUser.id,
      );
      if (!currentMembership) {
        return HttpResponse.json(
          { error: "Not a member of this project" },
          { status: 404 },
        );
      }

      // 最後のオーナーが脱退する場合はエラー
      if (currentMembership.role === "OWNER") {
        const ownerCount = memberships.filter(
          (m) => m.projectId === projectId && m.role === "OWNER",
        ).length;
        if (ownerCount <= 1) {
          return HttpResponse.json(
            { error: "Last owner cannot leave the project" },
            { status: 422 },
          );
        }
      }

      // メンバーシップを削除
      memberships = memberships.filter(
        (m) => !(m.projectId === projectId && m.userId === currentUser.id),
      );

      // 脱退したユーザーが担当しているTODOの担当者をnullに
      todos = todos.map((t) =>
        t.projectId === projectId && t.assigneeUserId === currentUser.id
          ? { ...t, assigneeUserId: undefined }
          : t,
      );

      await delay(100);
      return new HttpResponse(null, { status: 204 });
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
      memberships = [...allMemberships];
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
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...UpdateMemberRoleResponseDummy,
        ...RemoveMemberResponseDummy,
        ...LeaveProjectResponseDummy,
      ];
    case "EMPTY":
      // 空データのみ（CRUD操作は可能だが、初期状態は空）
      todos = [];
      projects = [];
      attachments = [];
      memberships = [];
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
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...UpdateMemberRoleResponseDummy,
        ...RemoveMemberResponseDummy,
        ...LeaveProjectResponseDummy,
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
        ...ProjectMembersResponseDummy,
        ...InviteMemberResponseDummy,
        ...UpdateMemberRoleResponseDummy,
        ...RemoveMemberResponseDummy,
        ...LeaveProjectResponseDummy,
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
