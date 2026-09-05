// Single source of truth for the cube's look.

export const COLORS = {
  white: '#F2F2F0',
  yellow: '#FFD52E',
  green: '#21B36B',
  blue: '#2D7FF9',
  red: '#E63946',
  orange: '#FF8A3D',
};

/**
 * Default orientation: white on the bottom, red in front. A valid WCA-chirality
 * cube and the CFOP-friendly start — the cross colour is down and the OLL/PLL
 * working face is the yellow U. The user can pick any of the 24 (see
 * src/core/scheme.js); face letters stay positions, not colours, so notation is
 * untouched by the choice.
 */
export const DEFAULT_TOP = 'yellow';
export const DEFAULT_FRONT = 'red';

// Stickerless cube: the piece is moulded in colour, so the only dark surfaces are
// the inward-facing sides you glimpse through the seams.
export const INTERIOR_COLOR = '#131317';

// Geometry constants, in world units. Lattice spacing is always 1.
export const SPACING = 1;
export const CUBIE_SIZE = 0.98; // < SPACING leaves a hairline seam between pieces
export const CUBIE_RADIUS = 0.09; // corner rounding; the colour break lands mid-bevel
export const CUBIE_SEGMENTS = 4; // smoothness of the rounding
