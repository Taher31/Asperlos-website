import contact from '../data/contact.json';
import type { Lang } from '../i18n';

export type Channel = 'phone' | 'whatsapp' | 'telegram' | 'bale' | 'email' | 'linkedin';

export interface ChannelLink {
  channel: Channel;
  href: string;
  display: string;
}

const phoneDigits = contact.phone.replace(/\D/g, '');

/** Builds the link for one channel; `message` pre-fills the chat where the app supports it. */
export function channelLink(channel: Channel, message?: string): ChannelLink {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  switch (channel) {
    case 'phone':
      return { channel, href: `tel:${contact.phone}`, display: contact.phone };
    case 'whatsapp':
      return { channel, href: `https://wa.me/${phoneDigits}${text}`, display: contact.phone };
    case 'telegram':
      return { channel, href: `https://t.me/+${phoneDigits}${text}`, display: contact.phone };
    case 'bale':
      // Direct chat URL from Bale's public phone-number profile.
      return { channel, href: `https://web.bale.ai/+${phoneDigits}`, display: contact.phone };
    case 'email':
      return { channel, href: `mailto:${contact.email}`, display: contact.email };
    case 'linkedin':
      return { channel, href: contact.linkedin, display: 'Asperlos' };
  }
}

export const channelsFor = (lang: Lang) => contact.order[lang] as Channel[];

/** Messenger buttons offered next to a product, in order of relevance for the language. */
export const messengersFor = (lang: Lang): Channel[] => (lang === 'fa' ? ['whatsapp', 'bale'] : ['whatsapp', 'telegram']);

export const cityLocation = contact.city;
const cityQuery = encodeURIComponent(`${cityLocation.name}, Iran`);
export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${cityQuery}`;

// Show the city at city scale, since there is no public street address.
export const mapEmbedUrl = (lang: Lang) =>
  `https://www.google.com/maps?q=${cityQuery}&z=11&hl=${lang}&output=embed`;
