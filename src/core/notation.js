/**
 * Bidirectional notation: text <-> Move[].
 *
 * Supported:
 *   faces        U D L R F B
 *   wide         Rw / r  (2 layers), 3Rw (3 layers)
 *   inner layer  2R      (SiGN: the 2nd layer in from R, that layer alone)
 *   slices       M E S
 *   rotations    x y z   (X Y Z also accepted)
 *   modifiers    '  2  2'  3   (any integer, with an optional prime)
 *   grouping     (R U R' U')3, (R U)'
 *   commutator   [A, B]  = A B A' B'
 *   conjugate    [A: B]  = A B A'
 *
 * Separators are whitespace and commas (outside brackets, where a comma is the
 * commutator separator).
 */

import { AXIS_FACES, FACE_AXIS, FACE_SIGN, outerCoord } from './cube.js';
import { invertAlg, normalizeAmount } from './moves.js';

export class NotationError extends Error {
  /** @param {string} message @param {number} index character offset in the input */
  constructor(message, index) {
    super(message);
    this.name = 'NotationError';
    this.index = index;
  }
}

const FACE_LETTERS = 'UDLRFB';
const SLICE_LETTERS = 'MES';
const ROTATION_LETTERS = 'xyz';

/**
 * A slice turns in the direction of one of its neighbouring faces: M follows L,
 * E follows D, S follows F. Rotations follow R, U and F respectively.
 */
const SLICE_FOLLOWS = { M: 'L', E: 'D', S: 'F' };
const ROTATION_FOLLOWS = { x: 'R', y: 'U', z: 'F' };

/**
 * Quarter turns about the positive axis for a clockwise turn of `face`.
 *
 * Clockwise is defined looking at the face from outside the cube. For a face on
 * the positive end of its axis that is a negative right-hand rotation; for one
 * on the negative end it is positive. This single expression is the whole sign
 * convention — get it wrong and every algorithm comes out mirrored.
 */
function amountFor(face, turns) {
  return normalizeAmount(-FACE_SIGN[face] * turns);
}

/** The `depth` outermost lattice coordinates measured in from `face`. */
function layersFrom(face, depth, n) {
  const sign = FACE_SIGN[face];
  const outer = outerCoord(n);
  const layers = [];
  for (let k = 0; k < depth; k++) layers.push(sign * (outer - 2 * k));
  return layers;
}

/** Every lattice coordinate strictly inside the two outer layers. */
function innerLayers(n) {
  const outer = outerCoord(n);
  const layers = [];
  for (let c = -outer + 2; c <= outer - 2; c += 2) layers.push(c);
  return layers;
}

/** Every lattice coordinate, i.e. a whole-cube rotation. */
function allLayers(n) {
  const outer = outerCoord(n);
  const layers = [];
  for (let c = -outer; c <= outer; c += 2) layers.push(c);
  return layers;
}

// --- parsing ---------------------------------------------------------------

class Scanner {
  constructor(text, n) {
    this.text = text;
    this.n = n;
    this.i = 0;
  }

  get done() {
    return this.i >= this.text.length;
  }

  peek() {
    return this.text[this.i];
  }

  /**
   * Whitespace always separates. A comma usually does too, but inside `[A, B]`
   * it is the commutator separator, so it is left alone when it terminates.
   */
  skipSeparators(terminators = '') {
    while (!this.done) {
      const ch = this.text[this.i];
      if (/\s/.test(ch)) this.i++;
      else if (ch === ',' && !terminators.includes(',')) this.i++;
      else break;
    }
  }

  fail(message, index = this.i) {
    throw new NotationError(message, index);
  }

