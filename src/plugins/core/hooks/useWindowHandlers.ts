import { useEffect, useRef } from "react";
import {
  setNewSessionHandler,
  setNewWindowHandler,
} from "../../../window/window";

export function useWindowHandlers(handlers: {
  newSession?: () => void;
  newWindow?: () => void;
}): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    setNewSessionHandler(() => ref.current.newSession?.());
    setNewWindowHandler(() => ref.current.newWindow?.());
    return () => {
      setNewSessionHandler(undefined);
      setNewWindowHandler(undefined);
    };
  }, []);
}
