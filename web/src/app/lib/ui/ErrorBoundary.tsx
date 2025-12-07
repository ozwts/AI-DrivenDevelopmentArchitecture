import { Component, ReactNode, ErrorInfo } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

type Props = {
  readonly children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
          <div className="max-w-2xl w-full">
            <Alert variant="error" title="エラーが発生しました">
              <div className="space-y-4">
                <p>申し訳ございません。予期しないエラーが発生しました。</p>
                {this.state.error && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">
                      エラー詳細
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="primary">
                    再試行
                  </Button>
                  <Button
                    onClick={() => {
                      window.location.reload();
                    }}
                    variant="secondary"
                  >
                    ページをリロード
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
