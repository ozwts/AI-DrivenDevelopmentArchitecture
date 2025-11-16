import { z } from "zod";
import { config } from "../config";
import { schemas } from "../generated/zod-schemas";

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

export type GetAccessTokenFn = () => Promise<string | null>;

class ApiClient {
  private getAccessToken?: GetAccessTokenFn;

  /**
   * アクセストークン取得関数を設定
   * AuthInitializerから呼ばれる
   */
  setGetAccessToken(fn: GetAccessTokenFn): void {
    this.getAccessToken = fn;
  }

  private get baseUrl(): string {
    return config.apiUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // アクセストークンを取得してAuthorizationヘッダーに追加
    if (this.getAccessToken !== undefined) {
      const token = await this.getAccessToken();
      if (token !== null) {
        defaultHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      // リクエストの詳細をログ出力（開発環境のみ）
      if (import.meta.env.DEV) {
        console.log("API Request:", {
          url,
          method: options.method || "GET",
          body: options.body,
        });
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `API Error: ${response.status} ${response.statusText} - ${errorText}`;
        console.error("API Request Failed:", {
          url,
          method: options.method || "GET",
          status: response.status,
          statusText: response.statusText,
          errorText,
        });

        // 401 Unauthorized: 認証切れ（リフレッシュトークンも期限切れ）
        if (response.status === 401) {
          console.warn(
            "認証が切れました。ログインページにリダイレクトします。",
          );
          // セッションをクリアしてログインページへリダイレクト
          sessionStorage.clear();
          localStorage.clear();
          window.location.href = "/login";
          throw new Error("認証が必要です。ログインページに移動します。");
        }

        throw new Error(errorMessage);
      }

      // 204 No Content の場合は null を返す
      if (response.status === 204) {
        return null as T;
      }

      return response.json();
    } catch (error) {
      console.error("Fetch Error:", {
        url,
        method: options.method || "GET",
        error,
      });
      throw error;
    }
  }

  // Health Check API
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
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
    return this.request<TodoResponse[]>(
      `/todos${query !== "" ? `?${query}` : ""}`,
    );
  }

  async getTodo(todoId: string): Promise<TodoResponse> {
    return this.request<TodoResponse>(`/todos/${todoId}`);
  }

  async createTodo(data: RegisterTodoParams): Promise<TodoResponse> {
    return this.request<TodoResponse>("/todos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTodo(
    todoId: string,
    data: UpdateTodoParams,
  ): Promise<TodoResponse> {
    return this.request<TodoResponse>(`/todos/${todoId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTodo(todoId: string): Promise<void> {
    return this.request<void>(`/todos/${todoId}`, {
      method: "DELETE",
    });
  }

  // Project API

  async getProjects(): Promise<ProjectResponse[]> {
    return this.request<ProjectResponse[]>("/projects");
  }

  async getProject(projectId: string): Promise<ProjectResponse> {
    return this.request<ProjectResponse>(`/projects/${projectId}`);
  }

  async createProject(data: CreateProjectParams): Promise<ProjectResponse> {
    return this.request<ProjectResponse>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectParams,
  ): Promise<ProjectResponse> {
    return this.request<ProjectResponse>(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.request<void>(`/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  // User API

  async getUsers(): Promise<UserResponse[]> {
    return this.request<UserResponse[]>("/users");
  }

  async getUser(userId: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/users/${userId}`);
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>("/users/me");
  }

  async updateCurrentUser(data: UpdateUserParams): Promise<UserResponse> {
    return this.request<UserResponse>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCurrentUser(): Promise<void> {
    return this.request<void>("/users/me", {
      method: "DELETE",
    });
  }

  async registerUser(): Promise<UserResponse> {
    return this.request<UserResponse>("/users/me", {
      method: "POST",
    });
  }

  // Attachment API

  async getAttachments(todoId: string): Promise<AttachmentResponse[]> {
    return this.request<AttachmentResponse[]>(`/todos/${todoId}/attachments`);
  }

  async getAttachment(
    todoId: string,
    attachmentId: string,
  ): Promise<AttachmentResponse> {
    return this.request<AttachmentResponse>(
      `/todos/${todoId}/attachments/${attachmentId}`,
    );
  }

  async prepareAttachment(
    todoId: string,
    data: PrepareAttachmentParams,
  ): Promise<PrepareAttachmentResponse> {
    return this.request<PrepareAttachmentResponse>(
      `/todos/${todoId}/attachments`,
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
    return this.request<AttachmentResponse>(
      `/todos/${todoId}/attachments/${attachmentId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAttachment(todoId: string, attachmentId: string): Promise<void> {
    return this.request<void>(`/todos/${todoId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  }

  async getDownloadUrl(
    todoId: string,
    attachmentId: string,
  ): Promise<DownloadUrlResponse> {
    return this.request<DownloadUrlResponse>(
      `/todos/${todoId}/attachments/${attachmentId}/download-url`,
    );
  }
}

export const apiClient = new ApiClient();
