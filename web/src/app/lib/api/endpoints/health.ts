/**
 * Health Check API エンドポイント
 */
import { schemas } from "@/generated/zod-schemas";
import { type RequestFn } from "../api-client";

export const createHealthEndpoints = (request: RequestFn) => ({
  healthCheck: async (): Promise<{ status: string }> => {
    return request("/health", schemas.HealthResponse);
  },
});
