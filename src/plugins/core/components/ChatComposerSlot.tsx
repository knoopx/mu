import { type JSX } from "react";
import { useAdwaita } from "adwaita-gpuix";
import { Composer, type ComposerProps } from "./composer/Composer";
import {
  ComposerAttachments,
  type ComposerAttachment,
} from "./composer/attachments";
import { AskComposer } from "../../interaction/components/AskComposer";
import type { AskRequest, AskResponse } from "../../interaction/types";

export interface ChatComposerSlotProps {
  gap: number;

  ask: {
    request: AskRequest | null;

    onAnswer: (response: AskResponse) => void;

    onCancel: () => void;
  };

  attachments: ComposerAttachment[];

  pasting: boolean;

  onRemoveAttachment: (id: string) => void;

  composer: ComposerProps;
}

export function ChatComposerSlot(props: ChatComposerSlotProps): JSX.Element {
  const t = useAdwaita();
  const { ask } = props;
  if (ask.request !== null)
    return (
      <AskComposer
        request={ask.request}
        onAnswer={ask.onAnswer}
        onCancel={ask.onCancel}
        style={{ marginTop: props.gap }}
      />
    );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.space.sm,
        marginTop: props.gap,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <ComposerAttachments
        attachments={props.attachments}
        busy={props.pasting}
        onRemove={props.onRemoveAttachment}
      />
      <Composer {...props.composer} />
    </div>
  );
}
