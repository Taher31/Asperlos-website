import contact from '../data/contact.json';
import type { Lang } from '../i18n';

export type Channel = 'phone' | 'whatsapp' | 'telegram' | 'bale' | 'eitaa' | 'email' | 'linkedin';

export interface ChannelLink {
  channel: Channel;
  /** null when the detail is not confirmed yet */
  href: string | null;
  /** what the visitor sees next to the label, e.g. the number or username */
  display: string | null;
}

const digits = (s: string) => s.replace(/[^\d]/g, '');

/** Builds the link for one channel; `message` pre-fills the chat where the app supports it. */
export function channelLink(channel: Channel, message?: string): ChannelLink {
  const value = contact[channel] as string | null;
  if (!value) return { channel, href: null, display: null };
  const text = message ? encodeURIComponent(message) : '';
  switch (channel) {
    case 'phone':
      return { channel, href: `tel:+${digits(value)}`, display: value };
    case 'whatsapp':
      return { channel, href: `https://wa.me/${digits(value)}${text ? `?text=${text}` : ''}`, display: value };
    case 'telegram':
      return { channel, href: `https://t.me/${value}${text ? `?text=${text}` : ''}`, display: `@${value}` };
    case 'bale':
      return { channel, href: `https://ble.ir/${value}`, display: `@${value}` };
    case 'eitaa':
      return { channel, href: `https://eitaa.com/${value}`, display: `@${value}` };
    case 'email':
      return { channel, href: `mailto:${value}`, display: value };
    case 'linkedin':
      return { channel, href: value, display: value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') };
  }
}

export const channelsFor = (lang: Lang) => contact.order[lang] as Channel[];

/** Messenger buttons offered next to a product, in order of relevance for the language. */
export const messengersFor = (lang: Lang): Channel[] => (lang === 'fa' ? ['whatsapp', 'bale'] : ['whatsapp', 'telegram']);

export const mapUrl = contact.mapUrl as string | null;
