import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/features/auth";
import { buildLogger } from "@/app/lib/logger";
import { Button, TextField } from "@/app/lib/ui";

const logger = buildLogger("SignupConfirmRoute");

const confirmSchema = z.object({
  confirmationCode: z
    .string()
    .min(1, "確認コードを入力してください")
    .length(6, "確認コードは6桁です"),
});

type ConfirmFormData = z.infer<typeof confirmSchema>;

type LocationState = {
  email?: string;
  password?: string;
  needsConfirmation?: boolean;
};

/**
 * メール確認ページ
 * 責務: サインアップ後のメール確認コード入力と検証
 */
export default function SignupConfirmRoute(): ReactNode {
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [email] = useState(locationState?.email ?? "");
  const [password] = useState(locationState?.password ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const { confirmSignUp, resendConfirmationCode, login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (locationState?.needsConfirmation === true) {
      setSuccessMessage(
        "メールアドレスの確認が必要です。確認コードを入力してください。",
      );
    }
  }, [locationState]);

  // emailがない場合はサインアップページにリダイレクト
  useEffect(() => {
    if (!email) {
      navigate("/auth/signup", { replace: true });
    }
  }, [email, navigate]);

  const onSubmit = async (data: ConfirmFormData): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);

    logger.info("メール確認開始", { email });

    try {
      await confirmSignUp(email, data.confirmationCode);
      logger.info("メール確認成功", { email });

      if (password) {
        await login(email, password);
        logger.info("自動ログイン成功", { email });
        setSuccessMessage("メール確認が完了しました。");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000);
      } else {
        setSuccessMessage(
          "メール確認が完了しました。ログインページに移動します。",
        );
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 2000);
      }
    } catch (error) {
      logger.error(
        "メール確認失敗",
        error instanceof Error ? error : { message: String(error) },
      );
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("確認コードの検証に失敗しました");
      }
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResending(true);

    logger.info("確認コード再送信開始", { email });

    try {
      await resendConfirmationCode(email);
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

  if (!email) {
    return null;
  }

  const isLoading = isSubmitting || isResending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          メール確認
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <TextField
              label="確認コード"
              type="text"
              {...register("confirmationCode")}
              error={errors.confirmationCode?.message}
              disabled={isLoading}
              placeholder="123456"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-text-tertiary">
              メールに記載されている6桁の確認コードを入力してください
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
            isLoading={isSubmitting}
            className="w-full"
          >
            確認
          </Button>

          <div className="text-center text-sm space-y-2">
            <div>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認コードを再送信
              </button>
            </div>
            <div>
              <Link
                to="/auth"
                className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline"
              >
                ログインページに戻る
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
