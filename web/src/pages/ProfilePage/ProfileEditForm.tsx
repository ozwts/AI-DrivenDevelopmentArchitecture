import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Alert } from "../../components/Alert";
import { schemas } from "../../generated/zod-schemas";
import { useUpdateCurrentUser } from "../../hooks/useUsers";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

interface ProfileEditFormProps {
  user: UserResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfileEditForm = ({
  user,
  onSuccess,
  onCancel,
}: ProfileEditFormProps) => {
  const updateUser = useUpdateCurrentUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserParams>({
    defaultValues: {
      name: user.name,
    },
    resolver: zodResolver(schemas.UpdateUserParams),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onFormSubmit = async (data: UpdateUserParams) => {
    try {
      await updateUser.mutateAsync(data);
      onSuccess();
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {updateUser.isError && (
        <Alert variant="error">
          プロフィールの更新に失敗しました。もう一度お試しください。
        </Alert>
      )}

      <Input
        label="ユーザー名"
        {...register("name")}
        error={errors.name?.message}
        placeholder="例: 田中太郎"
      />

      {/* メールアドレスは読み取り専用（Cognito管理） */}
      <div>
        <label className="text-sm font-medium text-text-dark">
          メールアドレス
        </label>
        <p className="mt-1 text-text-secondary">{user.email}</p>
        <p className="mt-1 text-xs text-text-light">
          メールアドレスはCognito認証で管理されているため、ここでは変更できません。
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} data-testid="cancel-button">
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={updateUser.isPending}
          data-testid="submit-button"
        >
          更新
        </Button>
      </div>
    </form>
  );
};
