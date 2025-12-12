import { useState, FormEvent, ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/app/features/auth";
import { Button } from "@/app/lib/ui";

export default function ResetPasswordRoute(): ReactNode {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { resetPassword, confirmResetPassword, login } = useAuth();
  const navigate = useNavigate();

  const handleRequestSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccessMessage(
        "確認コードをメールで送信しました。メールをご確認ください。",
      );
      setStep("confirm");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("確認コードの送信に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setErrorMessage("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    try {
      await confirmResetPassword(email, confirmationCode, newPassword);

      // パスワードリセット完了後、自動ログイン
      await login(email, newPassword);
      setSuccessMessage("パスワードがリセットされました。");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("パスワードのリセットに失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          {step === "request" ? "パスワードリセット" : "新しいパスワード設定"}
        </h1>

        {step === "request" ? (
          <form onSubmit={handleRequestSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="user@example.com"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                登録されているメールアドレスに確認コードを送信します
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
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
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

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                新しいパスワード
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                }}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                8文字以上、大文字・小文字・数字・記号を含む
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                新しいパスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                }}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                minLength={8}
              />
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
              パスワードをリセット
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={async () => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setIsLoading(true);
                  try {
                    await resetPassword(email);
                    setSuccessMessage("確認コードを再送信しました。");
                  } catch (error) {
                    if (error instanceof Error) {
                      setErrorMessage(error.message);
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
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
