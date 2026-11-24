export function serializeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

export function breadcrumbSchema(site: URL, trail: { href: string; label: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(({ href, label }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: label,
      item: new URL(href, site).href,
    })),
  };
}
