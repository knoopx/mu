import { useCallback, useEffect, useRef } from "react";
import { readFilePreview } from "../lib/files/filePreview";
import type { ComposerPreviewSpec } from "../components/composer/Composer";

export function useFilePreview(
  cwd: string,
): (path: string) => ComposerPreviewSpec {
  const cacheRef = useRef<{ path: string; spec: ComposerPreviewSpec } | null>(
    null,
  );

  useEffect(() => {
    cacheRef.current = null;
  }, [cwd]);

  return useCallback(
    (path: string): ComposerPreviewSpec => {
      if (cacheRef.current?.path === path) return cacheRef.current.spec;
      const spec = readFilePreview(cwd, path);
      cacheRef.current = { path, spec };
      return spec;
    },
    [cwd],
  );
}
