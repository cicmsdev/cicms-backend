import { readFileSync } from 'fs';
import { join } from 'path';

export function renderTemplate(
  filename: string,
  variables: Record<string, string | number>,
) {
  const filePath = join(__dirname, 'templates', filename); // Be sure templates are copied to dist
  let content = readFileSync(filePath, 'utf8');

  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  return content;
}