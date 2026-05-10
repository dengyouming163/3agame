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

// ========================================
// SEO KEYWORDS LIBRARY
// User-provided keywords mapped for EN content
// ========================================
export const SEO_KEYWORDS = {
  // High traffic core keywords
  core: [
    'AAA game guide',
    'single player walkthrough',
    'complete collectibles guide',
    'boss fight tutorial',
    'hidden ending unlock',
    'best builds guide',
    'pro tips and tricks',
    'game walkthrough',
    'complete guide',
    'strategy guide',
  ],
  // High-conversion long-tail keywords (from user's list)
  highConversion: [
    'Elden Ring complete guide all collectibles',
    'Elden Ring DLC boss strategies',
    'Sekiro no hit run guide',
    'Cyberpunk 2077 hidden quests walkthrough',
    'God of War Ragnarok all side quests guide',
    'Steam top single player guide',
    'Final Fantasy XVI boss strategies',
    'Diablo IV seasonal builds tier list',
    'Resident Evil 4 S+ rank guide',
    'Zelda Tears of the Kingdom all shrines',
    'Black Myth Wukong complete walkthrough',
    'Black Myth Wukong all boss guides',
    'Elden Ring Shadow of the Erdtree guide',
    'Baldurs Gate 3 Honour Mode builds',
  ],
  // SEO title patterns that drive CTR
  titlePatterns: [
    '{Game} {Topic} Guide: Everything You Need to Know',
    '{Game} {Topic} - Complete Strategy Guide (2025)',
    'How to {Action} in {Game} - Expert Tips & Strategy',
    '{Game}: All {Collectible} Locations & Guide',
    '{Game} {Boss} Boss Guide - How to Defeat & Rewards',
    'Best {Game} {BuildType} Build - Meta Guide (2025)',
    '{Game} {Topic} Walkthrough - Step by Step Guide',
    '{Game} Hidden {Secrets} - Complete Guide',
  ],
} as const;

// ========================================
// GUIDE TYPE TEMPLATES
// 5 content types for AI generation
// ========================================
export const GUIDE_TYPES = [
  {
    type: 'boss',
    label: 'Boss Guide',
    icon: '⚔️',
    description: 'Detailed boss strategies, attack patterns, phase breakdowns',
    keywords: ['boss strategy', 'boss fight', 'how to defeat', 'attack patterns', 'phase breakdown', 'boss tips', 'no damage'],
    promptSuffix: `STRUCTURE: Boss overview → Recommended loadout/setup → Phase-by-phase breakdown → Attack pattern analysis → Punish windows → "Common Mistakes" → TL;DR quick reference table. Include specific HP values, damage numbers, and timing windows.`,
  },
  {
    type: 'build',
    label: 'Build Guide',
    icon: '🛡️',
    description: 'Optimal character builds, stat allocation, loadout optimization',
    keywords: ['best build', 'optimal build', 'class guide', 'loadout', 'stat allocation', 'meta build', 'tier list'],
    promptSuffix: `STRUCTURE: Build overview → Core concept → Stat allocation table → Equipment/gear list → Skill tree path → Synergy explanation → Variations & alternatives → "When to use / when to skip" verdict → TL;DR summary. Include exact numbers for stats, DPS comparisons, and tier rankings.`,
  },
  {
    type: 'collectible',
    label: 'Collectible Guide',
    icon: '🗺️',
    description: 'All collectibles, hidden items, location guides',
    keywords: ['all collectibles', 'location guide', 'hidden items', 'complete map', 'find all', 'all locations', 'checklist'],
    promptSuffix: `STRUCTURE: Overview with total count → Region-by-region breakdown → Each item with location description → Map references → Checklist table → Missable items warning → Rewards for completion → TL;DR summary. Format as a numbered checklist the reader can follow.`,
  },
  {
    type: 'walkthrough',
    label: 'Walkthrough',
    icon: '📖',
    description: 'Step-by-step story/mission walkthroughs',
    keywords: ['walkthrough', 'step by step', 'complete guide', 'story guide', 'mission guide', 'chapter guide', 'progression'],
    promptSuffix: `STRUCTURE: Chapter/area overview → Step-by-step progression → Key decision points & consequences → Boss encounters summary → Notable loot along the way → Side content available → "What to do before proceeding" checklist → TL;DR. Write as a clear sequence the reader can follow without getting lost.`,
  },
  {
    type: 'tips',
    label: 'Tips & Tricks',
    icon: '💡',
    description: 'Pro tips, advanced strategies, common mistakes to avoid',
    keywords: ['pro tips', 'tips and tricks', 'advanced guide', 'expert tips', 'beginner mistakes', 'things I wish I knew', 'hidden mechanics'],
    promptSuffix: `STRUCTURE: "Things I Wish I Knew Earlier" hook → Categorized tips (Combat/Exploration/Builds/Economy) → Each tip with "Why it matters" explanation → Common mistakes section → Advanced tricks → New player priority checklist → TL;DR. Make every tip immediately actionable with specific examples.`,
  },
] as const;

export type GuideType = (typeof GUIDE_TYPES)[number]['type'];

