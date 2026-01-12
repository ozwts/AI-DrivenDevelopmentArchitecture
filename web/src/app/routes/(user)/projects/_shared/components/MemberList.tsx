import { useState } from "react";
import { z } from "zod";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { Card } from "@/app/lib/ui/composite/Card";
import { Button } from "@/app/lib/ui/leaf/Button";
import { Badge } from "@/app/lib/ui/leaf/Badge";
import { LoadingSpinner } from "@/app/lib/ui/leaf/LoadingSpinner";
import { useProjectMembers } from "@/app/features/project/hooks";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { MemberListItem } from "./MemberListItem";
import { RemoveMemberConfirmDialog } from "./RemoveMemberConfirmDialog";
import { schemas } from "@/generated/zod-schemas";

type MemberRole = z.infer<typeof schemas.MemberRole>;
type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;

type MemberListProps = {
  readonly projectId: string;
  readonly myRole: MemberRole;
};

/**
 * プロジェクトメンバー一覧
 * メンバーの表示、招待、権限変更、削除を行う
 */
export function MemberList({ projectId, myRole }: MemberListProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<ProjectMemberResponse | null>(null);

  const { data: members = [], isLoading, error } = useProjectMembers(projectId);

  const isOwner = myRole === "OWNER";
  const existingMemberIds = members.map((m) => m.userId);
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-8 text-error-600">
            メンバー情報の取得に失敗しました
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Body>
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text-primary">
                メンバー
              </h2>
              <Badge variant="secondary">{members.length}人</Badge>
            </div>
            {isOwner && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setIsInviteDialogOpen(true);
                }}
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                招待
              </Button>
            )}
          </div>

          {/* メンバー一覧 */}
          <div className="divide-y divide-border-default">
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                projectId={projectId}
                isOwner={isOwner}
                ownerCount={ownerCount}
                onRemoveRequest={(m) => {
                  setMemberToRemove(m);
                }}
              />
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* 招待ダイアログ */}
      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onClose={() => {
          setIsInviteDialogOpen(false);
        }}
        projectId={projectId}
        existingMemberIds={existingMemberIds}
      />

      {/* 削除確認ダイアログ */}
      <RemoveMemberConfirmDialog
        isOpen={memberToRemove !== null}
        onClose={() => {
          setMemberToRemove(null);
        }}
        projectId={projectId}
        member={memberToRemove}
      />
    </>
  );
}
