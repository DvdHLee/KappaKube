// Single source of truth for the cube's look.
// Swapping this object is how a colour-blind palette or an alternate scheme ships.

export const COLORS = {
  white: '#F2F2F0',
  yellow: '#FFD52E',
  green: '#21B36B',
  blue: '#2D7FF9',
  red: '#E63946',
  orange: '#FF8A3D',
};

/**
 * Which colour sits on which face in the default orientation: white on the
 * bottom, red in front. Face letters are *positions*, not colours, so this is a
 * pure display concern — notation and the core model are untouched by it.
 *
 * This is a valid WCA-chirality cube (opposite pairs white/yellow, red/orange,
 * green/blue) and it is also the CFOP-friendly start: the cross colour is on D
 * and the OLL/PLL working face is the yellow U.
 */
export const FACE_ORIENTATION = {
  U: 'yellow',
  D: 'white',
  F: 'red',
  B: 'orange',
  R: 'green',
  L: 'blue',
};

export const FACE_COLORS = Object.fromEntries(
  Object.entries(FACE_ORIENTATION).map(([face, name]) => [face, COLORS[name]]),
);

// Stickerless cube: the piece is moulded in colour, so the only dark surfaces are
// the inward-facing sides you glimpse through the seams.
export const INTERIOR_COLOR = '#131317';
export const BACKGROUND_COLOR = '#0c0c10';

// Geometry constants, in world units. Lattice spacing is always 1.
export const SPACING = 1;
export const CUBIE_SIZE = 0.98; // < SPACING leaves a hairline seam between pieces
export const CUBIE_RADIUS = 0.09; // corner rounding; the colour break lands mid-bevel
export const CUBIE_SEGMENTS = 4; // smoothness of the rounding
