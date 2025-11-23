import { useState } from "react";
import {
  UserCircleIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useCurrentUser, useDeleteCurrentUser } from "../../hooks/useUsers";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Alert } from "../../components/Alert";
import { ProfileEditForm } from "./ProfileEditForm";

export const ProfilePage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: user, isLoading, error } = useCurrentUser();
  const deleteUser = useDeleteCurrentUser();

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync();
      // 削除成功後、useDeleteCurrentUser内でログインページにリダイレクト
    } catch (error) {
      console.error("ユーザー削除エラー:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-text-secondary">読み込み中...</div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">
          ユーザー情報の取得に失敗しました。{" "}
          {error instanceof Error ? error.message : ""}
        </Alert>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="warning">ユーザー情報が見つかりません。</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-dark">プロフィール</h1>
        <p className="mt-2 text-text-regular">
          あなたのアカウント情報を管理します
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="space-y-6">
          {/* User Icon and Name */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <UserCircleIcon className="h-20 w-20 text-text-tertiary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-dark">{user.name}</h2>
              <p className="text-text-secondary mt-1">{user.email}</p>
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                data-testid="edit-button"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                編集
              </Button>
            </div>
          </div>

          {/* User Details */}
          <div className="border-t border-border-light pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-text-tertiary">
                  ユーザーID
                </dt>
                <dd className="mt-1 text-text-dark font-mono text-sm">
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-tertiary">
                  メールアドレス
                </dt>
                <dd className="mt-1 text-text-dark">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-tertiary">
                  登録日時
                </dt>
                <dd className="mt-1 text-text-dark">
                  {new Date(user.createdAt).toLocaleString("ja-JP")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-tertiary">
                  最終更新日時
                </dt>
                <dd className="mt-1 text-text-dark">
                  {new Date(user.updatedAt).toLocaleString("ja-JP")}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="border-2 border-red-200 rounded-lg bg-red-50 p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900">危険な操作</h3>
                <p className="mt-1 text-sm text-red-700">
                  この操作を実行すると、アカウントとすべてのデータが完全に削除されます。
                </p>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="border-t border-red-200 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900">
                    アカウントの削除
                  </h4>
                  <p className="mt-1 text-sm text-red-700">
                    アカウントを削除すると、すべてのプロフィール情報、TODO、プロジェクトが完全に削除されます。この操作は取り消せません。
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    アカウントを削除
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="プロフィール編集"
      >
        <ProfileEditForm
          user={user}
          onSuccess={() => setIsEditModalOpen(false)}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="アカウント削除の確認"
      >
        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="error">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">この操作は取り消せません</p>
                <p className="mt-1 text-sm">
                  アカウントを削除すると、すべてのデータが完全に失われます。
                </p>
              </div>
            </div>
          </Alert>

          {/* Account Information */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-red-900">
                削除されるアカウント
              </p>
              <p className="mt-1 text-base font-bold text-red-900">
                {user.name} ({user.email})
              </p>
            </div>
            <div className="border-t border-red-200 pt-3">
              <p className="text-sm font-medium text-red-900 mb-2">
                削除されるデータ:
              </p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>プロフィール情報</li>
                <li>作成したTODO</li>
                <li>参加しているプロジェクト</li>
                <li>アカウント設定</li>
              </ul>
            </div>
          </div>

          {/* Warning Text */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>注意:</strong>{" "}
              削除後は自動的にログアウトされ、このアカウントでの再ログインはできなくなります。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteUser.isPending}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteUser.isPending}
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              完全に削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
