/* eslint-disable local-rules/component/require-component-test -- 複数フック依存（useProjectMembers、useCurrentUser等）のため、SSテストでカバー */
import { useState } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import {
  UserIcon,
  UserPlusIcon,
  TrashIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge, LoadingSpinner, Button } from "@/app/lib/ui";
import {
  useProjectMembers,
  useRemoveMember,
  useLeaveProject,
} from "@/app/features/project";
import { useCurrentUser } from "@/app/features/user";
import { schemas } from "@/generated/zod-schemas";
import { InviteMemberDialog } from "./InviteMemberDialog";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;
type UserResponse = z.infer<typeof schemas.UserResponse>;

type MemberListSectionProps = {
  readonly projectId: string;
};

/**
 * プロジェクトメンバー一覧セクション
 * 責務: メンバーのカード形式表示とオーナーバッジの表示
 */
export function MemberListSection({ projectId }: MemberListSectionProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: members, isLoading, error } = useProjectMembers(projectId);
  const { data: currentUser } = useCurrentUser();
  const removeMember = useRemoveMember();
  const leaveProject = useLeaveProject();

  // 現在のユーザーのメンバー情報
  const currentUserMember = members?.find((m) => m.userId === currentUser?.id);

  // 現在のユーザーがオーナーかどうか
  const isCurrentUserOwner = currentUserMember?.role === "owner";

  // 現在のユーザーがメンバー（オーナー以外）かどうか
  const canLeave = currentUserMember && !isCurrentUserOwner;

  const handleDeleteMember = async (member: ProjectMemberResponse) => {
    if (!window.confirm(`${member.user.name} をプロジェクトから削除しますか？`)) {
      return;
    }

    try {
      await removeMember.mutateAsync({
        projectId,
        userId: member.userId,
      });
    } catch {
      // エラーはhooks内でログ出力済み
    }
  };

  const handleLeaveProject = async () => {
    if (!window.confirm("このプロジェクトから脱退しますか？")) {
      return;
    }

    try {
      await leaveProject.mutateAsync(projectId);
      navigate("/projects");
    } catch {
      // エラーはhooks内でログ出力済み
    }
  };

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
          <p className="text-text-secondary text-center py-4">
            メンバー情報の読み込みに失敗しました
          </p>
        </Card.Body>
      </Card>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <Card.Body>
          <p className="text-text-secondary text-center py-4">
            メンバーがいません
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg font-semibold text-text-primary">
              プロジェクトメンバー ({members.length})
            </h2>
            {isCurrentUserOwner && (
              <Button
                variant="secondary"
                onClick={() => {
                  setIsInviteDialogOpen(true);
                }}
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                招待
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                user={member.user}
                role={member.role}
                canDelete={isCurrentUserOwner && member.role !== "owner"}
                onDelete={() => {
                  handleDeleteMember(member);
                }}
                isDeleting={removeMember.isPending}
              />
            ))}
          </div>
          {canLeave && (
            <div className="mt-6 pt-6 border-t border-border-light">
              <Button
                variant="ghost"
                onClick={handleLeaveProject}
                disabled={leaveProject.isPending}
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-2" />
                {leaveProject.isPending
                  ? "脱退中..."
                  : "このプロジェクトから脱退"}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onClose={() => {
          setIsInviteDialogOpen(false);
        }}
        projectId={projectId}
      />
    </>
  );
}

export type MemberCardProps = {
  readonly user: UserResponse;
  readonly role: "owner" | "member";
  readonly canDelete: boolean;
  readonly onDelete: () => void;
  readonly isDeleting: boolean;
};

/**
 * メンバーカードコンポーネント（プレゼンテーショナル）
 * 責務: 個々のメンバー情報の表示と削除ボタン
 */
export function MemberCard({
  user,
  role,
  canDelete,
  onDelete,
  isDeleting,
}: MemberCardProps) {
  const isOwner = role === "owner";

  return (
    <div className="flex items-center justify-between p-4 bg-background-surface rounded-lg border border-border-light">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-300 flex items-center justify-center flex-shrink-0">
          <UserIcon className="h-5 w-5 text-text-secondary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">{user.name}</p>
          <p className="text-sm text-text-tertiary mt-0.5">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isOwner && (
          <Badge variant="primary" size="sm">
            オーナー
          </Badge>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={`${user.name}を削除`}
          >
            <TrashIcon className="h-4 w-4 text-error-600" />
          </Button>
        )}
      </div>
    </div>
  );
}
