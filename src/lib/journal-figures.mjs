/** @param {unknown} src */
export function journalImageName(src) {
  if (typeof src !== 'string') return undefined;
  return /^\/journal-media\/([a-z0-9][a-z0-9-]*\.(?:jpe?g|png|webp))$/.exec(src)?.[1];
}

/** @type {NonNullable<import('@astrojs/markdown-satteri').SatteriProcessorOptions['hastPlugins']>[number]} */
export const journalFigures = {
  name: 'journal-figures',
  element: {
    filter: ['p'],
    visit(node, context) {
      if (node.children.length !== 1) return;
      const [image] = node.children;
      if (image.type !== 'element' || image.tagName !== 'img' || !journalImageName(image.properties.src)) return;
      const { title, ...properties } = image.properties;
      const children = [{ ...image, properties: { ...properties, loading: 'lazy', decoding: 'async' } }];
      context.replaceNode(node, {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['journal-figure'] },
        children: [
          ...children,
          ...(typeof title === 'string' && title.trim() ? [{
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: title }],
          }] : []),
        ],
      });
    },
  },
};
