import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/ja/zod.json";
import i18next from "i18next";
import { config } from "@/config";
import { startMockServer } from "@/mocks/mock";

// Initialize i18next for Zod
i18next.init({
  lng: "ja",
  resources: {
    ja: { zod: translation },
  },
});
z.setErrorMap(makeZodI18nMap({ t: i18next.t }));

// Hydrate the app
const hydrate = () => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
};

// Start mock server if configured, then hydrate
// MSW must be ready before any API calls are made
if (config.mockedApi) {
  startMockServer().then(hydrate);
} else {
  hydrate();
}
