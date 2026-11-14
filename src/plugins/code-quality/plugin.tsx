/**
 * code-quality — six reads over one analyser.
 *
 * The header says the scope and nothing else; the counts belong to the row's own
 * summary line, which is why the preview and the body are registered together.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { codeComplexityTool } from "./tools/codeComplexity";
import { codeDeadCodeTool } from "./tools/codeDeadCode";
import { codeDuplicatesTool } from "./tools/codeDuplicates";
import { codeReviewTool } from "./tools/codeReview";
import { codeSymbolInspectTool } from "./tools/codeSymbolInspect";
import { codeSymbolReferencesTool } from "./tools/codeSymbolReferences";
import {
  isCodeQualityTool,
  QualityToolRows,
  qualityChipsOf,
  qualityToolPreviewOf,
} from "./components/QualityToolRows";

export const codeQualityPlugin = definePlugin(
  "code-quality",
  {
    title: "Code quality",
    summary:
      "Six reads of the project itself: complexity, dead code, clones, a file's surface, a symbol's callers.",
    icon: "analytics",
    category: "project",
  },
  (app) => {
    app.tools.register(
      codeComplexityTool,
      codeDeadCodeTool,
      codeDuplicatesTool,
      codeReviewTool,
      codeSymbolInspectTool,
      codeSymbolReferencesTool,
    );

    app.log.rows({
      key: "code-quality",
      owns: isCodeQualityTool,
      body: (item) => <QualityToolRows item={item} />,
      preview: qualityToolPreviewOf,
      chips: qualityChipsOf,
    });
  },
);
