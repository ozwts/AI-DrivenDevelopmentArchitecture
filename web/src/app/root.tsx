import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/app/features/toast";
import { ErrorBoundary } from "@/app/lib/ui";
import { AuthProvider, AuthInitializer } from "@/app/features/auth";
import { config } from "@/config";
import { startMockServer } from "@/mocks/mock";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/ja/zod.json";
import i18next from "i18next";
import "./app.css";

// Initialize i18next for Zod
i18next.init({
  lng: "ja",
  resources: {
    ja: { zod: translation },
  },
});

// Set Zod error map to Japanese
z.setErrorMap(makeZodI18nMap({ t: i18next.t }));

// Start mock server if configured
if (config.mockedApi) {
  startMockServer();
}

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
