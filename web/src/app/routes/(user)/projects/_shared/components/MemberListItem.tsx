import { z } from "zod";
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/app/lib/ui/leaf/Badge";
import { useChangeMemberRole } from "@/app/features/project/hooks";
import { useCurrentUser } from "@/app/features/user/hooks/useUsers";
import { useToast } from "@/app/lib/contexts/ToastContext";
import { schemas } from "@/generated/zod-schemas";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;

type MemberListItemProps = {
  readonly member: ProjectMemberResponse;
  readonly projectId: string;
  readonly isOwner: boolean;
  readonly ownerCount: number;
  readonly onRemoveRequest: (member: ProjectMemberResponse) => void;
};

/**
 * メンバー一覧の1行
 */
export function MemberListItem({
  member,
  projectId,
  isOwner,
  ownerCount,
  onRemoveRequest,
}: MemberListItemProps) {
  const { showToast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const changeMemberRole = useChangeMemberRole();

  const isMe = currentUser?.id === member.userId;
  const isMemberOwner = member.role === "OWNER";
  const isLastOwner = isMemberOwner && ownerCount <= 1;

  // 自分自身または最後のオーナーは権限変更・削除不可
  const canModify = isOwner && !isMe && !isLastOwner;
  const canChangeRole = canModify;
  const canRemove = canModify;

  const handlePromote = async () => {
    try {
      await changeMemberRole.mutateAsync({
        projectId,
        memberId: member.id,
        role: "OWNER",
      });
      showToast({
        type: "success",
        message: `${member.user.name}をオーナーに昇格しました`,
      });
    } catch {
      showToast({
        type: "error",
        message: "権限変更に失敗しました",
      });
    }
  };

  const handleDemote = async () => {
    try {
      await changeMemberRole.mutateAsync({
        projectId,
        memberId: member.id,
        role: "MEMBER",
      });
      showToast({
        type: "success",
        message: `${member.user.name}をメンバーに降格しました`,
      });
    } catch {
      showToast({
        type: "error",
        message: "権限変更に失敗しました",
      });
    }
  };

  const handleRemove = () => {
    onRemoveRequest(member);
  };

  const isPending = changeMemberRole.isPending;

  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      {/* ユーザー情報 */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-semibold text-lg">
            {member.user.name.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary">
              {member.user.name}
            </span>
            {isMe && (
              <Badge variant="secondary" size="sm">
                自分
              </Badge>
            )}
          </div>
          <div className="text-sm text-text-tertiary truncate">{member.user.email}</div>
        </div>
      </div>

      {/* 権限とアクション */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* 権限バッジ */}
        <Badge
          variant={isMemberOwner ? "primary" : "neutral"}
          size="md"
        >
          {isMemberOwner ? "オーナー" : "メンバー"}
        </Badge>

        {/* アクションボタン */}
        {isOwner && !isMe && (
          <div className="flex items-center gap-2">
            {/* 権限変更ボタン */}
            {canChangeRole && (
              <>
                {isMemberOwner ? (
                  <button
                    type="button"
                    onClick={handleDemote}
                    disabled={isPending}
                    className="p-2 text-text-tertiary hover:text-warning-700 hover:bg-warning-50 rounded-md transition-colors disabled:opacity-50"
                    title="メンバーに降格"
                    aria-label={`${member.user.name}をメンバーに降格`}
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePromote}
                    disabled={isPending}
                    className="p-2 text-text-tertiary hover:text-success-700 hover:bg-success-50 rounded-md transition-colors disabled:opacity-50"
                    title="オーナーに昇格"
                    aria-label={`${member.user.name}をオーナーに昇格`}
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>
                )}
              </>
            )}

            {/* 削除ボタン */}
            {canRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="p-2 text-text-tertiary hover:text-error-700 hover:bg-error-50 rounded-md transition-colors disabled:opacity-50"
                title="メンバーを削除"
                aria-label={`${member.user.name}を削除`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* 最後のオーナーは変更不可の表示 */}
        {isOwner && !isMe && isLastOwner && (
          <span className="text-sm text-text-tertiary">
            最後のオーナー
          </span>
        )}
      </div>
    </div>
  );
}
