export enum SkinId {
  CLASSIC_GREEN = "classic_green",
  RUBY_RED = "ruby_red",
  SKY_BLUE = "sky_blue",
  GOLDEN_CROWN = "golden_crown",
  CATERPILLAR = "caterpillar",
  GRAPE_PURPLE = "grape_purple",
  CUTE_PINK = "cute_pink"
}

export enum ThemeId {
  COZY_MEADOW = "cozy_meadow",
  SUNNY_SAND = "sunny_sand",
  ARCTIC_ICE = "arctic_ice"
}

export enum BoosterId {
  SLOW_MO = "slow_mo",
  MAGNET = "magnet",
  SHIELD = "shield"
}

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number; // Coins / Credits
  unlockedSkins: SkinId[];
  unlockedThemes: ThemeId[];
  activeSkin: SkinId;
  activeTheme: ThemeId;
  highScore: number;
  totalGames: number;
  lastLoginBonusClaimedAt?: string;
}

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
  price: number; // Credits
  color: string;
  glowColor: string;
  wireframe: boolean;
  roughness: number;
  metalness: number;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  price: number;
  gridColor: string;
  ambientColor: string;
  backgroundColor: string;
}

export interface Booster {
  id: BoosterId;
  name: string;
  description: string;
  price: number;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: "topup" | "purchase";
  amount: number; // in CAD
  creditsEarned: number; // calculated credits
  status: "pending" | "verifying" | "completed" | "failed";
  reference: string;
  timestamp: string;
  proofName?: string;
  description?: string;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  activeSkin: SkinId;
  timestamp: string;
}

export const SKINS_DATA: Record<SkinId, Skin> = {
  [SkinId.CLASSIC_GREEN]: {
    id: SkinId.CLASSIC_GREEN,
    name: "Meadow Green",
    description: "The classic, friendly bright green snake look. Natural and energetic.",
    price: 0,
    color: "#22c55e",
    glowColor: "#4ade80",
    wireframe: false,
    roughness: 0.6,
    metalness: 0.1,
  },
  [SkinId.RUBY_RED]: {
    id: SkinId.RUBY_RED,
    name: "Apple Ruby Red",
    description: "Matches the color of sweet, juicy orchard apples.",
    price: 250,
    color: "#ef4444",
    glowColor: "#f87171",
    wireframe: false,
    roughness: 0.5,
    metalness: 0.2,
  },
  [SkinId.SKY_BLUE]: {
    id: SkinId.SKY_BLUE,
    name: "Sunny Sky Blue",
    description: "A bright, beautiful blue sky skin that glimmers with clarity.",
    price: 500,
    color: "#0ea5e9",
    glowColor: "#38bdf8",
    wireframe: false,
    roughness: 0.4,
    metalness: 0.3,
  },
  [SkinId.GOLDEN_CROWN]: {
    id: SkinId.GOLDEN_CROWN,
    name: "Royal Golden Crown",
    description: "A luxurious, shiny pure gold coating for the ultimate high scorer.",
    price: 1500,
    color: "#eab308",
    glowColor: "#fde047",
    wireframe: false,
    roughness: 0.1,
    metalness: 0.9,
  },
  [SkinId.CATERPILLAR]: {
    id: SkinId.CATERPILLAR,
    name: "Cute Caterpillar",
    description: "Friendly yellow and black segments. Makes your snake super cozy.",
    price: 800,
    color: "#eab308",
    glowColor: "#ca8a04",
    wireframe: false,
    roughness: 0.7,
    metalness: 0.0,
  },
  [SkinId.GRAPE_PURPLE]: {
    id: SkinId.GRAPE_PURPLE,
    name: "Sweet Grape Purple",
    description: "A vibrant, tasty dark purple design reminiscent of mountain grapes.",
    price: 650,
    color: "#a855f7",
    glowColor: "#c084fc",
    wireframe: false,
    roughness: 0.5,
    metalness: 0.2,
  },
  [SkinId.CUTE_PINK]: {
    id: SkinId.CUTE_PINK,
    name: "Bubblegum Pink",
    description: "A soft, playful bubblegum pink coat that stands out beautifully.",
    price: 400,
    color: "#ec4899",
    glowColor: "#f472b6",
    wireframe: false,
    roughness: 0.5,
    metalness: 0.1,
  }
};

export const THEMES_DATA: Record<ThemeId, Theme> = {
  [ThemeId.COZY_MEADOW]: {
    id: ThemeId.COZY_MEADOW,
    name: "Sunny Green Meadow",
    description: "A classic green grass lawn with warm sunlight and soft sand borders.",
    price: 0,
    gridColor: "#15803d",
    ambientColor: "#f0fdf4",
    backgroundColor: "#ffffff"
  },
  [ThemeId.SUNNY_SAND]: {
    id: ThemeId.SUNNY_SAND,
    name: "Golden Desert Oasis",
    description: "A gorgeous, warm golden sand grid reminiscent of a sunny oasis.",
    price: 300,
    gridColor: "#ca8a04",
    ambientColor: "#fefce8",
    backgroundColor: "#fef08a"
  },
  [ThemeId.ARCTIC_ICE]: {
    id: ThemeId.ARCTIC_ICE,
    name: "Sparkling Arctic Ice",
    description: "A beautiful frost-blue winter scene with sparkling polar grid lines.",
    price: 600,
    gridColor: "#0284c7",
    ambientColor: "#f0f9ff",
    backgroundColor: "#e0f2fe"
  }
};

export const BOOSTERS_DATA: Record<BoosterId, Booster> = {
  [BoosterId.SLOW_MO]: {
    id: BoosterId.SLOW_MO,
    name: "Time Dilator",
    description: "Reduces game speed by 30% for 15 seconds.",
    price: 150
  },
  [BoosterId.MAGNET]: {
    id: BoosterId.MAGNET,
    name: "Nano-Food Magnet",
    description: "Pulls nearby neon food cells to your head.",
    price: 200
  },
  [BoosterId.SHIELD]: {
    id: BoosterId.SHIELD,
    name: "Quantum Forcefield",
    description: "Protects from a single crash. Lasts for 30 seconds.",
    price: 300
  }
};
