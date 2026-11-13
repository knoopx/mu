/**
 * A thread, drawn as a thread.
 *
 * An issue's comments are people talking in order, so they wear the kit's own
 * message parts: the avatar of whoever wrote it, their login, when they wrote it,
 * and what they said. A list of strings with an author column would say the same
 * facts and look like a spreadsheet.
 *
 * What each row carries is what the call fetched: the login, the first line of the
 * comment, and when it landed. The whole text of every reply is the model's to
 * read, not the log's to print.
 */

import type { JSX } from "react";
import { Avatar, Row, T, useAdwaita } from "adwaita-gpuix";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "adwaita-gpuix/ai";

import { emphasisWeight, figureGap } from "../../core/lib/ui/tokens";
import { mutedText } from "../../core/lib/ui/theme";
import { humanDated } from "../lib/format";
import type { GithubRow } from "../types";

export function Thread({ rows }: { rows: GithubRow[] }): JSX.Element | null {
  const t = useAdwaita();
  const comments = rows.filter((row) => row.name !== "");
  if (comments.length === 0) return null;

  return (
    <MessageGroup style={{ width: "100%", minWidth: 0 }}>
      {comments.map((comment, index) => (
        <Message key={`${comment.name}-${String(index)}`}>
          <MessageAvatar>
            <Avatar name={comment.name} size={32} icon="person" />
          </MessageAvatar>
          <MessageContent>
            <Row gap={figureGap(t)} align="center">
              <T
                size="list"
                weight={emphasisWeight(t)}
                color={t.color.text.primary}
              >
                {comment.name}
              </T>
              {comment.figure === "" ? null : (
                <T size="micro" color={mutedText(t)}>
                  {humanDated(comment.figure)}
                </T>
              )}
            </Row>
            {comment.detail === "" ? null : (
              <T size="body" color={t.color.text.secondary}>
                {comment.detail}
              </T>
            )}
          </MessageContent>
        </Message>
      ))}
    </MessageGroup>
  );
}
