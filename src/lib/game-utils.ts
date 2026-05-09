export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 200);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// SEO Keywords Library - High traffic keywords for international market
export const SEO_KEYWORDS = {
  core: [
    'AAA game guide',
    'single player walkthrough',
    'complete collectibles guide',
    'boss fight tutorial',
    'hidden ending unlock',
    'best builds guide',
    'pro tips and tricks',
    'game walkthrough',
  ],
  highConversion: [
    'Elden Ring complete guide',
    'Baldur\'s Gate 3 Honour Mode',
    'Sekiro no hit run',
    'Cyberpunk 2077 hidden quests',
    'God of War Ragnarok all side quests',
    'Steam top single player guide',
    'Final Fantasy XVI boss strategies',
    'Diablo IV seasonal builds',
    'Resident Evil 4 S+ rank',
    'Zelda Tears of the Kingdom shrines',
  ],
} as const;

// Guide type templates for AI generation
export const GUIDE_TYPES = [
  { type: 'boss', label: 'Boss Guide', icon: '⚔️', keywords: ['boss strategy', 'boss fight', 'how to defeat', 'attack patterns', 'phase breakdown'] },
  { type: 'build', label: 'Build Guide', keywords: ['best build', 'optimal build', 'class guide', 'loadout', 'stat allocation'] },
  { type: 'collectible', label: 'Collectible Guide', keywords: ['all collectibles', 'location guide', 'hidden items', 'complete map', 'find all'] },
  { type: 'walkthrough', label: 'Walkthrough', keywords: ['walkthrough', 'step by step', 'complete guide', 'story guide', 'mission guide'] },
  { type: 'tips', label: 'Tips & Tricks', keywords: ['pro tips', 'tips and tricks', 'advanced guide', 'expert tips', 'beginner mistakes'] },
] as const;

export type GuideType = (typeof GUIDE_TYPES)[number]['type'];

