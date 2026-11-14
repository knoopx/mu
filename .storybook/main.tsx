import type { ReactNode } from "react";
import { useWindowSize } from "@gpuix/react";
import { AdwaitaProvider, TooltipProvider, useAdwaita } from "adwaita-gpuix";
import type { DecoratorFunction } from "storybook";
import { MuProvider } from "../src/theme";
import { ProjectSourceProvider } from "../src/plugins/core/components/ProjectSource";
import { RepoSourceProvider } from "../src/plugins/vcs/components/RepoSource";
import { useAdwaitaMuTheme } from "../src/plugins/core/lib/theme/adwaita";
import { STAGE_SOURCE } from "./fixtures/stage";
import { STAGE_REPO } from "./fixtures/repo";
import { stageTheme } from "./chrome/chat";

function Themed({ children }: { children: ReactNode }) {
  const theme = useAdwaitaMuTheme();
  return <MuProvider theme={theme}>{children}</MuProvider>;
}

function Window({ children }: { children: ReactNode }) {
  const t = useAdwaita();
  const size = useWindowSize();
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: t.color.surface.window,
      }}
    >
      <ProjectSourceProvider source={STAGE_SOURCE}>
        <RepoSourceProvider source={STAGE_REPO}>
          <Themed>{children}</Themed>
        </RepoSourceProvider>
      </ProjectSourceProvider>
    </div>
  );
}

export const decorators: DecoratorFunction[] = [
  (storyFn, context) => {
    const { scheme, accent } = stageTheme(context.parameters);
    return (
      <AdwaitaProvider scheme={scheme} accent={accent}>
        <TooltipProvider delayDuration={400}>
          <Window>{storyFn()}</Window>
        </TooltipProvider>
      </AdwaitaProvider>
    );
  },
];
