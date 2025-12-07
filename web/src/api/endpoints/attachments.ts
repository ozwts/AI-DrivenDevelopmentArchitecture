/**
 * Attachment API エンドポイント
 */
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";
import { type RequestFn, type RequestVoidFn } from "../api-client";

type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;
type PrepareAttachmentParams = z.infer<typeof schemas.PrepareAttachmentParams>;
type PrepareAttachmentResponse = z.infer<
  typeof schemas.PrepareAttachmentResponse
>;
type UpdateAttachmentParams = z.infer<typeof schemas.UpdateAttachmentParams>;
type DownloadUrlResponse = z.infer<typeof schemas.DownloadUrlResponse>;

export const createAttachmentEndpoints = (
  request: RequestFn,
  requestVoid: RequestVoidFn,
) => ({
  getAttachments: async (todoId: string): Promise<AttachmentResponse[]> => {
    return request(`/todos/${todoId}/attachments`, schemas.AttachmentsResponse);
  },

  getAttachment: async (
    todoId: string,
    attachmentId: string,
  ): Promise<AttachmentResponse> => {
    return request(
      `/todos/${todoId}/attachments/${attachmentId}`,
      schemas.AttachmentResponse,
    );
  },

  prepareAttachment: async (
    todoId: string,
    data: PrepareAttachmentParams,
  ): Promise<PrepareAttachmentResponse> => {
    return request(
      `/todos/${todoId}/attachments`,
      schemas.PrepareAttachmentResponse,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  uploadFileToS3: async (uploadUrl: string, file: File): Promise<void> => {
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
  },

  updateAttachment: async (
    todoId: string,
    attachmentId: string,
    data: UpdateAttachmentParams,
  ): Promise<AttachmentResponse> => {
    return request(
      `/todos/${todoId}/attachments/${attachmentId}`,
      schemas.AttachmentResponse,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },

  deleteAttachment: async (
    todoId: string,
    attachmentId: string,
  ): Promise<void> => {
    return requestVoid(`/todos/${todoId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  },

  getDownloadUrl: async (
    todoId: string,
    attachmentId: string,
  ): Promise<DownloadUrlResponse> => {
    return request(
      `/todos/${todoId}/attachments/${attachmentId}/download-url`,
      schemas.DownloadUrlResponse,
    );
  },
});
