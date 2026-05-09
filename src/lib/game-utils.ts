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

export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'generated':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'reviewed':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'published':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

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
  ],
};
