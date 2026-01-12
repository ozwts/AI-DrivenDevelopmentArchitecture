import { Hono } from "hono";
import type { Container } from "inversify";
import { buildListMembersHandler } from "./list-members-handler";
import { buildInviteMemberHandler } from "./invite-member-handler";
import { buildRemoveMemberHandler } from "./remove-member-handler";
import { buildChangeMemberRoleHandler } from "./change-member-role-handler";
import { buildLeaveProjectHandler } from "./leave-project-handler";

export const buildProjectMemberRouter = ({
  container,
}: {
  container: Container;
}): Hono => {
  const projectMemberRouter = new Hono();

  // GET /projects/:projectId/members - メンバー一覧
  projectMemberRouter.get("/", buildListMembersHandler({ container }));

  // POST /projects/:projectId/members - メンバー招待
  projectMemberRouter.post("/", buildInviteMemberHandler({ container }));

  // DELETE /projects/:projectId/members/me - プロジェクト脱退
  projectMemberRouter.delete("/me", buildLeaveProjectHandler({ container }));

  // DELETE /projects/:projectId/members/:memberId - メンバー削除
  projectMemberRouter.delete(
    "/:memberId",
    buildRemoveMemberHandler({ container }),
  );

  // PATCH /projects/:projectId/members/:memberId/role - 権限変更
  projectMemberRouter.patch(
    "/:memberId/role",
    buildChangeMemberRoleHandler({ container }),
  );

  return projectMemberRouter;
};
