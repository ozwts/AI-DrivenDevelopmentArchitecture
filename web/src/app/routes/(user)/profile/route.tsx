import { useState } from "react";
import {
  UserCircleIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Card, Button, Modal, Alert } from "@/app/lib/ui";
import { useToast } from "@/app/features/toast";
import {
  useCurrentUser,
  useUpdateCurrentUser,
  useDeleteCurrentUser,
} from "@/app/features/user";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { ProfileEditForm } from "./components/ProfileEditForm";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";

type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

export default function ProfileRoute() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: user, isLoading, error } = useCurrentUser();
  const updateUser = useUpdateCurrentUser();
  const deleteUser = useDeleteCurrentUser();
  const toast = useToast();

  const handleUpdate = async (data: UpdateUserParams) => {
    try {
      await updateUser.mutateAsync(data);
      setIsEditModalOpen(false);
      toast.success("プロフィールを更新しました");
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      toast.error("プロフィールの更新に失敗しました");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync();
      // 削除成功後のログアウト処理
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("ユーザー削除エラー:", error);
      toast.error("アカウントの削除に失敗しました");
      setIsDeleteModalOpen(false);
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
        <Alert variant="error">ユーザー情報の取得に失敗しました。</Alert>
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
              <UserCircleIcon
                className="h-20 w-20 text-text-tertiary"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-dark">{user.name}</h2>
              <p className="text-text-secondary mt-1">{user.email}</p>
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(true);
                }}
              >
                <PencilIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                編集
              </Button>
            </div>
          </div>

          {/* User Details */}
          <div className="border-t border-border-light pt-6 space-y-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </dl>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="border-2 border-red-200 rounded-lg bg-red-50 p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon
                className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
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
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                    }}
                    aria-label="アカウント削除確認ダイアログを開く"
                  >
                    <TrashIcon className="h-5 w-5 mr-2" aria-hidden="true" />
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
        onClose={() => {
          setIsEditModalOpen(false);
        }}
        title="プロフィール編集"
      >
        <ProfileEditForm
          user={user}
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditModalOpen(false);
          }}
          isLoading={updateUser.isPending}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
        }}
        title="アカウント削除の確認"
      >
        <DeleteAccountConfirmation
          user={user}
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteModalOpen(false);
          }}
          isDeleting={deleteUser.isPending}
        />
      </Modal>
    </div>
  );
}
