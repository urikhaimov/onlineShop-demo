// libs/email-templates/src/index.ts

// 1) Subjects (named exports)
export { Subjects, subjectFor } from './subjects';

// 2) Renderer facade: guarantee a named `render(...)` no matter renderer shape
import * as Renderer from './renderer';
import * as subjectsNS from './subjects';

type RenderResult = { html: string; text?: string };

export async function render(
  templateName: string,
  vars: any,
): Promise<RenderResult> {
  const r: any = Renderer;

  if (typeof r.render === 'function') return r.render(templateName, vars);
  if (typeof r.renderTemplate === 'function')
    return r.renderTemplate(templateName, vars);
  if (typeof r.default === 'function') return r.default(templateName, vars);
  if (typeof r.compile === 'function') return r.compile(templateName, vars);

  throw new Error("email-templates: No render function found in './renderer'");
}

// Optional namespaces so other code can use `renderer.render` / `subjects.subjectFor`
export const renderer = Renderer;
export const subjects = subjectsNS;

// 3) Optional: default export for broader interop (harmless)
export default { render, subjects, renderer };