// ========================================
// P0: GAME TIER LIST
// Prioritize high-traffic games for content generation
// Based on Google Trends search volume for game guides
// ========================================
export const GAME_TIER_LIST = {
  // Tier 1: Highest search volume, generate 2 articles/day
  tier1: [
    'elden-ring',
    'elden-ring-shadow-of-the-erdtree',
    'black-myth-wukong',
    'baldurs-gate-3',
    'diablo-iv',
    'zelda-totk',
  ],
  // Tier 2: Solid search volume, generate 1 article/day (rotated, 3 per day)
  tier2: [
    'cyberpunk-2077-phantom-liberty',
    'god-of-war-ragnarok',
    'resident-evil-4-remake',
    'final-fantasy-vii-rebirth',
    'helldivers-2',
    'starfield',
    'stellar-blade',
    'dragons-dogma-2',
    'metaphor-refantazio',
    'silent-hill-2-remake',
  ],
  // Tier 3: Everything else - skipped in daily auto-generation
  // Can still be generated manually via admin
} as const;

// ========================================
// GAME TOPICS DATABASE
// Per-game topic suggestions organized by guide type
// ========================================
export const GAME_TOPICS: Record<string, Record<GuideType, string[]>> = {
  'elden-ring': {
    boss: [
      'Malenia, Blade of Miquella - No Hit Strategy',
      'Radahn Festival Boss - Phase Breakdown',
      'Mohg, Lord of Blood - How to Survive the Nihil',
      'Dragonlord Placidusax - Hidden Boss Guide',
      'Maliketh the Black Blade - Attack Patterns & Punish',
      'Fire Giant - All Phase Transitions Explained',
      'Margit/Morgott - Early Game Gate Boss Strategy',
      'Lichdragon Fortissax - Deathblight Counter Guide',
      'DLC: Messmer the Impaler Boss Strategy',
      'DLC: Final Boss Shadow of the Erdtree Guide',
    ],
    build: [
      'Bleed Build - Maximum DPS with Seppuku',
      'Intelligence Sorcerer Build - One-Shot Bosses',
      'Strength Colossal Weapon Build - Stagger Everything',
      'Arcane Dragon Communion Build',
      'Faith Lightning Spear Build - Safe & Powerful',
      'Dexterity Katana Build - Bleed & Frost Combo',
      'Arcane Bleed Build - Rivers of Blood Alternative',
      'Quality Build for Weapon Variety',
      'PvP Invasion Meta Build (2025)',
      'Level 1 Run Stat & Gear Guide',
    ],
    collectible: [
      'All Talisman Locations & Effects',
      'All Spirit Ash Locations Ranked',
      'All Smithing Stone Bell Bearing Locations',
      'All Dragon Heart Locations',
      'All Great Rune Locations & Activation Guide',
      'All Map Fragment Locations',
      'All Legendary Armaments Checklist',
      'All Cookbooks & Crafting Recipes',
      'DLC: All Scadutree Fragment Locations',
      'All Hidden Dungeon Locations',
    ],
    walkthrough: [
      'Stormveil Castle - Complete Walkthrough',
      'Raya Lucaria Academy - All Paths & Secrets',
      'Leyndell Royal Capital - Full Exploration Guide',
      'Mountaintops of the Giants - Story Progression',
      'Caelid - Surviving the Scarlet Rot Zone',
      'DLC: Shadow of the Erdtree Starting Guide',
      'Fia Questline - Complete Steps & Deathbed Dress',
      'Ranni the Witch Questline - Age of Stars Ending',
      'Volcano Manor Questline - All Assignments',
      'Siofra River & Nokron Underground Guide',
    ],
    tips: [
      '15 Things I Wish I Knew Before Starting Elden Ring',
      'Hidden Mechanics the Game Never Explains',
      'How to Break the Game Early - Overpowered Strategies',
      'Stat Soft Caps & Breakpoints You Need to Know',
      'Most Common Mistakes That Ruin Your Build',
      'Fast Travel Tricks & Shortcut Unlocks',
      'How to Farm Runes Efficiently at Every Stage',
      'Status Effect Stacking - How Bleed/Poison/Frost Actually Work',
      'Guard Counter & Stance Break - Combat System Deep Dive',
      'Advanced Movement & Dodge Techniques',
    ],
  },
  'baldurs-gate-3': {
    boss: [
      'Honour Mode Boss Strategies with Legendary Actions',
      'Cazador - How to Save Astarion & Win',
      'Raphael - House of Hope Boss Fight',
      'Orin the Red - Undercity Boss Strategy',
      'Ketheric Thorm - All Phases in Honour Mode',
      'Netherbrain - Final Boss Strategy',
      'Gortash - Coronation Fight Strategy',
      'The Avatar of Myrkul - Act 2 Boss',
    ],
    build: [
      'Sorcadin (Paladin 2 / Sorcerer 10) - Honour Mode King',
      'Fire Acuity Sorcerer - Maximum Spell DC',
      'Throwzerker Barbarian - Consistent Damage King',
      'Gloom Stalker Assassin Ranger - Alpha Strike Build',
      'Light Domain Cleric - Support & AoE Damage',
      'Swords Bard - Controller & Damage Hybrid',
      'Monk Way of the Open Hand - Stun Lock Build',
      'Necromancy Wizard - Army of the Dead',
    ],
    collectible: [
      'All Necromancy of Thay Pages Locations',
      'All Honour Mode Exclusive Items',
      'All Legendary Equipment Locations',
      'All Spell Scrolls & Where to Find Them',
      'All Companion Quest Items Checklist',
      'All Uncommon & Rare Alchemy Ingredients',
    ],
    walkthrough: [
      'Act 1 Complete Walkthrough - All Quests',
      'Act 2 Shadow-Cursed Lands - Full Guide',
      'Act 3 Baldurs Gate - All Story Paths',
      'Dark Urge Playthrough - All Unique Events',
      'Astarion Romance & Quest Complete Guide',
      'Karlach Story - All Endings & Choices',
      'How to Get Every Ending - All Choices That Matter',
      'Underdark & Grymforge - Full Exploration',
    ],
    tips: [
      '15 Things Honour Mode Taught Me the Hard Way',
      'Hidden Dialogue Options You Always Miss',
      'How to Break BG3 Economy - Infinite Gold',
      'Sneak Attack & Surprise Mechanics Explained',
      'Most Common Build Mistakes in Honour Mode',
      'Camp Supplies & Long Rest Optimization',
      'How Height Advantage Actually Works',
      'Shove & Throw - Underutilized Combat Tools',
    ],
  },
  'zelda-totk': {
    boss: [
      'Gleeok Boss Strategies - All Elements',
      'Phantom Ganon - How to Counterclone Attacks',
      'Demon King Ganondorf - Final Boss Guide',
      'Flux Construct - All Types & Weaknesses',
      'Mucktorok - Water Temple Boss Strategy',
      'Marbled Gohma - Fire Temple Boss',
      'Queen Gibdo - Lightning Temple Strategy',
      'Colgera - Wind Temple Boss Guide',
    ],
    build: [
      'Best Weapon Fuse Combinations Ranked',
      'Best Armor Sets & Upgrade Priorities',
      'Best Vehicle Builds for Ultrahand',
      'Best Shield Fuse Effects for Combat',
      'Yiga Clan Armor & Stealth Build',
      'Maximum Damage Build - Silver Lynel Slayer',
    ],
    collectible: [
      'All 152 Shrine Locations & Solutions',
      'All Lightroot Locations in the Depths',
      'All Tower Locations & Unlock Guide',
      'All Sage Wills & How to Use Them',
      'All Yiga Clan Schematic Locations',
      'All Old Map & Treasure Chest Locations',
      'All Bubbul Gem Locations & Rewards',
      'All Schema Stone Locations',
    ],
    walkthrough: [
      'Wind Temple - Complete Walkthrough',
      'Fire Temple - All Floors & Switches',
      'Water Temple - Step by Step Guide',
      'Lightning Temple - Puzzle Solutions',
      'Spirit Temple - Construct Factory Guide',
      'Depths Exploration - Complete Guide',
      'Sky Islands - All Floating Archipelagos',
      'DLC: Tears of the Kingdom Extra Content',
    ],
    tips: [
      '20 Things Tears of the Kingdom Doesnt Tell You',
      'Ultrahand Building Tricks for Combat',
      'Fuse Combinations That Break the Game',
      'How to Farm Dragon Parts Efficiently',
      'Weapon Durability - Best Fuse to Extend Life',
      'Autobuild Schematics That Save Hours',
      'Most Common Mistakes New Players Make',
      'Infinite Arrow & Resource Glitches (Still Working)',
    ],
  },
  'final-fantasy-xvi': {
    boss: ['Chronolith Trial Strategies - All Eikon Challenges', 'Ultimaniac Mode Boss Rush Guide', 'DLC: Leviathan Boss Strategy', 'DLC: Omega Boss Strategy', 'S rank Notorious Marks Guide'],
    build: ['Best Eikon Ability Loadout Combinations', 'Stagger Optimization Build', 'DPS Maximization - Ability Chain Guide', 'DLC: New Eikon Abilities Tier List', 'New Game+ Best Accessories'],
    collectible: ['All Chronolith Trial Locations', 'All Notorious Mark Locations & Rewards', 'All Orchestrion Roll Locations', 'All Reinforcements Locations', 'DLC: All New Collectibles Checklist'],
    walkthrough: ['DLC: The Rising Tide Complete Walkthrough', 'DLC: Echoes of the Fallen Guide', 'New Game+ Changes & What Carries Over', 'All Side Quest Walkthrough', 'Hidden Quests & Secret Encounters'],
    tips: ['15 Pro Tips for S Rank Combat', 'Eikon Ability Synergies You Never Thought Of', 'Stagger Window Maximization - Frame Data', 'Most Wasted Ability Points & How to Fix', 'Zantetsuken Timing - Perfect Execution Guide'],
  },
  'god-of-war-ragnarok': {
    boss: ['Valkyrie Queen Gná - Give Me God of War Strategy', 'Berserker Gravestone Boss Strategies', 'DLC: Valhalla Final Boss Guide', 'Heimdall Boss Fight - How to Counter Read', 'Thor Boss Fight Phase Breakdown'],
    build: ['Best Runic Attack Combinations', 'Best Armor Sets Ranked', 'Max Cooldown Build for Runic Spam', 'Strength & Luck Build for Farming', 'DLC: Valhalla Best Relic Combinations'],
    collectible: ['All Berserker Gravestone Locations', 'All Raven Locations & Rewards', 'All Artifact Collectible Locations', 'All Yggdrasil Rift Locations', 'DLC: All Valhalla Collectibles'],
    walkthrough: ['DLC: Valhalla Rogue-like Progression Guide', 'The Path - Main Story Walkthrough', 'All Favor (Side Quest) Walkthrough', 'Vanaheim Crater - Complete Exploration', 'Muspelheim Trials Guide'],
    tips: ['15 Things God of War Ragnarok Doesnt Explain', 'Runic Attack Combo Chains That Devastate', 'Shield Technique Mastery - All Ranks', 'How to Farm Hacksilver Fast', 'Give Me God of War Survival Tips'],
  },
  'starfield': {
    boss: ['Starborn Guardian Boss Strategy', 'Terrormorph Boss Fights', 'DLC: Shattered Space Final Boss', 'Va\'ruun Zealot Elite Encounters', 'Ecliptic Mercenary Boss Strategies'],
    build: ['Best Ship Builds for Combat', 'Best Weapon Mods & Attachments', 'Outpost Building Optimization Guide', 'Stealth Sniper Build', 'Diplomat/Persuasion Build'],
    collectible: ['All Constellation Artifact Locations', 'All Power & Ability Locations', 'All Unique Weapon Locations', 'All Survey Data Checklist', 'DLC: All Shattered Space Collectibles'],
    walkthrough: ['DLC: Shattered Space Complete Walkthrough', 'Main Quest - All Factions & Endings', 'Constellation Storyline Full Guide', 'UC Vanguard Questline', 'Ryujin Industries Questline'],
    tips: ['20 Things Starfield Doesnt Tell You', 'How to Break the Economy - Infinite Credits', 'Ship Builder Tips for Maximum Efficiency', 'Outpost Resource Chain Optimization', 'NG+ Unity Explained - What Changes'],
  },
  'cyberpunk-2077-phantom-liberty': {
    boss: ['Kurt Hansen - Phantom Liberty Boss Strategy', 'Adam Smasher - How to Actually Beat Him', 'Cerberus Boss - Dogtown Arena', 'Phantom Liberty Final Mission Choices'],
    build: ['2.0 Best Cyberware Build Guide', 'Netrunner Build - Quickhack Dominance', 'Sandevistan Build - Time Manipulation', 'Gorilla Arms Melee Build', 'Stealth Hacker Hybrid Build'],
    collectible: ['All Iconic Weapon Locations', 'All Cyberpsycho Sighting Locations', 'All Tarot Card Locations', 'Phantom Liberty All Airdrop Locations', 'All Hidden Stash & Access Point Locations'],
    walkthrough: ['Phantom Liberty Full Story Walkthrough', 'All Phantom Liberty Endings Guide', 'Secret Ending Unlock Guide', 'All Side Job Walkthrough', 'Dogtown Secrets & Hidden Areas'],
    tips: ['15 Cyberpunk 2.0 Tips That Change Everything', 'Quickhack Stacking - How It Actually Works', 'Cyberware Capacity Optimization', 'Best Legendary Craft Recipes', 'Money Making Guide - Patch 2.2'],
  },
  'resident-evil-4-remake': {
    boss: ['Krauser Knife Fight Strategy', 'Salazar Boss Fight - Quick Kill', 'Verdugo - Easy S+ Strategy', 'DLC: Separate Ways Boss Rush', 'Professional S+ Rank Boss Strategies'],
    build: ['Best Weapon Upgrade Priority for S+', 'Handgun-Only Challenge Loadout', 'Speedrun Loadout Guide', 'Infinite Rocket Launcher Strategy', 'Best Attachments for Each Weapon'],
    collectible: ['All Treasure Locations & Combinations', 'All Clockwork Castellan Locations', 'All Blue Medallion Locations', 'All Merchant Request Locations', 'DLC: Separate Ways All Collectibles'],
    walkthrough: ['Professional S+ Rank Speedrun Guide', 'DLC: Separate Ways Complete Walkthrough', 'All Chapter Ranking Requirements', 'All Key Item Locations by Chapter', 'NG+ Differences & Unlockables'],
    tips: ['15 RE4 Remake Tips for Professional Mode', 'Parry Timing - Frame Perfect Guide', 'Knife Durability Management', 'Ammo Conservation Strategies', 'Speedrun Skip & Glitch Guide'],
  },
  'diablo-iv': {
    boss: ['Uber Boss Summoning & Strategy Guide', 'Duriel Boss Strategy', 'Andariel Boss Strategy', 'Lilith Boss Strategy', 'Seasonal Boss Mechanics Guide'],
    build: ['Season 7 Best Build Tier List', 'Barbarian Best Builds (Season 7)', 'Sorcerer Best Builds (Season 7)', 'Necromancer Best Builds (Season 7)', 'Rogue Best Builds (Season 7)', 'Druid Best Builds (Season 7)', 'Spiritborn Best Builds (Season 7)'],
    collectible: ['All Altar of Lilith Locations', 'All Side Dungeon Locations', 'All Aspect Codex Unlocks', 'Season 7 All New Collectibles', 'Vessel of Hatred All Collectibles'],
    walkthrough: ['Vessel of Hatred Expansion Walkthrough', 'Season 7 Story Quest Guide', 'All Stronghold Completion Guide', 'Endgame Progression Guide', 'Pit Pushing Strategy by Tier'],
    tips: ['20 Diablo IV Tips for Endgame', 'Paragon Board Optimization Guide', 'How to Farm Ancestral Legendaries', 'Helltide Event Optimization', 'Nightmare Dungeon Efficient Farming'],
  },
  'horizon-forbidden-west': {
    boss: ['Apex Machine Boss Strategies', 'Regalla Boss Fight Guide', 'Tideripper Boss Strategy', 'Slitherfang - All Encounters', 'DLC: Burning Shores Boss Guide'],
    build: ['Best Weapon & Coil Combinations', 'Stealth Critical Hit Build', 'Maximum DPS Build for Machines', 'Best Outfit & Weaver Upgrades'],
    collectible: ['All Tallneck Locations & Override', 'All Relic Ruins Puzzle Solutions', 'All Cauldron Locations & Overrides', 'All Vista Point Locations', 'DLC: Burning Shores All Collectibles'],
    walkthrough: ['DLC: Burning Shores Complete Walkthrough', 'All Arena Challenge Strategies', 'NG+ Ultra Hard Mode Guide', 'All Rebel Outpost Locations', 'All Side Quest Walkthrough'],
    tips: ['15 Horizon FW Tips for Ultra Hard', 'Machine Override Priority Guide', 'Weapon Coil Synergies Explained', 'Most Efficient Resource Farming', 'Mount Collection & Upgrade Guide'],
  },
  // Black Myth Wukong - High search volume game
  'black-myth-wukong': {
    boss: ['Erlang Shen Boss Strategy - Secret Final Boss', 'Yellow Wind Sage - Phase Breakdown', 'Yellowbrow Boss Strategy', 'Taurus King Boss Fight Guide', 'Macaque King Strategy', 'Venom Daoist Boss Guide', 'All Chapter End Boss Strategies'],
    build: ['Best Staff Stance Combination Guide', 'Maximum Damage Build - Critical Hit Focus', 'Survival Build for Hard Bosses', 'Spell Synergy Build Guide', 'Best Vessel & Spirit Combinations'],
    collectible: ['All Secret Area Locations', 'All Transformations & Spells Guide', 'All Spirit Locations & Best Choices', 'All Chest & Hidden Item Locations', 'All Meditation Spot Locations', 'Secret Boss Unlock Requirements'],
    walkthrough: ['Complete Chapter-by-Chapter Walkthrough', 'Secret Area Access Guide - All Hidden Paths', 'How to Unlock True Ending', 'All Story Choices & Consequences', 'Chapter 6 Final Area Complete Guide'],
    tips: ['20 Things Black Myth Wukong Doesnt Tell You', 'Stance Switching Combat Guide', 'Spell Timing & Cooldown Optimization', 'Most Common Mistakes New Players Make', 'How to Farm Will & Resources Efficiently'],
  },
  // Stellar Blade - PS5 exclusive, high search volume
  'stellar-blade': {
    boss: ['Gigas Boss Strategy - Alpha Sector', 'Unidentified Naytiba Boss Guide', 'Corruptor Boss Fight Strategy', 'Duality Boss - Phase Breakdown', 'All Elite Naytiba Strategies'],
    build: ['Best Beta Skill Combinations', 'Maximum DPS Build Guide', 'Survival Build for Hard Mode', 'Best Gear & Exospine Combinations', 'Speedrun Build Optimization'],
    collectible: ['All Can Locations & Memory Stick Rewards', 'All Exospine Locations', 'All Camp Collector Items', 'All Drone Energy Cell Locations', 'All Hidden Chest Locations'],
    walkthrough: ['Complete Story Walkthrough - All Sectors', 'Alpha Sector Full Exploration', 'Wasteland Sector Guide', 'Great Desert All Quests', 'How to Unlock All Endings'],
    tips: ['15 Stellar Blade Tips for Hard Mode', 'Parry Timing - Frame Perfect Guide', 'Beta Skill Priority Guide', 'Most Common Mistakes New Players Make', 'Resource Farming & Upgrade Priority'],
  },
  // Dragon's Dogma 2 - High anticipation
  'dragons-dogma-2': {
    boss: ['Dragon Boss Strategy - All Encounters', 'Medusa Boss Fight Guide', 'Sphinx Riddle Solutions', 'Dullahan Boss Strategy', 'All Ur-Dragon Strategies'],
    build: ['Best Vocation Tier List (2025)', 'Warrior Build - Maximum Damage', 'Sorcerer Build - Nuke Everything', 'Mystic Spearhand Build Guide', 'Best Pawn Inclination Setup'],
    collectible: ['All Seekers Token Locations', 'All Portcrystal Locations', 'All Vocation Maister Locations', 'All Golden Trove Beetle Locations', 'All Sphinx Riddle Locations'],
    walkthrough: ['Main Story Complete Walkthrough', 'All Vocation Unlock Quests', 'Unmoored World - Endgame Guide', 'True Ending Unlock Guide', 'All Side Quest Walkthrough'],
    tips: ['20 Dragon Dogma 2 Tips That Save Hours', 'Pawn AI Behavior Explained', 'Most Common Build Mistakes', 'How to Farm Gold & RC Efficiently', 'Hidden Mechanics the Game Never Explains'],
  },
  // Elden Ring DLC
  'elden-ring-shadow-of-the-erdtree': {
    boss: ['Messmer the Impaler - Complete Strategy', 'Romina Saint of the Bud Boss Guide', 'Commander Gaius Boss Fight', 'Putrescent Knight Strategy', 'Final Boss - Radahn Phase Breakdown', 'Bayle the Dread Dragon Strategy', 'All Remembrance Boss Strategies'],
    build: ['DLC Best Build Tier List (2025)', 'Milady Light Roll Build', 'Greatsword Stance Break Build', 'Hand-to-Hand Arts Build Guide', 'Perfume Bottle Build - DLC Meta', 'Best DLC Weapon Tier List'],
    collectible: ['All Scadutree Fragment Locations', 'All Revered Spirit Ash Locations', 'All DLC Map Fragment Locations', 'All Shadow Realm Blessing Locations', 'All DLC Legendary Items', 'All Cross-Naginata & DLC Weapon Locations'],
    walkthrough: ['DLC Starting Guide - Where to Go First', 'Gravesite Plain Complete Exploration', 'Scadu Altus Full Walkthrough', 'Shadow Keep - Complete Dungeon Guide', 'Enir-Ilim - Final Area Walkthrough', 'All NPC Questlines in the DLC'],
    tips: ['20 DLC Tips That Will Save Your Sanity', 'Scadutree Blessing Level - How It Works', 'Best Early DLC Weapons to Get First', 'DLC Difficulty Scaling Explained', 'Most Common DLC Mistakes to Avoid'],
  },
  // Final Fantasy VII Rebirth
  'final-fantasy-vii-rebirth': {
    boss: ['Sephiroth Boss Strategy - Final Encounter', 'Gi Nattak Boss Guide', 'Jenova Lifeclinger Strategy', 'Weapons Boss Rush Guide', 'All VR Boss Battle Strategies'],
    build: ['Best Party Composition Guide', 'Cloud Best Weapon & Materia Build', 'Tifa Stagger Build Guide', 'Aerith Healing & Support Build', 'Best Materia Combinations Tier List'],
    collectible: ['All Moogle Medal Locations', 'All Protorelic Locations & Puzzles', 'All Cactuar Stamp Locations', 'All Summon Crystal Locations', 'All Intel & Survey Locations'],
    walkthrough: ['Complete Story Walkthrough - All Chapters', 'Junon Region Full Guide', 'Corel Region All Activities', 'Gongaga Region Exploration', 'How to Unlock Hard Mode'],
    tips: ['15 FF7 Rebirth Tips for Hard Mode', 'Stagger System Deep Dive', 'Synergy Ability Optimization', 'Most Common Materia Mistakes', 'Best Party Setup for Each Boss'],
  },
  // Helldivers 2 - Co-op hit
  'helldivers-2': {
    boss: ['Bile Titan Strategy - All Difficulties', 'Factory Stratagem Destroyer Guide', 'Charger Behemoth Counter Guide', 'Shrieker Nest Elimination Strategy', 'All Automaton Heavy Unit Strategies'],
    build: ['Best Stratagem Loadout Tier List (2025)', 'Anti-Tank Build vs Bugs', 'Anti-Automaton Build Guide', 'Speedrunner Build for Missions', 'Best Support Stratagems for Level 9'],
    collectible: ['All Planet Liberation Order Guide', 'All Warbond Unlock Content', 'All Ship Module Upgrade Priority', 'All Medal Farming Locations', 'All Super Credit Farming Guide'],
    walkthrough: ['How to Complete Level 9 Missions Solo', 'Blitz Mission Strategy Guide', 'Eradicate Mission Optimization', 'Geological Survey Mission Guide', 'All Difficulty Scaling Explained'],
    tips: ['20 Helldivers 2 Tips for Level 9', 'Dive & Prone - Survival Mechanics', 'Friendly Fire Avoidance Guide', 'Most Common Stratagem Mistakes', 'Optimal Team Composition for Each Faction'],
  },
  // Palworld - Viral survival craft
  'palworld': {
    boss: ['Zoe & Grizzbolt Boss Strategy', 'All Tower Boss Strategies', 'All Alpha Pal Locations & Strategies', 'Legendary Pal Boss Strategies', 'Raid Boss Counter Guide'],
    build: ['Best Base Layout & Automation Guide', 'Best Working Pal Combinations', 'Best Combat Pal Team Build', 'Breeding Guide - Perfect IV Pals', 'Best Base Defense Setup'],
    collectible: ['All Pal Locations & Spawn Maps', 'All Lifmunk Effigy Locations', 'All Fast Travel Statue Locations', 'All Skill Fruit Tree Locations', 'All Dungeon Locations & Loot'],
    walkthrough: ['Early Game Progression Guide', 'Mid-Game Base Building Strategy', 'Endgame Boss Rush Walkthrough', 'All Tower Boss Locations', 'Oil Rig Assault Guide'],
    tips: ['15 Palworld Tips for Efficient Base Building', 'Breeding Calculator & Perfect Combos', 'Most Common Base Design Mistakes', 'Pal Condensation & Soul Upgrade Priority', 'How to Farm Gold Efficiently'],
  },
  // Metaphor: ReFantazio
  'metaphor-refantazio': {
    boss: ['All Main Boss Strategy Guide', 'Optional Boss Encounters', 'Final Boss Phase Breakdown', 'Archetype Boss Counters', 'All Human Boss Strategies'],
    build: ['Best Archetype Combinations Tier List', 'Mage Build Guide - Maximum Magic', 'Warrior Build - Physical Dominance', 'Healer Support Build', 'Best Party Composition Guide'],
    collectible: ['All Relic Locations', 'All Gold Beetle Locations', 'All Recipe Locations', 'All Mask Locations', 'All Key Item Checklist'],
    walkthrough: ['Complete Story Walkthrough', 'All Companion Questlines', 'All Dungeon Walkthroughs', 'Calendar Optimization Guide', 'How to Unlock True Ending'],
    tips: ['15 Metaphor Tips for Maximum Efficiency', 'Archetype Synergy Guide', 'Most Common Build Mistakes', 'Calendar Management Strategy', 'Hidden Mechanics & Interactions'],
  },
  // Silent Hill 2 Remake
  'silent-hill-2-remake': {
    boss: ['Pyramid Head Boss Strategy - All Encounters', 'Flesh Lip Boss Guide', 'Abstract Daddy Boss Fight', 'Final Boss Strategy', 'All Boss Patterns & Weaknesses'],
    build: ['Best Weapon Upgrade Priority', 'Melee-Only Challenge Guide', 'Speedrun Loadout Strategy', 'Best Ammo Conservation Build', 'Hard Difficulty Recommended Setup'],
    collectible: ['All Memory Locations', 'All Key Item Locations', 'All Puzzle Solutions', 'All Secret & Hidden Room Locations', 'All Ending Requirements Guide'],
    walkthrough: ['Complete Story Walkthrough', 'All Puzzle Solutions by Difficulty', 'All Ending Paths & Choices', 'Born From a Wish DLC Guide', 'NG+ Differences & Changes'],
    tips: ['15 Silent Hill 2 Tips for Hard Mode', 'Combat Dodge Timing Guide', 'Ammo Conservation Strategies', 'Most Common Mistakes New Players Make', 'How to Get All 6 Endings'],
  },
  // Indiana Jones
  'indiana-jones-great-circle': {
    boss: ['All Boss Encounter Strategies', 'Major Boss Fight Guide', 'Final Boss Strategy', 'Arena Challenge Strategies'],
    build: ['Best Adventure Loadout Guide', 'Stealth Build Strategy', 'Combat-Focused Build', 'Best Weapon Upgrades Priority'],
    collectible: ['All Artifact Locations', 'All Secret Area Locations', 'All Collectible Checklist', 'All Hidden Chest Locations', 'All Puzzle Solutions Guide'],
    walkthrough: ['Complete Story Walkthrough', 'All Side Quest Guide', 'All Puzzle Solutions', 'All Region Exploration Guide', 'How to Unlock All Content'],
    tips: ['15 Indiana Jones Tips for Exploration', 'Stealth Mechanics Deep Dive', 'Most Common Mistakes to Avoid', 'Resource Management Guide', 'Combat Tips for Hard Encounters'],
  },
};

