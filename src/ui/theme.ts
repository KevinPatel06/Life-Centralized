// Theme tokens: spec §5 tables plus the values the approved mockup derives from them.
import type { Background, BlockId, CardColor, PlanKind, Settings, Tag } from '../domain/types';

type CatKey = 'trade' | 'love' | 'free' | 'wind' | 'work' | 'warm';

interface BackgroundTokens {
  bg: string;
  onBg: string;
  onBgMuted: string;
  bgLine: string;
  doneLine: string;
  doneCheck: string;
  bubbleBg: string;
  bubbleInk: string;
  dark: boolean;
}

interface CardTokens {
  card: string;
  ink: string;
  muted: string;
  line: string;
  nowBg: string;
  nowRing: string;
  nowKicker: string;
  icBg: string;
  taskBg: string;
  fieldBg: string;
  cat: Record<CatKey, string>;
  chipNowBg: string;
  chipNowInk: string;
  chipSomeBg: string;
  chipSomeInk: string;
  chipRtBg: string;
  chipRtInk: string;
  pillBg: string;
  pillInk: string;
  pillMuted: string;
  miniTrack: string;
  tick: string;
  tickOn: string;
  tickMark: string;
  tabBg: string;
  tabInk: string;
  tabOn: string;
  fabBg: string;
  fabInk: string;
}

export interface Theme extends BackgroundTokens, CardTokens {
  /** Rings and selected states. */
  accent: string;
  nowChip: string;
  nowChipInk: string;
}

const LIGHT = { doneCheck: '#3F7A55', bubbleBg: '#2B2219', bubbleInk: '#F7F0E3', dark: false };
const DARK = { doneCheck: '#8FD9AE', bubbleBg: '#F4F1EA', bubbleInk: '#1F1A16', dark: true };

const BG: Record<Background, BackgroundTokens> = {
  linen: { bg: '#F8F4ED', onBg: '#2A241D', onBgMuted: '#6A6052', bgLine: '#E0D6C5', doneLine: '#D2C6B2', ...LIGHT },
  beige: { bg: '#EEE5D5', onBg: '#2B2219', onBgMuted: '#685944', bgLine: '#D1C1A4', doneLine: '#C4B397', ...LIGHT },
  oat: { bg: '#E2D5BF', onBg: '#2B2219', onBgMuted: '#5B4C38', bgLine: '#C8B798', doneLine: '#B7A381', ...LIGHT },
  charcoal: { bg: '#1D1E1C', onBg: '#EFEFEA', onBgMuted: '#ABACA4', bgLine: '#363833', doneLine: '#474943', ...DARK },
};

const CARD: Record<CardColor, CardTokens> = {
  sage: {
    card: '#DCE6D5', ink: '#1F2A20', muted: '#4D5C4D', line: '#C6D3BE',
    nowBg: '#CCDCC2', nowRing: '#47705A', nowKicker: '#2E5540',
    icBg: '#EEF3EA', taskBg: '#F1F5EE', fieldBg: '#EEF3EA',
    cat: { trade: '#2F5FCF', love: '#B92E64', free: '#2F7A50', wind: '#6248C2', work: '#66707C', warm: '#A86400' },
    chipNowBg: '#F2B04A', chipNowInk: '#2A1C00', chipSomeBg: '#E6ECE1', chipSomeInk: '#4D5C4D', chipRtBg: '#D5EBDD', chipRtInk: '#1F5A38',
    pillBg: '#DCE6D5', pillInk: '#1F2A20', pillMuted: '#4D5C4D', miniTrack: '#C6D3BE',
    tick: '#6F806F', tickOn: '#2F7A50', tickMark: '#FFFFFF',
    tabBg: '#DCE6D5', tabInk: '#4D5C4D', tabOn: '#1F2A20', fabBg: '#2B2219', fabInk: '#F7F0E3',
  },
  cocoa: {
    card: '#3A2E28', ink: '#F6EDE1', muted: '#CDBBA8', line: '#4D3F37',
    nowBg: '#46372F', nowRing: '#9C5420', nowKicker: '#F2C08A',
    icBg: '#52423A', taskBg: '#3A2E28', fieldBg: '#2A211C',
    cat: { trade: '#8FB0FF', love: '#FF9CBF', free: '#7FD9A8', wind: '#C7B2FF', work: '#B9A897', warm: '#F2B866' },
    chipNowBg: '#F2B04A', chipNowInk: '#2A1C00', chipSomeBg: '#4D3F37', chipSomeInk: '#CDBBA8', chipRtBg: '#2F4A3A', chipRtInk: '#A6E8C2',
    pillBg: '#3A2E28', pillInk: '#F6EDE1', pillMuted: '#CDBBA8', miniTrack: '#4D3F37',
    tick: '#B9A897', tickOn: '#7FD9A8', tickMark: '#2A1F1A',
    tabBg: '#3A2E28', tabInk: '#CDBBA8', tabOn: '#FFFFFF', fabBg: '#F2B866', fabInk: '#2A1F1A',
  },
};

/** Cocoa cards sit a shade lighter on Charcoal so they stay visible. */
const CHARCOAL_COCOA: Partial<CardTokens> = { card: '#43352D', pillBg: '#43352D', tabBg: '#43352D', taskBg: '#43352D', nowBg: '#4F3F35' };

export const BACKGROUNDS: { id: Background; name: string; swatch: string }[] = [
  { id: 'linen', name: 'Linen', swatch: BG.linen.bg },
  { id: 'beige', name: 'Beige', swatch: BG.beige.bg },
  { id: 'oat', name: 'Oat', swatch: BG.oat.bg },
  { id: 'charcoal', name: 'Charcoal', swatch: BG.charcoal.bg },
];

export const CARDS: { id: CardColor; name: string; swatch: string; accent: string }[] = [
  { id: 'sage', name: 'Sage', swatch: CARD.sage.card, accent: CARD.sage.nowRing },
  { id: 'cocoa', name: 'Cocoa', swatch: CARD.cocoa.card, accent: CARD.cocoa.nowRing },
];

export function resolveTheme(settings: Settings, scheme: 'light' | 'dark' | null | undefined): Theme {
  const background = settings.charcoalInDark && scheme === 'dark' ? 'charcoal' : settings.background;
  const cards = {
    ...CARD[settings.cards],
    ...(background === 'charcoal' && settings.cards === 'cocoa' ? CHARCOAL_COCOA : {}),
  };
  return { ...BG[background], ...cards, accent: cards.nowRing, nowChip: '#F2B04A', nowChipInk: '#2A1C00' };
}

export const TAG_COLOR: Record<Tag, CatKey> = { trading: 'trade', health: 'love', projects: 'wind', life: 'free' };
export const BLOCK_COLOR: Record<BlockId, CatKey> = { morning: 'free', afternoon: 'work', evening: 'trade', winddown: 'wind' };
export const PLAN_COLOR: Record<PlanKind, CatKey> = { lunch: 'warm', dinner: 'warm', hangout: 'free', other: 'trade' };
