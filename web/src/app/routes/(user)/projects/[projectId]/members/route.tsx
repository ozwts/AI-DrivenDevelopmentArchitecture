import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router";
import { FolderIcon, UsersIcon } from "@heroicons/react/24/outline";
import { buildLogger } from "@/app/lib/logger";
import { Alert, LoadingSpinner } from "@/app/lib/ui";
import { useCurrentUser, useSearchUsers } from "@/app/features/user";
import {
  useProjectMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useLeaveProject,
} from "@/app/features/project";
import type { ProjectOutletContext } from "../route";
import { MemberList } from "../_shared/components/MemberList";
import { InviteMemberForm } from "../_shared/components/InviteMemberForm";

const logger = buildLogger("ProjectMembersRoute");

/**
 * プロジェクトメンバー管理ページ
 * 責務: メンバー一覧表示、招待、ロール変更、削除、脱退
 */
export default function ProjectMembersRoute() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { project } = useOutletContext<ProjectOutletContext>();

  // 検索クエリ状態
  const [searchQuery, setSearchQuery] = useState("");

  // データ取得
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useProjectMembers(projectId ?? "");
  const { data: searchResults, isLoading: isSearching } =
    useSearchUsers(searchQuery);

  // Mutations
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const leaveProject = useLeaveProject();

  // ページ表示ログ
  useEffect(() => {
    logger.info("プロジェクトメンバー管理ページ表示", {
      projectId: project.id,
      name: project.name,
    });
  }, [project]);

  // 現在のユーザーがオーナーかどうか
  const isCurrentUserOwner = useMemo(() => {
    if (!currentUser || !members) return false;
    const currentMembership = members.find(
      (m) => m.userId === currentUser.id,
    );
    return currentMembership?.role === "OWNER";
  }, [currentUser, members]);

  // イベントハンドラ
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleInvite = useCallback(
    (userId: string) => {
      if (!projectId) return;
      inviteMember.mutate(
        { projectId, data: { userId } },
        {
          onSuccess: () => {
            logger.info("メンバー招待成功", { projectId, userId });
            setSearchQuery("");
          },
        },
      );
    },
    [projectId, inviteMember],
  );

  const handleGrantOwner = useCallback(
    (userId: string) => {
      if (!projectId) return;
      updateMemberRole.mutate(
        {
          projectId,
          userId,
          data: { role: "OWNER" },
          dirtyFields: { role: true },
        },
        {
          onSuccess: () => {
            logger.info("オーナー権限付与成功", { projectId, userId });
          },
        },
      );
    },
    [projectId, updateMemberRole],
  );

  const handleRevokeOwner = useCallback(
    (userId: string) => {
      if (!projectId) return;
      updateMemberRole.mutate(
        {
          projectId,
          userId,
          data: { role: "MEMBER" },
          dirtyFields: { role: true },
        },
        {
          onSuccess: () => {
            logger.info("オーナー権限剥奪成功", { projectId, userId });
          },
        },
      );
    },
    [projectId, updateMemberRole],
  );

  const handleRemove = useCallback(
    (userId: string) => {
      if (!projectId) return;
      removeMember.mutate(
        { projectId, userId },
        {
          onSuccess: () => {
            logger.info("メンバー削除成功", { projectId, userId });
          },
        },
      );
    },
    [projectId, removeMember],
  );

  const handleLeave = useCallback(() => {
    if (!projectId) return;
    leaveProject.mutate(projectId, {
      onSuccess: () => {
        logger.info("プロジェクト脱退成功", { projectId });
        navigate("/projects");
      },
    });
  }, [projectId, leaveProject, navigate]);

  // ローディング状態
  if (isLoadingUser || isLoadingMembers) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // エラー状態
  if (membersError || !members || !currentUser) {
    return (
      <Alert variant="error" title="エラーが発生しました">
        メンバー情報の読み込みに失敗しました。
      </Alert>
    );
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-12">
        {/* style属性: ユーザー選択の動的カラー（Tailwindトークン化不可） */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.color }}
          >
            <FolderIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-text-primary">
              {project.name}
            </h1>
            <div className="flex items-center gap-2 text-base text-text-secondary mt-1">
              <UsersIcon className="h-5 w-5" />
              <span>{members.length}人のメンバー</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* メンバー招待セクション（オーナーのみ） */}
        {isCurrentUserOwner && (
          <section>
            <InviteMemberForm
              searchResults={searchResults ?? []}
              existingMembers={members}
              isSearching={isSearching}
              onSearch={handleSearch}
              onInvite={handleInvite}
              isInviting={inviteMember.isPending}
            />
          </section>
        )}

        {/* メンバー一覧セクション */}
        <section>
          <MemberList
            members={members}
            currentUserId={currentUser.id}
            isCurrentUserOwner={isCurrentUserOwner}
            onGrantOwner={handleGrantOwner}
            onRevokeOwner={handleRevokeOwner}
            onRemove={handleRemove}
            onLeave={handleLeave}
          />
        </section>
      </div>
    </>
  );
}
