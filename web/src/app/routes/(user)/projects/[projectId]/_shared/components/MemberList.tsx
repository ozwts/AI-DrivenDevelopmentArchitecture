import {
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Badge, Button, Card } from "@/app/lib/ui";
import { schemas } from "@/generated/zod-schemas";

type ProjectMembershipResponse = z.infer<
  typeof schemas.ProjectMembershipResponse
>;

type MemberListProps = {
  readonly members: ProjectMembershipResponse[];
  readonly currentUserId: string;
  readonly isCurrentUserOwner: boolean;
  readonly onGrantOwner: (userId: string) => void;
  readonly onRevokeOwner: (userId: string) => void;
  readonly onRemove: (userId: string) => void;
  readonly onLeave: () => void;
};

/**
 * プロジェクトメンバー一覧コンポーネント
 * 責務: メンバー一覧の表示とアクション（ロール変更・削除・脱退）
 */
export const MemberList = ({
  members,
  currentUserId,
  isCurrentUserOwner,
  onGrantOwner,
  onRevokeOwner,
  onRemove,
  onLeave,
}: MemberListProps) => {
  // オーナー数を計算（最後のオーナーは操作制限のため）
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  return (
    <Card>
      <Card.Body>
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          メンバー一覧
        </h2>
        <div className="space-y-4">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const isOwner = member.role === "OWNER";
            const isLastOwner = isOwner && ownerCount <= 1;

            return (
              <div
                key={member.userId}
                className="flex items-center justify-between py-4 border-b border-border-light last:border-b-0"
                data-testid={`member-${member.userId}`}
              >
                {/* メンバー情報 */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* アバター（イニシャル） */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-base font-medium text-primary-700">
                      {member.userName.charAt(0)}
                    </span>
                  </div>

                  {/* 名前とメール */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {member.userName}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="info" size="sm">
                          あなた
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {member.userEmail}
                    </p>
                  </div>

                  {/* ロールバッジ */}
                  <Badge
                    variant={isOwner ? "success" : "default"}
                    data-testid={`role-badge-${member.userId}`}
                  >
                    {isOwner ? "オーナー" : "メンバー"}
                  </Badge>
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 ml-4">
                  {isCurrentUser ? (
                    // 自分の場合は脱退ボタン
                    <Button
                      variant="ghost"
                      size="iconOnly"
                      onClick={onLeave}
                      aria-label="プロジェクトから脱退"
                      disabled={isLastOwner}
                      title={
                        isLastOwner
                          ? "最後のオーナーは脱退できません"
                          : "プロジェクトから脱退"
                      }
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                    </Button>
                  ) : (
                    // 他のメンバーの場合（オーナーのみ操作可能）
                    isCurrentUserOwner && (
                      <>
                        {/* ロール変更 */}
                        {isOwner ? (
                          <Button
                            variant="ghost"
                            size="iconOnly"
                            onClick={() => {
                              onRevokeOwner(member.userId);
                            }}
                            aria-label="メンバーに降格"
                            disabled={isLastOwner}
                            title={
                              isLastOwner
                                ? "最後のオーナーは降格できません"
                                : "メンバーに降格"
                            }
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="iconOnly"
                            onClick={() => {
                              onGrantOwner(member.userId);
                            }}
                            aria-label="オーナーに昇格"
                            title="オーナーに昇格"
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </Button>
                        )}

                        {/* 削除 */}
                        <Button
                          variant="ghost"
                          size="iconOnly"
                          onClick={() => {
                            onRemove(member.userId);
                          }}
                          aria-label="メンバーを削除"
                          disabled={isLastOwner}
                          title={
                            isLastOwner
                              ? "最後のオーナーは削除できません"
                              : "メンバーを削除"
                          }
                        >
                          <TrashIcon className="h-4 w-4 text-error-600" />
                        </Button>
                      </>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
};
