import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type Ref,
} from "react";
import type { EventPayload } from "@gpuix/native";
import type { StyleDesc } from "@gpuix/react";
import { Spinner, T, useAdwaita } from "adwaita-gpuix";
import { mutedText } from "../lib/ui/theme";
import { STATE_GLYPH } from "../lib/ui/tokens";

export interface CancellableLoaderHandle {
  readonly signal: AbortSignal;
  readonly aborted: boolean;
  cancel(): void;
}

export interface CancellableLoaderProps {
  message?: string;
  active?: boolean;
  onAbort?: () => void;
  ref?: Ref<CancellableLoaderHandle>;
  style?: Partial<StyleDesc>;
}

export function CancellableLoader(props: CancellableLoaderProps): JSX.Element {
  const t = useAdwaita();
  const controllerRef = useRef<AbortController | undefined>(undefined);
  useLayoutEffect(() => {
    if (!controllerRef.current) controllerRef.current = new AbortController();
  });
  const [aborted, setAborted] = useState(false);
  const onAbortedFired = useRef(false);

  useImperativeHandle(
    props.ref,
    () => ({
      get signal() {
        return controllerRef.current!.signal;
      },
      get aborted() {
        return controllerRef.current?.signal.aborted ?? false;
      },
      cancel: () => controllerRef.current?.abort(),
    }),
    [],
  );

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    const onAbort = () => setAborted(true);
    ctrl.signal.addEventListener("abort", onAbort);
    return () => ctrl.signal.removeEventListener("abort", onAbort);
  }, []);

  useEffect(() => {
    if (aborted && !onAbortedFired.current) {
      onAbortedFired.current = true;
      props.onAbort?.();
    }
  }, [aborted, props.onAbort]);

  const onKeyDown = (event: EventPayload) => {
    if ((event.key ?? "").toLowerCase() === "escape")
      controllerRef.current?.abort();
  };

  const style: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    ...props.style,
  };
  const running = props.active !== false && !aborted;
  return (
    <div style={style} tabIndex={0} onKeyDown={onKeyDown}>
      {running ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: t.space.sm,
            flexShrink: 0,
          }}
        >
          <Spinner size={STATE_GLYPH} label={false} />
          <T size="caption" color={mutedText(t)}>
            {props.message ?? "Loading…"}
          </T>
        </div>
      ) : null}
    </div>
  );
}
