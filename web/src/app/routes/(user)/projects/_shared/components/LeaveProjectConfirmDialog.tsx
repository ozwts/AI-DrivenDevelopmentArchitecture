import { useNavigate } from "react-router";
import { Modal } from "@/app/lib/ui/composite/Modal";
import { Button } from "@/app/lib/ui/leaf/Button";
import { useLeaveProject } from "@/app/features/project/hooks";
import { useToast } from "@/app/lib/contexts/ToastContext";

type LeaveProjectConfirmDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly projectId: string;
  readonly projectName: string;
  readonly isLastOwner: boolean;
};

/**
 * プロジェクト脱退確認ダイアログ
 */
export function LeaveProjectConfirmDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  isLastOwner,
}: LeaveProjectConfirmDialogProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const leaveProject = useLeaveProject();

  const handleLeave = async () => {
    try {
      await leaveProject.mutateAsync({ projectId });
      showToast({
        type: "success",
        message: `${projectName}から脱退しました`,
      });
      onClose();
      navigate("/projects");
    } catch {
      showToast({
        type: "error",
        message: "プロジェクトからの脱退に失敗しました",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header>プロジェクトから脱退</Modal.Header>
      <Modal.Body>
        {isLastOwner ? (
          <div className="space-y-4">
            <p className="text-text-primary text-base leading-relaxed">
              あなたはこのプロジェクトの最後のオーナーです。
            </p>
            <p className="text-sm text-text-tertiary leading-relaxed">
              脱退する前に、他のメンバーをオーナーに昇格させてください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-primary text-base leading-relaxed">
              <span className="font-semibold">{projectName}</span>
              から脱退しますか？
            </p>
            <p className="text-sm text-text-tertiary leading-relaxed">
              脱退後、このプロジェクトにアクセスできなくなります。再度参加するには招待が必要です。
            </p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        {!isLastOwner && (
          <Button
            variant="danger"
            onClick={handleLeave}
            disabled={leaveProject.isPending}
          >
            {leaveProject.isPending ? "脱退中..." : "脱退する"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
