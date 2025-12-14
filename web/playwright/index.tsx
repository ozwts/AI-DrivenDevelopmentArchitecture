import "../src/index.css";
import i18next from "i18next";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/ja/zod.json";
import { beforeMount } from "@playwright/experimental-ct-react/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthContext, AuthContextType } from "../src/app/features/auth";

// Initialize i18next for Zod (same as main.tsx)
i18next.init({
  lng: "ja",
  resources: {
    ja: { zod: translation },
  },
});

// Set Zod error map to Japanese
z.setErrorMap(makeZodI18nMap({ t: i18next.t }));

// Mock auth context for components that use useAuth
const mockAuthContext: AuthContextType = {
  user: {
    username: "test-user",
    userId: "test-user-id",
  } as AuthContextType["user"],
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async () => {},
  signUp: async () => {},
  confirmSignUp: async () => {},
  resendConfirmationCode: async () => {},
  resetPassword: async () => {},
  confirmResetPassword: async () => {},
  logout: async () => {},
  getAccessToken: async () => "mock-token",
  clearError: () => {},
};

// Wrap all components with QueryClientProvider
beforeMount(async ({ App }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
});
