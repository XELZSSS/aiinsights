import { createContext, useContext, type ReactNode } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export const MOBILE_BREAKPOINT = 768;

interface DeviceContextValue {
  isMobile: boolean;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  return <DeviceContext.Provider value={{ isMobile }}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  const localIsMobile = useIsMobile(MOBILE_BREAKPOINT);
  return { isMobile: ctx ? ctx.isMobile : localIsMobile };
}