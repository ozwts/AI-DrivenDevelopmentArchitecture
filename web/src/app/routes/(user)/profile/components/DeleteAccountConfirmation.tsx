import {
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Button, Alert } from "@/app/lib/ui";
import { schemas } from "@/generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;

type DeleteAccountConfirmationProps = {
  readonly user: UserResponse;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isDeleting: boolean;
};

export const DeleteAccountConfirmation = ({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteAccountConfirmationProps) => {
  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon
            className="h-6 w-6 flex-shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">この操作は取り消せません</p>
            <p className="mt-1 text-sm">
              アカウントを削除すると、すべてのデータが完全に失われます。
            </p>
          </div>
        </div>
      </Alert>

      {/* Account Information */}
      <div className="bg-error-50 border border-error-200 rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-error-900">
            削除されるアカウント
          </p>
          <p className="mt-1 text-base font-bold text-error-900">
            {user.name} ({user.email})
          </p>
        </div>
        <div className="border-t border-error-200 pt-3">
          <p className="text-sm font-medium text-error-900 mb-2">
            削除されるデータ:
          </p>
          <ul className="text-sm text-error-800 space-y-1 list-disc list-inside">
            <li>プロフィール情報</li>
            <li>作成したTODO</li>
            <li>参加しているプロジェクト</li>
            <li>アカウント設定</li>
          </ul>
        </div>
      </div>

      {/* Warning Text */}
      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
        <p className="text-sm text-warning-900">
          <strong>注意:</strong>{" "}
          削除後は自動的にログアウトされ、このアカウントでの再ログインはできなくなります。
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isDeleting}
        >
          キャンセル
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          isLoading={isDeleting}
        >
          <TrashIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          完全に削除する
        </Button>
      </div>
    </div>
  );
};
