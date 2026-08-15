import { Suspense, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "./i18n";
import { AppShell } from "./components/layout";
import { Spinner } from "./components/feedback/SuspenseQuery";
import { AppRoutes } from "./routes";
import { STORAGE_KEYS } from "../shared/config";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 5 * 60_000, gcTime: 30 * 60_000 } },
});

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

let cacheMigrated = false;

function migrateCacheVersion() {
  if (cacheMigrated) return;
  cacheMigrated = true;

  if (readStorageJson<string>(STORAGE_KEYS.cacheVersion, "") === "1") return;

  if (typeof caches !== "undefined") {
    caches
      .keys()
      .then((keys) => {
        if (keys.length === 0) return;
        return Promise.all(keys.map((k) => caches.delete(k)));
      })
      .catch((e) => console.error("Cache cleanup failed", e));
  }
  writeStorage(STORAGE_KEYS.cacheVersion, "1");
}

function useAppStartup() {
  useEffect(() => {
    migrateCacheVersion();
  }, []);
}

export function App() {
  useAppStartup();

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell>
            <Suspense fallback={<Spinner />}>
              <AppRoutes />
            </Suspense>
          </AppShell>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}
