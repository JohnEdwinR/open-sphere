// Pixel-art sprites authored as character grids (Piskel-style), rendered once
// to tiny offscreen canvases at 1 logical pixel per art pixel. The main canvas
// is then scaled up with `image-rendering: pixelated`.

const PALETTE: Record<string, string> = {
  h: "#3d2a7a", // hat
  H: "#6a4fc4", // hat highlight
  s: "#f2c9a0", // skin
  k: "#14102a", // dark / eyes
  w: "#e8e8f0", // beard
  p: "#5b3fa0", // robe
  P: "#8466d6", // robe highlight
  b: "#8a5a2b", // staff
  y: "#ffe27a", // star trim
  v: "#5a4a8a", // bat body
  V: "#8a78c8", // bat highlight
  r: "#ff4d6d", // red eyes
  g: "#8fd6c9", // wraith
  G: "#d6fff6", // wraith highlight
  m: "#e8e6c8", // moon
  M: "#bdb98f", // moon shade
  c: "#cfcaa0", // crater
};

function make(rows: string[]): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0]!.length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite row ${y} is ${row.length} wide, expected ${w}`);
    [...row].forEach((ch, x) => {
      const color = PALETTE[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
  return canvas;
}

function moon(): HTMLCanvasElement {
  const size = 30;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) > 14) continue;
      // crescent-ish shading: darker where far from the lit upper-left
      const lit = Math.hypot(x + 0.5 - (c - 3), y + 0.5 - (c - 3)) < 15;
      ctx.fillStyle = lit ? PALETTE.m! : PALETTE.M!;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = PALETTE.c!;
  for (const [x, y, w, h] of [
    [9, 8, 4, 3],
    [18, 14, 5, 4],
    [10, 19, 3, 3],
    [20, 7, 2, 2],
  ] as const) {
    ctx.fillRect(x, y, w, h);
  }
  return canvas;
}

export interface Sprites {
  wizard: HTMLCanvasElement;
  batA: HTMLCanvasElement;
  batB: HTMLCanvasElement;
  wraith: HTMLCanvasElement;
  moon: HTMLCanvasElement;
}

/** Staff column inside the wizard sprite; the glowing orb floats just above it. */
export const WIZARD_STAFF_COL = 10;

export function buildSprites(): Sprites {
  return {
    wizard: make([
      "....hh......",
      "...hHhh.....",
      "..hhhhhh..b.",
      ".hhhyhhhh.b.",
      "hhhhhhhhhhb.",
      "..ssssss..b.",
      "..skssks..b.",
      "..swwwws..b.",
      "..pwwwwp.sb.",
      "..ppppppppb.",
      "..pPppppPpb.",
      "..ppppppppb.",
      ".pppppppppb.",
      ".pppPppppPb.",
      ".pppppppppb.",
      "..kk..kk..b.",
    ]),
    batA: make([
      "vv........vv",
      "vVv..vv..vVv",
      "vvvvvvvvvvvv",
      ".vvvrvvrvvv.",
      "..vvvvvvvv..",
      "...v.vv.v...",
    ]),
    batB: make([
      "....v..v....",
      "v..vvvvvv..v",
      "vv.vrvvrv.vv",
      "vvvvvvvvvvvv",
      ".vvv.vv.vvv.",
      "..v......v..",
    ]),
    wraith: make([
      "...gggg...",
      "..gGgggg..",
      ".gggggggg.",
      ".gkggggkg.",
      ".gkggggkg.",
      ".gggggggg.",
      ".gggkkggg.",
      ".gggggggg.",
      ".gggggggg.",
      ".gggggggg.",
      ".gg.gg.gg.",
      "..g..g..g.",
    ]),
    moon: moon(),
  };
}
