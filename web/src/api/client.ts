import { z, type ZodType } from "zod";
import { config } from "../config";
import { schemas } from "../generated/zod-schemas";
import { apiLogger } from "./logger";
import { type GetAccessTokenFn, createAuthHeader } from "./auth-handler";
import { handleHttpError, handleValidationError } from "./error-handler";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoStatus = z.infer<typeof schemas.TodoStatus>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;
type UserResponse = z.infer<typeof schemas.UserResponse>;
type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;
type PrepareAttachmentParams = z.infer<typeof schemas.PrepareAttachmentParams>;
type PrepareAttachmentResponse = z.infer<
  typeof schemas.PrepareAttachmentResponse
>;
type UpdateAttachmentParams = z.infer<typeof schemas.UpdateAttachmentParams>;
type DownloadUrlResponse = z.infer<typeof schemas.DownloadUrlResponse>;

/**
 * APIリクエストオプション（headersの型を制限）
 */
type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * APIクライアントの設定
 */
type ApiClientConfig = {
  getAccessToken: GetAccessTokenFn;
};

class ApiClient {
  private getAccessToken: GetAccessTokenFn | undefined;
  private isInitialized = false;

  /**
   * APIクライアントを初期化
   * アプリケーション起動時に一度だけ呼び出す
   */
  initialize(clientConfig: ApiClientConfig): void {
    if (this.isInitialized) {
      return;
    }
    this.getAccessToken = clientConfig.getAccessToken;
    this.isInitialized = true;
  }

  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "ApiClient が初期化されていません。apiClient.initialize() を先に呼び出してください。",
      );
    }
  }

  private get baseUrl(): string {
    return config.apiUrl;
  }

  /**
   * レスポンスボディがあるリクエスト
   */
  private async request<T>(
    endpoint: string,
    schema: ZodType<T>,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    this.assertInitialized();
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method ?? "GET";

    const authHeader = await createAuthHeader(this.getAccessToken);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    };

    try {
      apiLogger.request({ url, method, body: options.body });

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorText = await response.text();
        return handleHttpError({
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
      }

      const json: unknown = await response.json();
      const result = schema.safeParse(json);
      if (!result.success) {
        return handleValidationError(
          endpoint,
          result.error.errors,
          json,
          result.error.message,
        );
      }
      return result.data;
    } catch (error) {
      apiLogger.fetchError({ url, method, error });
      throw error;
    }
  }

  /**
   * レスポンスボディがないリクエスト（DELETE等）
   */
  private async requestVoid(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<void> {
    this.assertInitialized();
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method ?? "GET";

    const authHeader = await createAuthHeader(this.getAccessToken);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    };

    try {
      apiLogger.request({ url, method, body: options.body });

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorText = await response.text();
        handleHttpError({
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
      }
      // 204 No Content を期待、何も返さない
    } catch (error) {
      apiLogger.fetchError({ url, method, error });
      throw error;
    }
  }

  // Health Check API
  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health", schemas.HealthResponse);
  }

  // Todo API

  async getTodos(filters?: {
    status?: TodoStatus;
    projectId?: string;
  }): Promise<TodoResponse[]> {
    const params = new URLSearchParams();
    if (filters?.status !== undefined) {
      params.append("status", filters.status);
    }
    if (filters?.projectId !== undefined) {
      params.append("projectId", filters.projectId);
    }
    const query = params.toString();
    return this.request(
      `/todos${query !== "" ? `?${query}` : ""}`,
      schemas.TodosResponse,
    );
  }

  async getTodo(todoId: string): Promise<TodoResponse> {
    return this.request(`/todos/${todoId}`, schemas.TodoResponse);
  }

  async createTodo(data: RegisterTodoParams): Promise<TodoResponse> {
    return this.request("/todos", schemas.TodoResponse, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTodo(
    todoId: string,
    data: UpdateTodoParams,
  ): Promise<TodoResponse> {
    return this.request(`/todos/${todoId}`, schemas.TodoResponse, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTodo(todoId: string): Promise<void> {
    return this.requestVoid(`/todos/${todoId}`, {
      method: "DELETE",
    });
  }

  // Project API

  async getProjects(): Promise<ProjectResponse[]> {
    return this.request("/projects", schemas.ProjectsResponse);
  }

  async getProject(projectId: string): Promise<ProjectResponse> {
    return this.request(`/projects/${projectId}`, schemas.ProjectResponse);
  }

  async createProject(data: CreateProjectParams): Promise<ProjectResponse> {
    return this.request("/projects", schemas.ProjectResponse, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectParams,
  ): Promise<ProjectResponse> {
    return this.request(`/projects/${projectId}`, schemas.ProjectResponse, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.requestVoid(`/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  // User API

  async getUsers(): Promise<UserResponse[]> {
    return this.request("/users", schemas.UsersResponse);
  }

  async getUser(userId: string): Promise<UserResponse> {
    return this.request(`/users/${userId}`, schemas.UserResponse);
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request("/users/me", schemas.UserResponse);
  }

  async updateCurrentUser(data: UpdateUserParams): Promise<UserResponse> {
    return this.request("/users/me", schemas.UserResponse, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCurrentUser(): Promise<void> {
    return this.requestVoid("/users/me", {
      method: "DELETE",
    });
  }

  async registerUser(): Promise<UserResponse> {
    return this.request("/users/me", schemas.UserResponse, {
      method: "POST",
    });
  }

  // Attachment API

  async getAttachments(todoId: string): Promise<AttachmentResponse[]> {
    return this.request(
      `/todos/${todoId}/attachments`,
      schemas.AttachmentsResponse,
    );
  }

  async getAttachment(
    todoId: string,
    attachmentId: string,
  ): Promise<AttachmentResponse> {
    return this.request(
      `/todos/${todoId}/attachments/${attachmentId}`,
      schemas.AttachmentResponse,
    );
  }

  async prepareAttachment(
    todoId: string,
    data: PrepareAttachmentParams,
  ): Promise<PrepareAttachmentResponse> {
    return this.request(
      `/todos/${todoId}/attachments`,
      schemas.PrepareAttachmentResponse,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`S3 Upload Failed: ${response.statusText}`);
    }
  }

  async updateAttachment(
    todoId: string,
    attachmentId: string,
    data: UpdateAttachmentParams,
  ): Promise<AttachmentResponse> {
    return this.request(
      `/todos/${todoId}/attachments/${attachmentId}`,
      schemas.AttachmentResponse,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAttachment(todoId: string, attachmentId: string): Promise<void> {
    return this.requestVoid(`/todos/${todoId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  }

  async getDownloadUrl(
    todoId: string,
    attachmentId: string,
  ): Promise<DownloadUrlResponse> {
    return this.request(
      `/todos/${todoId}/attachments/${attachmentId}/download-url`,
      schemas.DownloadUrlResponse,
    );
  }
}

export const apiClient = new ApiClient();
