/* eslint-disable local-rules/component/require-component-test -- 複数フック依存（useSearchUsers、useInviteMember等）のため、SSテストでカバー */
import { useState, useMemo } from "react";
import { z } from "zod";
import { cva } from "class-variance-authority";
import { UserIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Modal, Button, TextField, LoadingSpinner } from "@/app/lib/ui";
import { useSearchUsers } from "@/app/features/user";
import { useInviteMember, useProjectMembers } from "@/app/features/project";
import { schemas } from "@/generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;

type InviteMemberDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly projectId: string;
};

/**
 * メンバー招待ダイアログ
 * 責務: ユーザー検索と招待機能の提供
 */
export function InviteMemberDialog({
  isOpen,
  onClose,
  projectId,
}: InviteMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const { data: searchResults, isLoading: isSearching } =
    useSearchUsers(searchQuery);
  const { data: existingMembers } = useProjectMembers(projectId);
  const inviteMember = useInviteMember();

  // 既存メンバーを除外
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];
    const memberUserIds = new Set(existingMembers?.map((m) => m.userId) ?? []);
    return searchResults.filter((user) => !memberUserIds.has(user.id));
  }, [searchResults, existingMembers]);

  const handleInvite = async () => {
    if (!selectedUser) return;

    try {
      await inviteMember.mutateAsync({
        projectId,
        data: { userId: selectedUser.id },
      });
      handleClose();
    } catch {
      // エラーはhooks内でログ出力済み
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUser(null);
    onClose();
  };

  const handleSelectUser = (user: UserResponse) => {
    setSelectedUser(user);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <Modal.Header>メンバーを招待</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {/* 検索フィールド */}
          <TextField
            label="ユーザーを検索"
            name="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="名前で検索..."
            autoComplete="off"
          />

          {/* 検索結果 */}
          <div className="min-h-32 max-h-64 overflow-y-auto border border-border-light rounded-lg p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : searchQuery.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                <MagnifyingGlassIcon className="h-10 w-10 mb-3" />
                <p className="text-sm">名前を入力して検索してください</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                <p className="text-sm">該当するユーザーが見つかりません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((user) => (
                  <UserSelectItem
                    key={user.id}
                    user={user}
                    isSelected={selectedUser?.id === user.id}
                    onSelect={() => {
                      handleSelectUser(user);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={handleInvite}
          disabled={!selectedUser || inviteMember.isPending}
        >
          {inviteMember.isPending ? "招待中..." : "招待する"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

const userSelectItemVariants = cva(
  "w-full flex items-center gap-4 p-3 rounded-lg transition-colors border-2",
  {
    variants: {
      selected: {
        true: "bg-primary-200 border-secondary-600",
        false: "bg-background-surface hover:bg-primary-100 border-transparent",
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

export type UserSelectItemProps = {
  readonly user: UserResponse;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
};

/**
 * ユーザー選択アイテム（プレゼンテーショナル）
 * 責務: 検索結果のユーザー表示と選択状態の管理
 */
export function UserSelectItem({ user, isSelected, onSelect }: UserSelectItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={userSelectItemVariants({ selected: isSelected })}
    >
      <div className="w-10 h-10 rounded-full bg-primary-300 flex items-center justify-center flex-shrink-0">
        <UserIcon className="h-5 w-5 text-text-secondary" />
      </div>
      <div className="text-left min-w-0">
        <p className="font-semibold text-text-primary truncate">{user.name}</p>
        <p className="text-sm text-text-tertiary truncate mt-0.5">{user.email}</p>
      </div>
    </button>
  );
}
