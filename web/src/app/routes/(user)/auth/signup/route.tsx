import { useState, ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/features/auth";
import { buildLogger } from "@/app/lib/logger";
import { Button, Input } from "@/app/lib/ui";

const logger = buildLogger("SignupRoute");

const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("有効なメールアドレスを入力してください"),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(/[A-Z]/, "大文字を含めてください")
      .regex(/[a-z]/, "小文字を含めてください")
      .regex(/[0-9]/, "数字を含めてください")
      .regex(/[^A-Za-z0-9]/, "記号を含めてください"),
    confirmPassword: z.string().min(1, "パスワード（確認）を入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

/**
 * サインアップページ
 * 責務: 新規ユーザー登録フォームの表示と処理
 */
export default function SignupRoute(): ReactNode {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: SignupFormData): Promise<void> => {
    setErrorMessage(null);

    logger.info("サインアップ開始", { email: data.email });

    try {
      await signUp(data.email, data.password);
      logger.info("サインアップ成功", { email: data.email });
      navigate("/auth/signup/confirm", {
        state: { email: data.email, password: data.password },
      });
    } catch (error) {
      logger.error(
        "サインアップ失敗",
        error instanceof Error ? error : { message: String(error) },
      );

      if (error instanceof Error) {
        if (error.name === "UsernameExistsException") {
          setErrorMessage(
            "このメールアドレスは既に登録されています。ログインページからログインしてください。",
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("サインアップに失敗しました");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          サインアップ
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
            <p className="mt-1 text-xs text-text-tertiary">
              8文字以上、大文字・小文字・数字・記号を含む
            </p>
          </div>

          <Input
            label="パスワード（確認）"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
            placeholder="••••••••"
          />

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
            サインアップ
          </Button>

          <div className="text-center text-sm">
            <span className="text-text-tertiary">
              既にアカウントをお持ちですか？{" "}
            </span>
            <Link
              to="/auth"
              className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline"
            >
              ログイン
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
