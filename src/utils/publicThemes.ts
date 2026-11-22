export type PublicThemeId =
  | "ocean"
  | "sage"
  | "blush"
  | "maroon"
  | "gold"
  | "lavender";

export type PublicDefaultMode = "system" | "light" | "dark";

export type PublicAnimationId =
  | "doves"
  | "petals"
  | "butterflies"
  | "lanterns"
  | "sparkles"
  | "none";

export interface PublicAnimationDefinition {
  id: PublicAnimationId;
  name: string;
  tagline: string;
}

export const PUBLIC_ANIMATIONS: PublicAnimationDefinition[] = [
  {
    id: "doves",
    name: "Merpati & Kilau",
    tagline: "Burung merpati putih terbang & kilau perayaan",
  },
  {
    id: "petals",
    name: "Kelopak Bunga",
    tagline: "Kelopak bunga romantis melayang lembut",
  },
  {
    id: "butterflies",
    name: "Kupu-Kupu",
    tagline: "Kupu-kupu cantik mengepak melintasi layar",
  },
  {
    id: "lanterns",
    name: "Lentera Cahaya",
    tagline: "Lentera hangat & kunang-kunang naik perlahan",
  },
  {
    id: "sparkles",
    name: "Kilau Bintang",
    tagline: "Taburan cahaya bintang lembut nan mewah",
  },
  {
    id: "none",
    name: "Tanpa Animasi",
    tagline: "Tampilan tenang & minimalis tanpa partikel",
  },
];

export const PUBLIC_ANIMATION_IDS = new Set<string>(
  PUBLIC_ANIMATIONS.map((a) => a.id)
);

export const normalizePublicAnimation = (value?: string): PublicAnimationId => {
  const candidate = (value || "").trim().toLowerCase();
  if (PUBLIC_ANIMATION_IDS.has(candidate)) {
    return candidate as PublicAnimationId;
  }
  return "doves";
};

export type PublicOrnamentId =
  | "botanical"
  | "floral"
  | "islamic"
  | "baroque"
  | "celestial"
  | "none";

export interface PublicOrnamentDefinition {
  id: PublicOrnamentId;
  name: string;
  tagline: string;
}

export const PUBLIC_ORNAMENTS: PublicOrnamentDefinition[] = [
  {
    id: "botanical",
    name: "Ranting & Mawar",
    tagline: "Daun eucalyptus halus dengan kuncup mawar",
  },
  {
    id: "floral",
    name: "Buket Peony",
    tagline: "Kelopak bunga mekar & sulur romantis",
  },
  {
    id: "islamic",
    name: "Arabesque Islami",
    tagline: "Motif geometris & kubah halus nan anggun",
  },
  {
    id: "baroque",
    name: "Filigree Klasik",
    tagline: "Ukiran kerajaan Eropa & aksen berlian",
  },
  {
    id: "celestial",
    name: "Bintang & Bulan",
    tagline: "Bulan sabit halus & rasi bintang puitis",
  },
  {
    id: "none",
    name: "Tanpa Ornamen",
    tagline: "Latar bersih tanpa tanda air samping",
  },
];

export const PUBLIC_ORNAMENT_IDS = new Set<string>(
  PUBLIC_ORNAMENTS.map((o) => o.id)
);

export const normalizePublicOrnament = (value?: string): PublicOrnamentId => {
  const candidate = (value || "").trim().toLowerCase();
  if (PUBLIC_ORNAMENT_IDS.has(candidate)) {
    return candidate as PublicOrnamentId;
  }
  return "botanical";
};

export interface PublicThemeDefinition {
  id: PublicThemeId;
  name: string;
  tagline: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    accentDark: string;
    darkBg: string;
    darkSurface: string;
  };
}

export const PUBLIC_THEMES: PublicThemeDefinition[] = [
  {
    id: "ocean",
    name: "Ivory & Sky",
    tagline: "Editorial klasik biru langit & gading",
    colors: {
      primary: "#0f172a",
      secondary: "#fafaf9",
      accent: "#7dd3fc",
      accentDark: "#075985",
      darkBg: "#020617",
      darkSurface: "#0f172a",
    },
  },
  {
    id: "sage",
    name: "Sage Garden",
    tagline: "Botanical hijau sage lembut & hangat",
    colors: {
      primary: "#2f3b27",
      secondary: "#f7f8f3",
      accent: "#9fb682",
      accentDark: "#556b38",
      darkBg: "#11160e",
      darkSurface: "#1b2316",
    },
  },
  {
    id: "blush",
    name: "Blush Rose",
    tagline: "Romantis merah muda pastel & krem",
    colors: {
      primary: "#4e2a32",
      secondary: "#fff9f8",
      accent: "#e8a5b4",
      accentDark: "#a85568",
      darkBg: "#190e11",
      darkSurface: "#26161b",
    },
  },
  {
    id: "maroon",
    name: "Burgundy Velvet",
    tagline: "Mewah merah marun & nuansa emas",
    colors: {
      primary: "#441420",
      secondary: "#fcf8f6",
      accent: "#df94a4",
      accentDark: "#881c36",
      darkBg: "#17070b",
      darkSurface: "#260d13",
    },
  },
  {
    id: "gold",
    name: "Champagne Gold",
    tagline: "Elegan emas sampanye & ivory hangat",
    colors: {
      primary: "#45351b",
      secondary: "#fffcf5",
      accent: "#dfc078",
      accentDark: "#9a7222",
      darkBg: "#161108",
      darkSurface: "#231c0e",
    },
  },
  {
    id: "lavender",
    name: "Dusty Lavender",
    tagline: "Anggun ungu lembut & senja puitis",
    colors: {
      primary: "#32294a",
      secondary: "#faf8fd",
      accent: "#c4b5fd",
      accentDark: "#6d4fc2",
      darkBg: "#110d1b",
      darkSurface: "#1d172c",
    },
  },
];

export const PUBLIC_THEME_IDS = new Set<string>(PUBLIC_THEMES.map((t) => t.id));

export const normalizePublicTheme = (value?: string): PublicThemeId => {
  const candidate = (value || "").trim().toLowerCase();
  if (PUBLIC_THEME_IDS.has(candidate)) {
    return candidate as PublicThemeId;
  }
  return "ocean";
};

export const normalizePublicDefaultMode = (
  value?: string
): PublicDefaultMode => {
  const candidate = (value || "").trim().toLowerCase();
  if (candidate === "light" || candidate === "dark" || candidate === "system") {
    return candidate;
  }
  return "system";
};
