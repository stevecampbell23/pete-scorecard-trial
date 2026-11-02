export type HoleKind = "eagle" | "birdie" | "par" | "bogey" | "double" | "triple" | "snow";

export type Player = {
  id: string;
  name: string;
};

export type TeeSet = {
  key: string;
  name: string;
  gender?: string;
  rating?: number;
  slope?: number;
  yardage?: number;
  par?: number;
};

export type Course = {
  id: string;
  name: string;
  city?: string;
  par: number[];
  rating?: number;
  slope?: number;
  /** Stroke index 1 = hardest. Optional, used for net games later. */
  strokeIndex?: number[];
  lat?: number;
  lng?: number;
  ogid?: string;
  teeName?: string;
  source?: "bag" | "opengolf" | "typed";
};

export type LiveRound = {
  id: string;
  date: string;
  courseId: string;
  playerIds: string[];
  hole: number;
  /** null means not recorded yet. Par is only written when the user taps Next or +/−. */
  scores: Record<string, Array<number | null>>;
  created: number;
  updated?: number;
};

export type SavedRound = {
  id: string;
  date: string;
  courseId: string;
  scores: Record<string, number[]>;
  created: number;
};

export type Club = {
  id: string;
  name: string;
  yards: number;
};

export type AppState = {
  players: Player[];
  courses: Course[];
  rounds: SavedRound[];
  live: LiveRound | null;
  me: string;
  lastCourseId?: string;
  clubs: Club[];
  clubShots?: Record<string, number[]>;
  lastFix?: { lat: number; lng: number; at: number; accuracyM?: number };
  room?: { code: string; role: "host" | "guest" } | null;
};

export type Tab = "play" | "bag" | "stats" | "rounds" | "setup";

export type StakeMode = "points" | "dollars";

export type GameSettings = {
  skins: boolean;
  skinsValue: number;
  skinsCarry: boolean;
  nassau: boolean;
  nassauValue: number;
  stroke: boolean;
  snowman: boolean;
  snowmanValue: number;
  mode: StakeMode;
};
