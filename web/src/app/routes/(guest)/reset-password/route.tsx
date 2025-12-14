import { useState, ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/features/auth";
import { buildLogger } from "@/app/lib/logger";
import { Button, Input } from "@/app/lib/ui";

const logger = buildLogger("ResetPasswordRoute");

// Step 1: Request form schema
const requestSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
});

// Step 2: Confirm form schema
const confirmSchema = z
  .object({
    confirmationCode: z
      .string()
      .min(1, "確認コードを入力してください")
      .length(6, "確認コードは6桁です"),
    newPassword: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(/[A-Z]/, "大文字を含めてください")
      .regex(/[a-z]/, "小文字を含めてください")
      .regex(/[0-9]/, "数字を含めてください")
      .regex(/[^A-Za-z0-9]/, "記号を含めてください"),
    confirmPassword: z.string().min(1, "パスワード（確認）を入力してください"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type RequestFormData = z.infer<typeof requestSchema>;
type ConfirmFormData = z.infer<typeof confirmSchema>;

export default function ResetPasswordRoute(): ReactNode {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const { resetPassword, confirmResetPassword, login } = useAuth();
  const navigate = useNavigate();

  // Request form
  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Confirm form
  const confirmForm = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onRequestSubmit = async (data: RequestFormData): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);

    logger.info("パスワードリセット確認コード送信開始", { email: data.email });

    try {
      await resetPassword(data.email);
      logger.info("パスワードリセット確認コード送信成功", { email: data.email });
      setEmail(data.email);
      setSuccessMessage(
        "確認コードをメールで送信しました。メールをご確認ください。",
      );
      setStep("confirm");
    } catch (error) {
      logger.error(
        "パスワードリセット確認コード送信失敗",
        error instanceof Error ? error : { message: String(error) },
      );
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("確認コードの送信に失敗しました");
      }
    }
  };

  const onConfirmSubmit = async (data: ConfirmFormData): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);

    logger.info("パスワードリセット開始", { email });

    try {
      await confirmResetPassword(email, data.confirmationCode, data.newPassword);
      logger.info("パスワードリセット成功", { email });

      // パスワードリセット完了後、自動ログイン
      await login(email, data.newPassword);
      logger.info("自動ログイン成功", { email });
      setSuccessMessage("パスワードがリセットされました。");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    } catch (error) {
      logger.error(
        "パスワードリセット失敗",
        error instanceof Error ? error : { message: String(error) },
      );
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("パスワードのリセットに失敗しました");
      }
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResending(true);

    logger.info("確認コード再送信開始", { email });

    try {
      await resetPassword(email);
      logger.info("確認コード再送信成功", { email });
      setSuccessMessage("確認コードを再送信しました。");
    } catch (error) {
      logger.error(
        "確認コード再送信失敗",
        error instanceof Error ? error : { message: String(error) },
      );
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  const isLoading =
    requestForm.formState.isSubmitting ||
    confirmForm.formState.isSubmitting ||
    isResending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          {step === "request" ? "パスワードリセット" : "新しいパスワード設定"}
        </h1>

        {step === "request" ? (
          <form
            onSubmit={requestForm.handleSubmit(onRequestSubmit)}
            className="space-y-6"
          >
            <div>
              <Input
                label="メールアドレス"
                type="email"
                {...requestForm.register("email")}
                error={requestForm.formState.errors.email?.message}
                disabled={isLoading}
                placeholder="user@example.com"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                登録されているメールアドレスに確認コードを送信します
              </p>
            </div>

            {errorMessage !== null && (
              <div
                role="alert"
                className="p-3 bg-error-50 border border-error-200 rounded-md text-error text-sm"
              >
                {errorMessage}
              </div>
            )}

            {successMessage !== null && (
              <div
                role="status"
                className="p-3 bg-success-50 border border-success-200 rounded-md text-success text-sm"
              >
                {successMessage}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={requestForm.formState.isSubmitting}
              className="w-full"
            >
              確認コードを送信
            </Button>

            <div className="text-center text-sm">
              <Link
                to="/login"
                className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline"
              >
                ログインページに戻る
              </Link>
            </div>
          </form>
        ) : (
          <form
            onSubmit={confirmForm.handleSubmit(onConfirmSubmit)}
            className="space-y-6"
          >
            <div>
              <Input
                label="確認コード"
                type="text"
                {...confirmForm.register("confirmationCode")}
                error={confirmForm.formState.errors.confirmationCode?.message}
                disabled={isLoading}
                placeholder="123456"
                maxLength={6}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                メールに記載されている6桁の確認コードを入力してください
              </p>
            </div>

            <div>
              <Input
                label="新しいパスワード"
                type="password"
                {...confirmForm.register("newPassword")}
                error={confirmForm.formState.errors.newPassword?.message}
                disabled={isLoading}
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                8文字以上、大文字・小文字・数字・記号を含む
              </p>
            </div>

            <Input
              label="新しいパスワード（確認）"
              type="password"
              {...confirmForm.register("confirmPassword")}
              error={confirmForm.formState.errors.confirmPassword?.message}
              disabled={isLoading}
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

            {successMessage !== null && (
              <div
                role="status"
                className="p-3 bg-success-50 border border-success-200 rounded-md text-success text-sm"
              >
                {successMessage}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={confirmForm.formState.isSubmitting}
              className="w-full"
            >
              パスワードをリセット
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認コードを再送信
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
