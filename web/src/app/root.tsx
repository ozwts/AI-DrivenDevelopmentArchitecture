import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/app/lib/contexts";
import { ErrorBoundary } from "@/app/lib/error";
import { AuthProvider, AuthInitializer } from "@/app/features/auth";
import "./app.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TODO App</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthInitializer>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Outlet />
            </ToastProvider>
          </QueryClientProvider>
        </AuthInitializer>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}
