import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { schemas } from "../../generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

type ProfileEditFormProps = {
  user: UserResponse;
  onSubmit: (data: UpdateUserParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export const ProfileEditForm = ({
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProfileEditFormProps) => {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="ユーザー名"
        {...register("name")}
        error={errors.name?.message}
        placeholder="例: 田中太郎"
      />

      {/* メールアドレスは読み取り専用（Cognito管理） */}
      <div>
        <label
          htmlFor="email-readonly"
          className="text-sm font-medium text-text-dark"
        >
          メールアドレス
        </label>
        <p id="email-readonly" className="mt-1 text-text-secondary">
          {user.email}
        </p>
        <p className="mt-1 text-xs text-text-light">
          メールアドレスはCognito認証で管理されているため、ここでは変更できません。
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          data-testid="cancel-button"
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          data-testid="submit-button"
        >
          更新
        </Button>
      </div>
    </form>
  );
};