// Fallback topics for games not in the database
const FALLBACK_TOPICS: Record<GuideType, string[]> = {
  boss: ['Hardest Boss Strategy Guide', 'Final Boss Walkthrough & Tips', 'Secret Boss Unlock & Strategy'],
  build: ['Best Meta Build Guide (2025)', 'Starter Build Recommendations', 'Endgame Optimization Build'],
  collectible: ['All Collectibles Locations Guide', 'Hidden Items & Secrets Checklist', '100% Completion Guide'],
  walkthrough: ['Complete Story Walkthrough', 'Chapter-by-Chapter Guide', 'Main Quest Progression Guide'],
  tips: ['Pro Tips & Advanced Strategies', 'Things I Wish I Knew Earlier', 'Common Mistakes to Avoid'],
};

// ========================================
// TRENDING TOPICS ENGINE
// Priority-weighted trending topics
// ========================================
export interface TrendingTopic {
  gameSlug: string;
  gameName: string;
  topic: string;
  guideType: GuideType;
  priority: number; // 1-10, 10=highest
  keywords: string[];
}

export const TRENDING_TOPICS: TrendingTopic[] = [
  { gameSlug: 'elden-ring', gameName: 'Elden Ring', topic: 'Shadow of the Erdtree DLC Final Boss Strategy', guideType: 'boss', priority: 10, keywords: ['elden ring dlc', 'shadow of the erdtree', 'final boss guide', 'messmer strategy'] },
  { gameSlug: 'black-myth-wukong', gameName: 'Black Myth: Wukong', topic: 'Complete Boss Strategy Guide - All Chapters', guideType: 'boss', priority: 10, keywords: ['black myth wukong', 'boss guide', 'all bosses', 'strategy'] },
  { gameSlug: 'black-myth-wukong', gameName: 'Black Myth: Wukong', topic: 'All Secret Areas & Hidden Paths Guide', guideType: 'collectible', priority: 9, keywords: ['black myth wukong', 'secret areas', 'hidden paths', 'collectibles'] },
  { gameSlug: 'diablo-iv', gameName: 'Diablo IV', topic: 'Season 7 Best Build Tier List for All Classes', guideType: 'build', priority: 9, keywords: ['diablo 4', 'season 7', 'best builds', 'tier list'] },
  { gameSlug: 'baldurs-gate-3', gameName: "Baldur's Gate 3", topic: 'Patch 7 New Evil Endings Guide', guideType: 'walkthrough', priority: 8, keywords: ['baldurs gate 3', 'patch 7', 'evil ending', 'new content'] },
  { gameSlug: 'cyberpunk-2077-phantom-liberty', gameName: 'Cyberpunk 2077', topic: '2.2 Update Best Cyberware Builds', guideType: 'build', priority: 8, keywords: ['cyberpunk 2077', '2.2 update', 'best build', 'cyberware'] },
  { gameSlug: 'god-of-war-ragnarok', gameName: 'God of War Ragnarok', topic: 'Valhalla DLC Rogue-like Progression Guide', guideType: 'walkthrough', priority: 7, keywords: ['god of war ragnarok', 'valhalla dlc', 'rogue like', 'progression'] },
  { gameSlug: 'resident-evil-4-remake', gameName: 'Resident Evil 4 Remake', topic: 'Separate Ways Professional S+ Rank Strategy', guideType: 'tips', priority: 7, keywords: ['resident evil 4', 'separate ways', 'professional s+', 'speedrun'] },
  { gameSlug: 'starfield', gameName: 'Starfield', topic: 'Shattered Space DLC Complete Walkthrough', guideType: 'walkthrough', priority: 6, keywords: ['starfield', 'shattered space', 'dlc', 'walkthrough'] },
  { gameSlug: 'zelda-totk', gameName: 'Zelda: Tears of the Kingdom', topic: 'All 152 Shrine Solutions Complete Guide', guideType: 'collectible', priority: 6, keywords: ['zelda totk', 'all shrines', 'shrine guide', 'solutions'] },
  { gameSlug: 'black-myth-wukong', gameName: 'Black Myth: Wukong', topic: 'Erlang Shen Secret Boss Strategy - How to Unlock & Beat', guideType: 'boss', priority: 10, keywords: ['black myth wukong', 'erlang shen', 'secret boss', 'how to beat'] },
  { gameSlug: 'black-myth-wukong', gameName: 'Black Myth: Wukong', topic: 'All Secret Areas & Hidden Paths Complete Guide', guideType: 'collectible', priority: 9, keywords: ['black myth wukong', 'secret areas', 'hidden paths', '100% guide'] },
  { gameSlug: 'stellar-blade', gameName: 'Stellar Blade', topic: 'Best Beta Skill Combinations for Hard Mode', guideType: 'build', priority: 8, keywords: ['stellar blade', 'best build', 'beta skills', 'hard mode'] },
  { gameSlug: 'dragons-dogma-2', gameName: "Dragon's Dogma 2", topic: 'Best Vocation Tier List & Build Guide (2025)', guideType: 'build', priority: 8, keywords: ['dragons dogma 2', 'best vocation', 'tier list', 'build guide'] },
  { gameSlug: 'elden-ring-shadow-of-the-erdtree', gameName: 'Elden Ring DLC', topic: 'DLC Final Boss Radahn Complete Strategy', guideType: 'boss', priority: 10, keywords: ['elden ring dlc', 'radahn', 'final boss', 'erdtree'] },
  { gameSlug: 'helldivers-2', gameName: 'Helldivers 2', topic: 'Best Stratagem Loadout for Level 9 Missions', guideType: 'build', priority: 7, keywords: ['helldivers 2', 'best stratagem', 'level 9', 'loadout'] },
  { gameSlug: 'final-fantasy-vii-rebirth', gameName: 'FF7 Rebirth', topic: 'Best Materia Combinations & Party Setup', guideType: 'build', priority: 7, keywords: ['ff7 rebirth', 'materia', 'best party', 'build guide'] },
  { gameSlug: 'palworld', gameName: 'Palworld', topic: 'Best Base Layout & Automation Guide', guideType: 'build', priority: 7, keywords: ['palworld', 'base layout', 'automation', 'best base'] },
];

