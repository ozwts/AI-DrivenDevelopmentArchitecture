import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";
import type { Project } from "@/domain/model/project/project.entity";
import type { MemberRole } from "@/domain/model/project-member/member-role.vo";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

/**
 * ProjectエンティティをProjectResponseに変換
 */
export const convertToProjectResponse = (
  project: Project,
  myRole: MemberRole,
): ProjectResponse => ({
  id: project.id,
  name: project.name,
  description: project.description,
  color: project.color,
  myRole: myRole.role,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});