export const GAME_TOPICS: Record<string, string[]> = {
  'elden-ring': [
    'Boss strategies and attack patterns',
    'Optimal build guides for each playstyle',
    'Hidden dungeons and secret areas',
    'Weapon tier list and upgrade paths',
    'Talismans and their best combinations',
    'Spirit Ashes ranking and usage guide',
    'Map fragment locations and exploration tips',
    'PvP meta builds and invasion strategies',
    'DLC Shadow of the Erdtree boss guides',
    'Malenia no-hit strategy breakdown',
  ],
  'baldurs-gate-3': [
    'Honour Mode survival strategies',
    'Best class builds and multiclass combos',
    'Romance guide and companion quests',
    'Hidden quest walkthroughs',
    'Spell tier list and combos',
    'Honour Mode boss strategies with Legendary Actions',
    'Item duplication and gold farming',
    'Origin character unique dialogue options',
    'Sorcadin build optimization',
    'Patch 7 new content guide',
  ],
  'zelda-totk': [
    'Shrine solutions and locations',
    'Ultrahand building guide for vehicles',
    'All Sage abilities and how to unlock them',
    'Armor upgrade material locations',
    'Yiga Clan hideout infiltration guide',
    'Dragon farming routes and timings',
    'Master Sword acquisition guide',
    'Sky island exploration tips and tricks',
    'All 152 Shrine locations map',
    'Gleeok boss strategies',
  ],
  'final-fantasy-xvi': [
    'Eikon ability combos and synergy',
    'Chronolith Trial strategies',
    'Ultimaniac Mode tips',
    'Accessory tier list and best combinations',
    'Hidden side quests and rewards',
    'New Game+ exclusive content',
    'Boss rush mode strategies',
    'Ability point optimization guide',
    'DLC Rising Tide walkthrough',
    'Eikon combo chain guide',
  ],
  'god-of-war-ragnarok': [
    'Valkyrie boss strategies',
    'Runic attack tier list',
    'Armor set comparison and best builds',
    'Berserker Gravestone locations and strategies',
    'Yggdrasil Rift completion guide',
    'Hidden artifacts and lore collectibles',
    'Give Me God of War difficulty tips',
    'Weapon upgrade priority guide',
    'Valhalla DLC guide',
    'Shield rack combo guide',
  ],
  'starfield': [
    'Best ship builds and configurations',
    'Outpost building optimization',
    'Companion affinity and romance guide',
    'Best weapon mods and attachments',
    'Skill point allocation strategies',
    'NG+ and Unity ending explained',
    'Mission board efficient money making',
    'Planet surveying and resource guide',
    'Shattered Space DLC guide',
    'Starborn armor locations',
  ],
  'cyberpunk-2077-phantom-liberty': [
    'Phantom Liberty story branch guide',
    'Best cyberware builds for 2.0',
    'Relic skill tree optimization',
    'Dogtown secrets and hidden locations',
    'Airdrop farming strategies',
    'Iconic weapon locations and upgrades',
    'Netrunner build guide for 2.0',
    'Vehicle combat strategies',
    'Secret ending unlock guide',
    '2.2 update build guide',
  ],
  'resident-evil-4-remake': [
    'Professional S+ rank strategies',
    'Best weapon upgrades priority',
    'Treasure hunting complete guide',
    'Speedrun tips and tricks',
    'Mercenaries mode high score strategies',
    'Handgun-only challenge guide',
    'Knife-only boss strategies',
    'Unlockable costumes and bonus content',
    'Separate Ways DLC walkthrough',
    'Professional mode knife only guide',
  ],
  'diablo-iv': [
    'Seasonal build tier list',
    'Nightmare Dungeon strategies',
    'Uber boss summoning guide',
    'Best legendary aspects and codex',
    'PvP zone survival guide',
    'Gold farming and trading tips',
    'Helltide event optimization',
    'Paragon board guide for each class',
    'Vessel of Hatred expansion guide',
    'Season 7 best builds',
  ],
  'horizon-forbidden-west': [
    'Machine override guide and strategies',
    'Best weapon and coil combinations',
    'Cauldron walkthrough guides',
    'Relic Ruins puzzle solutions',
    'Arena challenge strategies',
    'NG+ Ultra Hard mode tips',
    'Mount acquisition and upgrade guide',
    'Skill tree optimization for each playstyle',
    'Burning Shores DLC guide',
    'All Tallneck locations',
  ],
};

// Trending topics - update these periodically based on search trends
export const TRENDING_TOPICS = [
  { gameSlug: 'elden-ring', topic: 'Shadow of the Erdtree DLC final boss strategy', priority: 10 },
  { gameSlug: 'baldurs-gate-3', topic: 'Patch 7 new evil endings guide', priority: 9 },
  { gameSlug: 'diablo-iv', topic: 'Season 7 best build tier list', priority: 9 },
  { gameSlug: 'final-fantasy-xvi', topic: 'Rising Tide DLC Eikon abilities guide', priority: 8 },
  { gameSlug: 'cyberpunk-2077-phantom-liberty', topic: '2.2 update best cyberware builds', priority: 8 },
  { gameSlug: 'god-of-war-ragnarok', topic: 'Valhalla DLC rogue-like progression guide', priority: 7 },
  { gameSlug: 'resident-evil-4-remake', topic: 'Separate Ways Professional S+ rank', priority: 7 },
  { gameSlug: 'starfield', topic: 'Shattered Space DLC walkthrough', priority: 6 },
];

export function getTrendingTopic(gameSlug: string): string | null {
  const topic = TRENDING_TOPICS.find(t => t.gameSlug === gameSlug);
  if (topic) return topic.topic;
  const topics = GAME_TOPICS[gameSlug];
  if (!topics || topics.length === 0) return null;
  return topics[Math.floor(Math.random() * topics.length)];
}

export function getRandomGuideType(): GuideType {
  return GUIDE_TYPES[Math.floor(Math.random() * GUIDE_TYPES.length)].type;
}
