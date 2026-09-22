import type { Template } from '../types/api';

export function filterTemplatesByTag(templates: Template[], tag: string): Template[] {
  if (tag === 'all') return templates;
  return templates.filter((tpl) => tpl.tags.includes(tag));
}
