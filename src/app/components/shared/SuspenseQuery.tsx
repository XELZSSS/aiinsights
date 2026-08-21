import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "@/app/i18n";
import { ErrorBoundary } from "./ErrorBoundary";
import { Spinner } from "./Spinner";

interface SuspenseQueryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wraps async data components with a Suspense fallback and an error boundary.
 * The boundary is keyed by route so navigation resets any failed state.
 */
export function SuspenseQuery({ children, fallback }: SuspenseQueryProps) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} errorTitle={t("errorBoundaryTitle")} retryLabel={t("errorBoundaryRetry")}>
      <Suspense fallback={fallback ?? <Spinner />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
