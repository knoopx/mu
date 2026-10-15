import {
  createContext,
  createElement,
  useContext,
  type JSX,
  type ReactNode,
} from "react";

export interface MuTheme {
  appearance: "dark" | "light" | "nightsky";
  bg: string;
  panel: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  caret: string;
  danger: string;
  success: string;
  warning: string;
  fontSans: string;
  fontMono: string;
  radius: number;
  fontSize: number;
  lineHeight: number;
}

export const MuThemeContext = createContext<MuTheme | null>(null);

export interface MuProviderProps {
  theme: MuTheme;
  children: ReactNode;
}

export function MuProvider({ theme, children }: MuProviderProps): JSX.Element {
  return createElement(MuThemeContext.Provider, { value: theme }, children);
}

function useMu(): MuTheme | null {
  return useContext(MuThemeContext);
}
