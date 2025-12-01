import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../api/client";
import { schemas } from "../generated/zod-schemas";

type PrepareAttachmentParams = z.infer<typeof schemas.PrepareAttachmentParams>;
type UpdateAttachmentParams = z.infer<typeof schemas.UpdateAttachmentParams>;

const QUERY_KEY = "attachments";
const TODOS_QUERY_KEY = "todos";

export function useAttachments(todoId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId],
    queryFn: () => apiClient.getAttachments(todoId),
    enabled: !!todoId,
  });
}

export function useAttachment(todoId: string, attachmentId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId, attachmentId],
    queryFn: () => apiClient.getAttachment(todoId, attachmentId),
    enabled: !!todoId && !!attachmentId,
  });
}

export function usePrepareAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todoId,
      data,
    }: {
      todoId: string;
      data: PrepareAttachmentParams;
    }) => apiClient.prepareAttachment(todoId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.todoId],
      });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ todoId, file }: { todoId: string; file: File }) => {
      // 1. アップロード準備（uploadUrlとattachmentを取得）
      const prepareData: PrepareAttachmentParams = {
        filename: file.name,
        contentType: file.type,
        filesize: file.size,
      };

      const { uploadUrl, attachment } = await apiClient.prepareAttachment(
        todoId,
        prepareData,
      );

      // 2. S3に直接アップロード
      await apiClient.uploadFileToS3(uploadUrl, file);

      // 3. ステータスをUPLOADEDに更新
      const updatedAttachment = await apiClient.updateAttachment(
        todoId,
        attachment.id,
        { status: "UPLOADED" },
      );

      return updatedAttachment;
    },
    onSuccess: (_, variables) => {
      // 添付ファイル一覧とTODO一覧のキャッシュを無効化（TODOにはattachmentsが含まれる）
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.todoId],
      });
      queryClient.invalidateQueries({ queryKey: [TODOS_QUERY_KEY] });
    },
  });
}

export function useUpdateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todoId,
      attachmentId,
      data,
    }: {
      todoId: string;
      attachmentId: string;
      data: UpdateAttachmentParams;
    }) => apiClient.updateAttachment(todoId, attachmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.todoId],
      });
      queryClient.invalidateQueries({ queryKey: [TODOS_QUERY_KEY] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todoId,
      attachmentId,
    }: {
      todoId: string;
      attachmentId: string;
    }) => apiClient.deleteAttachment(todoId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.todoId],
      });
      queryClient.invalidateQueries({ queryKey: [TODOS_QUERY_KEY] });
    },
  });
}

export function useDownloadUrl(todoId: string, attachmentId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, todoId, attachmentId, "download-url"],
    queryFn: () => apiClient.getDownloadUrl(todoId, attachmentId),
    enabled: false, // 手動で実行
    staleTime: 0, // 毎回新しいURLを取得
  });
}
