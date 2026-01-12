import { useState } from "react";
import { z } from "zod";
import { Modal } from "@/app/lib/ui/composite/Modal";
import { Button } from "@/app/lib/ui/leaf/Button";
import { useInviteMember } from "@/app/features/project/hooks";
import { useToast } from "@/app/lib/contexts/ToastContext";
import { UserSearchCombobox } from "./UserSearchCombobox";
import { schemas } from "@/generated/zod-schemas";

type SearchUserResponse = z.infer<typeof schemas.SearchUserResponse>;
type MemberRole = z.infer<typeof schemas.MemberRole>;

type InviteMemberDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly projectId: string;
  readonly existingMemberIds: string[];
};

/**
 * メンバー招待ダイアログ
 * ユーザーを検索して招待できる
 */
export function InviteMemberDialog({
  isOpen,
  onClose,
  projectId,
  existingMemberIds,
}: InviteMemberDialogProps) {
  const [selectedUser, setSelectedUser] = useState<SearchUserResponse | null>(
    null
  );
  const [selectedRole, setSelectedRole] = useState<MemberRole>("MEMBER");

  const { showToast } = useToast();
  const inviteMember = useInviteMember();

  const handleClose = () => {
    setSelectedUser(null);
    setSelectedRole("MEMBER");
    onClose();
  };

  const handleUserSelect = (user: SearchUserResponse) => {
    setSelectedUser(user);
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    try {
      await inviteMember.mutateAsync({
        projectId,
        params: {
          userId: selectedUser.id,
          role: selectedRole,
        },
      });
      showToast({
        type: "success",
        message: `${selectedUser.name}を招待しました`,
      });
      handleClose();
    } catch {
      showToast({
        type: "error",
        message: "招待に失敗しました",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <Modal.Header>メンバーを招待</Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          {/* ユーザー検索 */}
          <div>
            <UserSearchCombobox
              label="ユーザーを検索"
              onSelect={handleUserSelect}
              excludeUserIds={existingMemberIds}
              placeholder="名前またはメールアドレスで検索"
            />
          </div>

          {/* 選択されたユーザー */}
          {selectedUser && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary mb-1">
                    {selectedUser.name}
                  </div>
                  <div className="text-sm text-text-tertiary truncate">
                    {selectedUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                  }}
                  className="ml-4 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/50 rounded-md transition-colors flex-shrink-0"
                  aria-label="選択を解除"
                >
                  解除
                </button>
              </div>
            </div>
          )}

          {/* 権限選択 */}
          {selectedUser && (
            <div>
              <label
                htmlFor="role-select"
                className="block text-sm font-semibold text-text-primary mb-2"
              >
                権限
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value as MemberRole);
                }}
                className="w-full px-4 py-3 border border-border-default rounded-lg text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="MEMBER">メンバー</option>
                <option value="OWNER">オーナー</option>
              </select>
              <p className="mt-2 text-sm text-text-tertiary leading-relaxed">
                {selectedRole === "OWNER"
                  ? "オーナーはメンバーの管理、プロジェクトの削除ができます"
                  : "メンバーはTODOの作成・編集・削除ができます"}
              </p>
            </div>
          )}
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
