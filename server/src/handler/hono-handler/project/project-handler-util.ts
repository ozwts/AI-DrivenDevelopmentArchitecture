import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";
import type { Project } from "@/domain/model/project/project";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

/**
 * ProjectエンティティをProjectResponseに変換
 */
export const convertToProjectResponse = (
  project: Project,
): ProjectResponse => ({
  id: project.id,
  name: project.name,
  description: project.description,
  color: project.color,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});
