import { Suspense } from "react";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/app/i18n";
import { DeviceProvider } from "@/app/device";
import { AppShell } from "@/app/components/layout";
import { Spinner } from "@/app/components/shared";
import { AppRoutes } from "@/app/routes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 5 * 60_000, gcTime: 30 * 60_000 } },
});

export function App() {
  return (
    <I18nProvider>
      <DeviceProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppShell>
              <Suspense fallback={<Spinner />}>
                <AppRoutes />
              </Suspense>
            </AppShell>
          </BrowserRouter>
        </QueryClientProvider>
      </DeviceProvider>
    </I18nProvider>
  );
}
