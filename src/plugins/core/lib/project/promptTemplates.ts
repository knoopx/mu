import type { PromptTemplate } from "@earendil-works/pi-coding-agent";

export interface PromptPill {
  name: string;

  label: string;

  hint: string;

  description: string;

  invocation: string;
}

export function pillInvocation(template: PromptTemplate): string {
  return `/${template.name} `;
}

export function pillsFromTemplates(
  templates: readonly PromptTemplate[],
): PromptPill[] {
  const seen = new Set<string>();
  const pills: PromptPill[] = [];
  for (const template of templates) {
    const name = template.name.trim();
    if (name.length === 0 || seen.has(name)) continue;
    seen.add(name);
    const hint = (template.argumentHint ?? "").trim();
    pills.push({
      name,
      label: name,
      hint,
      description: (template.description ?? "").trim(),
      invocation: pillInvocation(template),
    });
  }
  pills.sort((a, b) => a.name.localeCompare(b.name));
  return pills;
}
