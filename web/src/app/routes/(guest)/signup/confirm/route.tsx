import { useState, FormEvent, useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "@/app/features/auth";
import { Button } from "@/app/lib/ui";

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
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { confirmSignUp, resendConfirmationCode, login } = useAuth();
  const navigate = useNavigate();

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
      navigate("/signup", { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await confirmSignUp(email, confirmationCode);

      if (password) {
        await login(email, password);
        setSuccessMessage("メール確認が完了しました。");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000);
      } else {
        setSuccessMessage(
          "メール確認が完了しました。ログインページに移動します。",
        );
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("確認コードの検証に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await resendConfirmationCode(email);
      setSuccessMessage("確認コードを再送信しました。");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          メール確認
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="confirmationCode"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              確認コード
            </label>
            <input
              id="confirmationCode"
              type="text"
              value={confirmationCode}
              onChange={(e) => {
                setConfirmationCode(e.target.value);
              }}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="123456"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-text-tertiary">
              メールに記載されている6桁の確認コードを入力してください
            </p>
          </div>

          {errorMessage !== null && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-error text-sm">
              {errorMessage}
            </div>
          )}

          {successMessage !== null && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-success text-sm">
              {successMessage}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
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
                to="/login"
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
