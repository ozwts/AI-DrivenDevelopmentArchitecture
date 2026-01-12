import { z } from "zod";
import { Modal } from "@/app/lib/ui/composite/Modal";
import { Button } from "@/app/lib/ui/leaf/Button";
import { useRemoveMember } from "@/app/features/project/hooks";
import { useToast } from "@/app/lib/contexts/ToastContext";
import { schemas } from "@/generated/zod-schemas";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;

type RemoveMemberConfirmDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly projectId: string;
  readonly member: ProjectMemberResponse | null;
};

/**
 * メンバー削除確認ダイアログ
 */
export function RemoveMemberConfirmDialog({
  isOpen,
  onClose,
  projectId,
  member,
}: RemoveMemberConfirmDialogProps) {
  const { showToast } = useToast();
  const removeMember = useRemoveMember();

  const handleRemove = async () => {
    if (!member) return;

    try {
      await removeMember.mutateAsync({
        projectId,
        memberId: member.id,
      });
      showToast({
        type: "success",
        message: `${member.user.name}を削除しました`,
      });
      onClose();
    } catch {
      showToast({
        type: "error",
        message: "メンバー削除に失敗しました",
      });
    }
  };

  if (!member) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header>メンバーを削除</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <p className="text-text-primary text-base leading-relaxed">
            <span className="font-semibold">{member.user.name}</span>
            をプロジェクトから削除しますか？
          </p>
          <p className="text-sm text-text-tertiary leading-relaxed">
            この操作は取り消せません。削除されたメンバーは再度招待することで復帰できます。
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          variant="danger"
          onClick={handleRemove}
          disabled={removeMember.isPending}
        >
          {removeMember.isPending ? "削除中..." : "削除する"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
