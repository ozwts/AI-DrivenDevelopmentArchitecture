import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components";

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (error) {
      // エラーの詳細をログ出力（デバッグ用）
      console.error("Login error in LoginPage:", error);

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
          // エラーではないので、メッセージを表示せずに直接確認画面に遷移
          navigate("/signup", { state: { email, needsConfirmation: true } });
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("ログインに失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          ログイン
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="user@example.com"
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
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                to="/reset-password"
                className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
              >
                パスワードを忘れた場合
              </Link>
            </div>
          </div>

          {errorMessage !== null && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-error text-sm">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            ログイン
          </Button>

          <div className="text-center text-sm">
            <span className="text-text-tertiary">
              アカウントをお持ちでない方は{" "}
            </span>
            <Link
              to="/signup"
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
