import { useState, FormEvent, ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/app/features/auth";
import { buildLogger } from "@/app/lib/logger";
import { Button } from "@/app/lib/ui";

const logger = buildLogger("SignupRoute");

/**
 * サインアップページ
 * 責務: 新規ユーザー登録フォームの表示と処理
 */
export default function SignupRoute(): ReactNode {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      logger.warn("パスワード不一致");
      setErrorMessage("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    logger.info("サインアップ開始", { email });

    try {
      await signUp(email, password);
      logger.info("サインアップ成功", { email });
      navigate("/signup/confirm", { state: { email, password } });
    } catch (error) {
      logger.error("サインアップ失敗", error instanceof Error ? error : { message: String(error) });

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-background-surface rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-text-primary text-center mb-8">
          サインアップ
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
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
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
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-2 border border-border rounded-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          {errorMessage !== null && (
            <div className="p-3 bg-error-50 border border-error-200 rounded-md text-error text-sm">
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
      </div>
    </div>
  );
}
