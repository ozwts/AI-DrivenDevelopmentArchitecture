import { useState, ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/features/auth";
import { buildLogger } from "@/app/lib/logger";
import { Button, Input } from "@/app/lib/ui";

const logger = buildLogger("LoginRoute");

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginRoute(): ReactNode {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setErrorMessage(null);

    logger.info("ログイン開始", { email: data.email });

    try {
      await login(data.email, data.password);
      logger.info("ログイン成功", { email: data.email });
      navigate("/", { replace: true });
    } catch (error) {
      logger.error(
        "ログイン失敗",
        error instanceof Error ? error : { message: String(error) },
      );

      if (error instanceof Error) {
        // Amplify v6では error.name または error.code が "UserNotConfirmedException" になる
        const errorCode =
          "code" in error && typeof error.code === "string"
            ? error.code
            : undefined;
        const isUserNotConfirmed =
          error.name === "UserNotConfirmedException" ||
          errorCode === "UserNotConfirmedException";

        if (isUserNotConfirmed) {
          logger.info("メール確認が必要", { email: data.email });
          navigate("/auth/signup/confirm", {
            state: { email: data.email, needsConfirmation: true },
          });
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("ログインに失敗しました");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          ログイン
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="メールアドレス"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            disabled={isSubmitting}
            placeholder="user@example.com"
          />

          <div>
            <Input
              label="パスワード"
              type="password"
              {...register("password")}
              error={errors.password?.message}
              disabled={isSubmitting}
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                to="/auth/reset-password"
                className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
              >
                パスワードを忘れた場合
              </Link>
            </div>
          </div>

          {errorMessage !== null && (
            <div
              role="alert"
              className="p-3 bg-error-50 border border-error-200 rounded-md text-error text-sm"
            >
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            ログイン
          </Button>

          <div className="text-center text-sm">
            <span className="text-text-tertiary">
              アカウントをお持ちでない方は{" "}
            </span>
            <Link
              to="/auth/signup"
              className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline"
            >
              サインアップ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
