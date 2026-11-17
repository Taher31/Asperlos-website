import MarkdownIt from 'markdown-it';
import { journalImageName } from './journal-figures.mjs';

const markdown = new MarkdownIt();

/** @param {string} body */
export function journalBodyImageNames(body) {
  const names = new Set();
  for (const block of markdown.parse(body, {})) {
    for (const token of block.children ?? []) {
      if (token.type !== 'image') continue;
      const name = journalImageName(token.attrGet('src'));
      if (name) names.add(name);
    }
  }
  return names;
}