// ========================================
// TOPIC ENGINE - Auto-select topics for generation
// ========================================
export function getTopicsForGame(gameSlug: string, guideType?: GuideType): string[] {
  const gameTopics = GAME_TOPICS[gameSlug];
  if (!gameTopics) {
    return guideType ? FALLBACK_TOPICS[guideType] : Object.values(FALLBACK_TOPICS).flat();
  }
  if (guideType) {
    return gameTopics[guideType] || FALLBACK_TOPICS[guideType];
  }
  // Return all topics for the game
  return Object.values(gameTopics).flat();
}

export function getTopicForGeneration(
  gameSlug: string,
  guideType?: GuideType,
  existingArticleTitles?: string[]
): { topic: string; guideType: GuideType; keywords: string[] } | null {
  const topics = getTopicsForGame(gameSlug, guideType);
  if (topics.length === 0) return null;

  // Filter out topics that already have articles (by title similarity)
  const existingLower = (existingArticleTitles || []).map(t => t.toLowerCase());
  const availableTopics = topics.filter(t => {
    const topicLower = t.toLowerCase();
    return !existingLower.some(et => {
      // Check if >60% of words overlap
      const topicWords = new Set(topicLower.split(/\s+/));
      const articleWords = new Set(et.split(/\s+/));
      const overlap = [...topicWords].filter(w => articleWords.has(w)).length;
      return overlap / topicWords.size > 0.6;
    });
  });

  if (availableTopics.length === 0) return null;

  // Pick a random topic from available ones
  const selectedTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  const selectedGuideType = guideType || GUIDE_TYPES[Math.floor(Math.random() * GUIDE_TYPES.length)].type;

  // Get keywords for this topic
  const guideTypeConfig = GUIDE_TYPES.find(g => g.type === selectedGuideType);
  const keywords = [...(guideTypeConfig?.keywords || []), ...SEO_KEYWORDS.core.slice(0, 3)];

  return { topic: selectedTopic, guideType: selectedGuideType, keywords };
}

export function getTrendingTopicsForGame(gameSlug: string): TrendingTopic[] {
  return TRENDING_TOPICS.filter(t => t.gameSlug === gameSlug).sort((a, b) => b.priority - a.priority);
}

export function getAllTrendingTopics(): TrendingTopic[] {
  return [...TRENDING_TOPICS].sort((a, b) => b.priority - a.priority);
}

// Get guide type config by type
export function getGuideTypeConfig(type: GuideType) {
  return GUIDE_TYPES.find(g => g.type === type);
}
