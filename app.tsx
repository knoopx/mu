import { type ReactNode } from "react";
import { AdwaitaProvider, TooltipProvider, useAdwaita } from "adwaita-gpuix";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { render, useWindowSize } from "@gpuix/react";
import { MuProvider } from "./src/theme";
import { createWindowKeyHandler } from "./src/window/window";
import { chatProbe } from "./src/plugins/core/lib/agent/chatProbe";
import { useAdwaitaMuTheme } from "./src/plugins/core/lib/theme/adwaita";
import { useEffectiveTheme } from "./src/plugins/core/lib/theme/themeStore";
import { ChatApp } from "./src/plugins/core/screens/Chat";

const probeDir = process.env.MU_PROBE_DIR;
if (probeDir) {
  mkdirSync(probeDir, { recursive: true });
  const probeTimer = setInterval(() => {
    try {
      const promptPath = `${probeDir}/prompt.txt`;
      if (existsSync(promptPath)) {
        const content = readFileSync(promptPath, "utf8");
        unlinkSync(promptPath);
        chatProbe?.submit(content.trim());
      }

      const resumePath = `${probeDir}/resume.txt`;
      if (existsSync(resumePath)) {
        const sessionFile = readFileSync(resumePath, "utf8").trim();
        unlinkSync(resumePath);
        if (sessionFile) chatProbe?.resume(sessionFile);
      }
      const interruptPath = `${probeDir}/interrupt`;
      if (existsSync(interruptPath)) {
        unlinkSync(interruptPath);
        chatProbe?.interrupt();
      }
      const status = chatProbe
        ? { ...chatProbe.snapshot(), probe: true }
        : { probe: false };
      writeFileSync(`${probeDir}/status.json`, JSON.stringify(status));
    } catch {}
  }, 500);

  void probeTimer;
}

function ThemedRoot({ children }: { children: ReactNode }) {
  const theme = useAdwaitaMuTheme();
  return <MuProvider theme={theme}>{children}</MuProvider>;
}

function Shell() {
  const t = useAdwaita();
  const size = useWindowSize();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: size.width,
        height: size.height,
        backgroundColor: t.color.surface.window,
        borderWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexBasis: 0,
          minHeight: 0,
        }}
      >
        <ThemedRoot>
          <ChatApp />
        </ThemedRoot>
      </div>
    </div>
  );
}

function App() {
  const theme = useEffectiveTheme();
  return (
    <AdwaitaProvider scheme={theme.scheme} accent={theme.accent}>
      <TooltipProvider delayDuration={400}>
        <Shell />
      </TooltipProvider>
    </AdwaitaProvider>
  );
}

render(<App />, {
  title: "mu",
  width: 640,
  height: 1080,
  titlebarTransparent: true,
  windowBackground: "opaque",
  onKeyDown: createWindowKeyHandler(),
});