  /** Trailing `2`, `'`, `2'`, `3` ... — an optional count and an optional prime. */
  readModifier() {
    let count = 1;
    const start = this.i;
    let digits = '';
    while (!this.done && /\d/.test(this.text[this.i])) digits += this.text[this.i++];
    if (digits) {
      count = Number(digits);
      if (count === 0) this.fail('Turn count cannot be 0', start);
    }
    let inverted = false;
    if (!this.done && (this.text[this.i] === "'" || this.text[this.i] === '’')) {
      inverted = true;
      this.i++;
    }
    return inverted ? -count : count;
  }

  /** Leading digits, as in `3Rw` or `2R`. */
  readPrefix() {
    let digits = '';
    while (!this.done && /\d/.test(this.text[this.i])) digits += this.text[this.i++];
    return digits ? Number(digits) : null;
  }

  parseSequence(terminators = '') {
    const moves = [];
    for (;;) {
      this.skipSeparators(terminators);
      if (this.done) break;
      const ch = this.peek();
      if (terminators.includes(ch)) break;

      if (ch === '(') {
        this.i++;
        const inner = this.parseSequence(')');
        if (this.done || this.peek() !== ')') this.fail('Unclosed "("');
        this.i++;
        moves.push(...this.applyRepeat(inner));
      } else if (ch === '[') {
        this.i++;
        moves.push(...this.applyRepeat(this.parseBracket()));
      } else if (ch === ')' || ch === ']') {
        this.fail(`Unexpected "${ch}"`);
      } else {
        moves.push(this.parseMove());
      }
    }
    return moves;
  }

  /** `[A, B]` -> A B A' B'   and   `[A: B]` -> A B A' */
  parseBracket() {
    const open = this.i - 1;
    const a = this.parseSequence(',:]');
    if (this.done) this.fail('Unclosed "["', open);
    const separator = this.peek();
    if (separator === ']') this.fail('Expected "," or ":" inside "[...]"', open);
    this.i++;
    const b = this.parseSequence(']');
    if (this.done || this.peek() !== ']') this.fail('Unclosed "["', open);
    this.i++;

    return separator === ','
      ? [...a, ...b, ...invertAlg(a), ...invertAlg(b)] // commutator
      : [...a, ...b, ...invertAlg(a)]; // conjugate
  }

  /** Repeat/invert suffix after a group. */
  applyRepeat(sequence) {
    const modifier = this.readModifier();
    const times = Math.abs(modifier);
    const body = modifier < 0 ? invertAlg(sequence) : sequence;
    const out = [];
    for (let i = 0; i < times; i++) out.push(...body);
    return out;
  }

  parseMove() {
    const start = this.i;
    const prefix = this.readPrefix();
    if (this.done) this.fail('Expected a move after the layer count', start);

    const raw = this.text[this.i++];
    const upper = raw.toUpperCase();

    // rotations: x y z
    if (ROTATION_LETTERS.includes(raw.toLowerCase()) && !FACE_LETTERS.includes(upper)) {
      if (prefix !== null) this.fail('A rotation cannot take a layer count', start);
      const axis = raw.toLowerCase();
      const turns = this.readModifier();
      return {
        axis,
        layers: allLayers(this.n),
        amount: amountFor(ROTATION_FOLLOWS[axis], turns),
      };
    }

    // slices: M E S
    if (SLICE_LETTERS.includes(upper) && !FACE_LETTERS.includes(upper)) {
      if (prefix !== null) this.fail('A slice cannot take a layer count', start);
      const follows = SLICE_FOLLOWS[upper];
      const layers = innerLayers(this.n);
      if (layers.length === 0) this.fail(`${upper} needs a cube larger than 2x2`, start);
      const turns = this.readModifier();
      return { axis: FACE_AXIS[follows], layers, amount: amountFor(follows, turns) };
    }

    if (!FACE_LETTERS.includes(upper)) {
      this.fail(`Unknown move "${raw}"`, start);
    }

    // faces, wide faces, and single inner layers
    const isLowercase = raw !== upper;
    let wide = isLowercase;
    if (!this.done && (this.peek() === 'w' || this.peek() === 'W')) {
      wide = true;
      this.i++;
    }

    const turns = this.readModifier();
    let layers;

    if (wide) {
      const depth = prefix ?? 2;
      if (depth < 1 || depth > this.n) this.fail(`Cannot turn ${depth} layers of a ${this.n}x${this.n}`, start); // prettier-ignore
      layers = layersFrom(upper, depth, this.n);
    } else if (prefix !== null) {
      // SiGN: `2R` is the 2nd layer in from R, that layer only.
      if (prefix < 1 || prefix > this.n) this.fail(`Layer ${prefix} is outside a ${this.n}x${this.n}`, start); // prettier-ignore
      layers = [layersFrom(upper, prefix, this.n).pop()];
    } else {
      layers = layersFrom(upper, 1, this.n);
    }

    return { axis: FACE_AXIS[upper], layers, amount: amountFor(upper, turns) };
  }
}

