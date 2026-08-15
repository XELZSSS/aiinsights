import { Suspense, Component, Fragment, memo, type ReactNode, type ErrorInfo } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { Button } from "../ui";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  errorTitle?: string;
  retryLabel?: string;
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = "ErrorBoundary";
  state: ErrorBoundaryState = { hasError: false, error: null, resetKey: 0 };
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  private handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };
  render() {
    if (this.state.hasError) {
      const title = this.props.errorTitle ?? "Error";
      const retry = this.props.retryLabel ?? "Retry";
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-2 p-4">
            <p className="text-sm font-bold text-destructive">{title}</p>
            <p className="text-xs text-text-secondary">{this.state.error?.message}</p>
            <Button variant="link" size="sm" onClick={this.handleRetry}>
              {retry}
            </Button>
          </div>
        )
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}

export const Spinner = memo(function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
});

interface SuspenseQueryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseQuery({ children, fallback }: SuspenseQueryProps) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} errorTitle={t("errorBoundaryTitle")} retryLabel={t("errorBoundaryRetry")}>
      <Suspense fallback={fallback ?? <Spinner />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
