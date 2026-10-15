import { useCallback, useRef, useState } from "react";
import { formatSize } from "@earendil-works/pi-coding-agent";
import {
  attachmentOf,
  type ComposerAttachment,
} from "../components/composer/attachments";
import {
  readClipboardImage,
  readClipboardText,
} from "../lib/composer/clipboard";
import { errMsg } from "../lib/utils/errMsg";

export interface ClipboardEffects {
  attach(attachment: ComposerAttachment): void;
  appendText(text: string): void;
  notify(message: string, type?: "warning"): void;
  system(text: string): void;
}

export function useClipboardPaste(effects: ClipboardEffects): {
  paste(): void;
  pasting: boolean;
} {
  const [pasting, setPasting] = useState(false);
  const runningRef = useRef(false);
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  const paste = useCallback((): void => {
    if (runningRef.current === true) return;
    runningRef.current = true;
    setPasting(true);
    void (async () => {
      const events = effectsRef.current;
      try {
        const image = await readClipboardImage();
        if (image !== null) {
          events.attach(attachmentOf(image.data, image.mimeType));
          events.notify(
            `Image pasted · ${image.mimeType} · ${formatSize(image.data.length)}`,
          );
          return;
        }
        const text = await readClipboardText();
        if (text === null || text.trim().length === 0) {
          events.notify("Clipboard has no image to paste", "warning");
          return;
        }
        events.appendText(text);
      } catch (err: unknown) {
        events.system(`Paste failed: ${errMsg(err)}`);
      } finally {
        runningRef.current = false;
        setPasting(false);
      }
    })();
  }, []);

  return { paste, pasting };
}
