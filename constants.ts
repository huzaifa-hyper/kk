
import { PromptSuggestion } from "./types";

export const MASCOT_STYLE_DESCRIPTION = `
STYLE REQUIREMENTS (MANDATORY):
1. Flat 2D vector cartoon art style. 
2. ABSOLUTELY NO 3D rendering, no realistic textures, no gradients except for simple cell-shading.
3. Thick, bold, consistent black outlines on the character and all environmental elements.
4. Vibrant, high-contrast, saturated comic book colors.
5. Everything must look like a clean, high-quality digital sticker or 2D animation frame.

CHARACTER FEATURES ($CHAD):
- Muscular green humanoid with vibrant lime-green skin.
- Thick, perfectly groomed black beard with sharp edges.
- Large, round, expressive white eyes with tiny black pupils.
- Wide, friendly smile with distinct orange lips.
- Extreme bodybuilding physique.
- A thick white sticker-style outer border around the character.

ENVIRONMENT STYLE:
- The background and all objects in the scene must match the flat 2D vector cartoon style.
- Use a radiant light-green and dark-green sunburst comic-style background unless a specific location is requested, but even then, maintain the sunburst energy.
`;

export const SUGGESTION_CATEGORIES = ['Action', 'Crypto', 'Luxury', 'Funny'] as const;

export const DEFAULT_SUGGESTIONS: PromptSuggestion[] = [
  { title: "To the Moon", prompt: "Riding a 2D cartoon rocket ship through a flat vector space nebula holding a green candle", category: "Crypto" },
  { title: "Diamond Hands", prompt: "Holding massive glowing cartoon diamonds with laser eyes, flat vector style", category: "Crypto" },
  { title: "Beach Vibes", prompt: "Relaxing on a 2D vector tropical beach chair with a flat cartoon fruit cocktail", category: "Funny" },
  { title: "Cyber Chad", prompt: "Wearing futuristic 2D flat cybernetic armor in a neon vector city", category: "Action" }
];
