import { useState, FormEvent, useEffect, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/app/features/auth";
import { Button } from "@/app/lib/ui";

export default function SignupRoute(): ReactNode {
  const location = useLocation();
  const locationState = location.state as {
    email?: string;
    needsConfirmation?: boolean;
  } | null;

  const [step, setStep] = useState<"signup" | "confirm">("signup");
  const [email, setEmail] = useState(locationState?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signUp, confirmSignUp, resendConfirmationCode, login } = useAuth();
  const navigate = useNavigate();

  // ログインページから遷移してきた場合、最初から確認画面を表示
  useEffect(() => {
    if (locationState?.needsConfirmation === true) {
      setStep("confirm");
      setSuccessMessage(
        "メールアドレスの確認が必要です。確認コードを入力してください。",
      );
    }
  }, [locationState]);

  const handleSignupSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setErrorMessage("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    try {
      await signUp(email, password);
      setSuccessMessage(
        "確認コードをメールで送信しました。メールをご確認ください。",
      );
      setStep("confirm");
    } catch (error) {
      if (error instanceof Error) {
        // 既にユーザーが存在する場合はログインページに誘導
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

    try {
      await confirmSignUp(email, confirmationCode);

      // メール確認完了後、パスワードでログイン
      if (password) {
        await login(email, password);
        setSuccessMessage("メール確認が完了しました。");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000);
      } else {
        // パスワードが保存されていない場合（ログインから遷移してきた場合）
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          {step === "signup" ? "サインアップ" : "メール確認"}
        </h1>

        {step === "signup" ? (
          <form onSubmit={handleSignupSubmit} className="space-y-6">
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
                data-testid="email-input"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
                minLength={8}
                data-testid="password-input"
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
                パスワード（確認）
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
                data-testid="confirm-password-input"
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
              data-testid="submit-button"
            >
              サインアップ
            </Button>

            <div className="text-center text-sm">
              <span className="text-text-tertiary">
                既にアカウントをお持ちですか？{" "}
              </span>
              <Link
                to="/login"
                className="text-secondary-600 hover:text-secondary-700 font-medium hover:underline"
              >
                ログイン
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
                data-testid="confirmation-code-input"
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
                  onClick={async () => {
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
                  }}
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
                  戻る
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
