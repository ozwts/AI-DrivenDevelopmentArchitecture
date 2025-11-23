import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "./routes";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./auth/AuthProvider";
import { AuthInitializer } from "./auth/AuthInitializer";
import { config } from "./config";
import { startMockServer } from "./utils/testing-utils/mock";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/ja/zod.json";
import i18next from "i18next";

// Initialize i18next for Zod
i18next.init({
  lng: "ja",
  resources: {
    ja: { zod: translation },
  },
});

// Set Zod error map to Japanese using makeZodI18nMap with explicit i18next.t
// zodI18nMapだけでは動作しない（i18nextのインスタンスが異なるため）
z.setErrorMap(makeZodI18nMap({ t: i18next.t }));

const main = async () => {
  if (config.mockedApi) {
    await startMockServer();
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <AuthInitializer>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <Router />
                </BrowserRouter>
              </ToastProvider>
            </QueryClientProvider>
          </AuthInitializer>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
};

main();