/**
 * Parse an algorithm string into moves.
 * @param {string} text
 * @param {number} n cube size — needed to turn face letters into lattice layers
 * @returns {import('./moves.js').Move[]}
 * @throws {NotationError} with a character `index` for the UI to underline
 */
export function parseAlg(text, n = 3) {
  const scanner = new Scanner(text, n);
  const moves = scanner.parseSequence();
  scanner.skipSeparators();
  if (!scanner.done) scanner.fail(`Unexpected "${scanner.peek()}"`);
  return moves.filter((m) => normalizeAmount(m.amount) !== 0);
}

// --- formatting ------------------------------------------------------------

function modifierSuffix(turns) {
  if (turns === 2 || turns === -2) return '2';
  return turns < 0 ? "'" : '';
}

function sameLayers(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.every((v, i) => v === y[i]);
}

/**
 * Move -> canonical notation. The inverse of parseAlg for anything parseAlg can
 * produce; throws for hand-built layer sets that have no conventional spelling
 * (a non-contiguous set, say).
 */
export function formatMove(move, n = 3) {
  const amount = normalizeAmount(move.amount);
  if (amount === 0) return '';

  const { pos, neg } = AXIS_FACES[move.axis];
  const layers = [...move.layers].sort((a, b) => a - b);

  // whole-cube rotation
  if (sameLayers(layers, allLayers(n))) {
    const letter = move.axis;
    const turns = normalizeAmount(-FACE_SIGN[ROTATION_FOLLOWS[letter]] * amount);
    return letter + modifierSuffix(turns);
  }

  // slice
  const inner = innerLayers(n);
  if (inner.length > 0 && sameLayers(layers, inner)) {
    const letter = Object.keys(SLICE_FOLLOWS).find((k) => FACE_AXIS[SLICE_FOLLOWS[k]] === move.axis);
    const turns = normalizeAmount(-FACE_SIGN[SLICE_FOLLOWS[letter]] * amount);
    return letter + modifierSuffix(turns);
  }

  // a run of layers measured in from one face
  for (const face of [pos, neg]) {
    const turns = normalizeAmount(-FACE_SIGN[face] * amount);
    const suffix = modifierSuffix(turns);

    for (let depth = 1; depth <= n; depth++) {
      if (sameLayers(layers, layersFrom(face, depth, n))) {
        if (depth === 1) return face + suffix;
        if (depth === 2) return `${face}w${suffix}`;
        return `${depth}${face}w${suffix}`;
      }
    }

    // a single inner layer, SiGN style
    if (layers.length === 1) {
      for (let depth = 2; depth < n; depth++) {
        if (layers[0] === layersFrom(face, depth, n).pop()) {
          return `${depth}${face}${suffix}`;
        }
      }
    }
  }

  throw new NotationError(`No conventional notation for layers [${layers}] on a ${n}x${n}`, 0);
}

export function formatAlg(moves, n = 3) {
  return moves
    .map((m) => formatMove(m, n))
    .filter(Boolean)
    .join(' ');
}
