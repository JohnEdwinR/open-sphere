import type { Sound } from "./audio";
import { buildSprites, WIZARD_STAFF_COL, type Sprites } from "./sprites";

/** Logical (pre-scale) resolution; the canvas is scaled up pixelated. */
export const W = 180;
export const H = 320;
const GROUND_Y = 288;
const WIZARD_W = 12;
const WIZARD_H = 16;
const WIZARD_SPEED = 90;
const FIRE_COOLDOWN = 0.26;
const BOLT_SPEED = 210;
const START_LIVES = 3;

export type Phase = "ready" | "playing" | "paused" | "over";

export interface Input {
  /** -1..1 horizontal movement. */
  moveX: number;
  /** Aim target in logical coordinates; undefined keeps the last angle. */
  aim: { x: number; y: number } | undefined;
  /** Keyboard aim rotation, -1..1 (radians/sec scaled inside). */
  aimTurn: number;
  firing: boolean;
}

export interface RunStats {
  seconds: number;
  score: number;
  kills: number;
}

type FoeKind = "bat" | "wraith";

interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Foe {
  kind: FoeKind;
  x: number;
  y: number;
  hp: number;
  t: number;
  speed: number;
  amp: number;
  freq: number;
  wobblePhase: number;
  flash: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  phase: number;
  big: boolean;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

const SKY_BANDS = ["#05071a", "#080c26", "#0d1233", "#131a44", "#1b2058", "#262266"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Filled pixel disc (no anti-aliasing, so it stays crisp when scaled up). */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
  ctx.globalAlpha = 1;
}

export class Game {
  phase: Phase = "ready";
  time = 0;
  score = 0;
  kills = 0;
  lives = START_LIVES;
  /** Hook for sound effects; the engine itself stays audio-agnostic. */
  onEvent: ((sound: Sound) => void) | undefined;

  private sprites: Sprites = buildSprites();
  private clock = 0;
  private wizardX = W / 2;
  private moving = false;
  private aimAngle = -Math.PI / 2;
  private cooldown = 0;
  private invuln = 0;
  private shake = 0;
  private spawnTimer = 1;
  private bolts: Bolt[] = [];
  private foes: Foe[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = Array.from({ length: 70 }, () => ({
    x: Math.floor(Math.random() * W),
    y: Math.floor(Math.random() * 230),
    speed: 1 + Math.random() * 3,
    phase: Math.random() * 6.28,
    big: Math.random() < 0.12,
  }));
  private clouds: Cloud[] = Array.from({ length: 4 }, (_, i) => ({
    x: Math.random() * W,
    y: 40 + i * 38 + Math.random() * 10,
    w: 28 + Math.floor(Math.random() * 22),
    speed: 2 + Math.random() * 5,
  }));
  private meteor: { x: number; y: number; vx: number; vy: number; life: number } | undefined;
  private meteorTimer = 4;

  start() {
    this.time = 0;
    this.score = 0;
    this.kills = 0;
    this.lives = START_LIVES;
    this.wizardX = W / 2;
    this.aimAngle = -Math.PI / 2;
    this.cooldown = 0;
    this.invuln = 0;
    this.shake = 0;
    this.spawnTimer = 1;
    this.bolts = [];
    this.foes = [];
    this.particles = [];
    this.phase = "playing";
    this.onEvent?.("start");
  }

  pause() {
    if (this.phase === "playing") this.phase = "paused";
  }

  resume() {
    if (this.phase === "paused") this.phase = "playing";
  }

  stats(): RunStats {
    return { seconds: this.time, score: this.score, kills: this.kills };
  }

  /** Advance the simulation. The night sky animates in every phase; gameplay only while playing. */
  step(dt: number, input: Input) {
    this.clock += dt;
    this.stepBackground(dt);
    if (this.phase !== "playing") return;

    this.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.cooldown -= dt;

    this.moving = Math.abs(input.moveX) > 0.1;
    this.wizardX = clamp(this.wizardX + input.moveX * WIZARD_SPEED * dt, WIZARD_W / 2, W - WIZARD_W / 2);

    const tip = this.orbTip();
    if (input.aim) this.aimAngle = this.clampAim(Math.atan2(input.aim.y - tip.y, input.aim.x - tip.x));
    if (input.aimTurn !== 0) this.aimAngle = this.clampAim(this.aimAngle + input.aimTurn * 2.2 * dt);

    if (input.firing && this.cooldown <= 0) {
      this.cooldown = FIRE_COOLDOWN;
      this.onEvent?.("shoot");
      this.bolts.push({
        x: tip.x,
        y: tip.y,
        vx: Math.cos(this.aimAngle) * BOLT_SPEED,
        vy: Math.sin(this.aimAngle) * BOLT_SPEED,
        life: 1.6,
      });
    }

    this.spawn(dt);
    this.stepBolts(dt);
    this.stepFoes(dt);
    this.stepParticles(dt);

    if (this.lives <= 0) {
      this.phase = "over";
      this.onEvent?.("over");
    }
  }

  private clampAim(a: number): number {
    // Only the upper half-plane: the wizard never shoots his own feet.
    let angle = a;
    if (angle > 0) angle = angle < Math.PI / 2 ? -0.12 : -Math.PI + 0.12;
    return clamp(angle, -Math.PI + 0.12, -0.12);
  }

  private orbTip() {
    return { x: this.wizardX - WIZARD_W / 2 + WIZARD_STAFF_COL + 0.5, y: GROUND_Y - WIZARD_H - 1 };
  }

  private spawn(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    // Difficulty ramps with elapsed time.
    this.spawnTimer = Math.max(0.35, 1.3 - this.time * 0.012);
    const speed = Math.min(72, 26 + this.time * 0.45);
    const wraith = Math.random() < Math.min(0.45, this.time / 140);

    const fromTop = Math.random() < 0.55;
    const side = Math.random() < 0.5 ? -10 : W + 10;
    this.foes.push({
      kind: wraith ? "wraith" : "bat",
      x: fromTop ? 10 + Math.random() * (W - 20) : side,
      y: fromTop ? -12 : 12 + Math.random() * 110,
      hp: wraith ? 2 : 1,
      t: 0,
      speed: wraith ? speed * 0.6 : speed,
      amp: wraith ? 16 : 22,
      freq: wraith ? 2 : 7,
      wobblePhase: Math.random() * 6.28,
      flash: 0,
    });
  }

  private stepBolts(dt: number) {
    for (const bolt of this.bolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
    }
    this.bolts = this.bolts.filter((b) => b.life > 0 && b.x > -8 && b.x < W + 8 && b.y > -8 && b.y < H);
  }

  private stepFoes(dt: number) {
    const tx = this.wizardX;
    const ty = GROUND_Y - 8;
    const survivors: Foe[] = [];

    for (const foe of this.foes) {
      foe.t += dt;
      foe.flash = Math.max(0, foe.flash - dt);

      const d = Math.hypot(tx - foe.x, ty - foe.y) || 1;
      const dx = (tx - foe.x) / d;
      const dy = (ty - foe.y) / d;
      const wobble = Math.sin(foe.t * foe.freq + foe.wobblePhase) * foe.amp;
      // Home in on the wizard, weaving along the perpendicular.
      foe.x += (dx * foe.speed - dy * wobble) * dt;
      foe.y += (dy * foe.speed + dx * wobble) * dt;

      // Bolt hits
      let dead = false;
      for (const bolt of this.bolts) {
        if (bolt.life <= 0) continue;
        if (Math.hypot(bolt.x - foe.x, bolt.y - foe.y) < 7) {
          bolt.life = 0;
          foe.hp -= 1;
          foe.flash = 0.1;
          this.burst(bolt.x, bolt.y, 4, ["#aef6ff", "#ffffff"]);
          if (foe.hp > 0) this.onEvent?.("hit");
          if (foe.hp <= 0) {
            this.onEvent?.(foe.kind === "wraith" ? "killWraith" : "killBat");
            dead = true;
            this.score += foe.kind === "wraith" ? 25 : 10;
            this.kills += 1;
            this.burst(foe.x, foe.y, 14, foe.kind === "wraith" ? ["#8fd6c9", "#d6fff6"] : ["#8a78c8", "#ff4d6d"]);
          }
          break;
        }
      }
      if (dead) continue;

      // Reaches the wizard
      if (Math.hypot(tx - foe.x, ty - foe.y) < 9) {
        if (this.invuln <= 0) {
          this.lives -= 1;
          this.invuln = 1.2;
          this.shake = 0.25;
          this.onEvent?.("hurt");
          this.burst(tx, ty, 16, ["#ff4d6d", "#ffe27a"]);
        }
        this.burst(foe.x, foe.y, 8, ["#8a78c8"]);
        continue;
      }
      survivors.push(foe);
    }
    this.foes = survivors;
  }

  private burst(x: number, y: number, n: number, colors: string[]) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 60;
      const max = 0.3 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: max,
        max,
        color: colors[i % colors.length]!,
      });
    }
  }

  private stepParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private stepBackground(dt: number) {
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) c.x = W + 4;
    }
    this.meteorTimer -= dt;
    if (!this.meteor && this.meteorTimer <= 0) {
      this.meteor = { x: 40 + Math.random() * 140, y: Math.random() * 60, vx: -110, vy: 55, life: 0.9 };
      this.meteorTimer = 5 + Math.random() * 8;
    }
    if (this.meteor) {
      this.meteor.x += this.meteor.vx * dt;
      this.meteor.y += this.meteor.vy * dt;
      this.meteor.life -= dt;
      if (this.meteor.life <= 0) this.meteor = undefined;
    }
  }

  // ---------------------------------------------------------------- render

  render(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));

    this.drawSky(ctx);
    this.drawHills(ctx);
    this.drawFoes(ctx);
    this.drawBolts(ctx);
    this.drawWizard(ctx);
    this.drawParticles(ctx);
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    const bandH = Math.ceil(H / SKY_BANDS.length);
    SKY_BANDS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandH, W, bandH);
    });

    for (const s of this.stars) {
      const tw = Math.sin(this.clock * s.speed + s.phase);
      ctx.fillStyle = tw > 0.4 ? "#ffffff" : tw > -0.3 ? "#9aa6ff" : "#4a528f";
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big && tw > 0) {
        ctx.fillRect(s.x - 1, s.y, 3, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 3);
      }
    }

    if (this.meteor) {
      const m = this.meteor;
      for (let i = 0; i < 7; i++) {
        ctx.globalAlpha = 1 - i / 7;
        ctx.fillStyle = i < 2 ? "#ffffff" : "#8fb4ff";
        ctx.fillRect(Math.round(m.x - m.vx * i * 0.012), Math.round(m.y - m.vy * i * 0.012), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // Moon with a stepped halo, drifting very slowly
    const mx = Math.round(128 - this.wizardX * 0.04);
    const my = 40 + Math.round(Math.sin(this.clock * 0.2) * 1.5);
    disc(ctx, mx + 15, my + 15, 26, "#c9c6ff", 0.05);
    disc(ctx, mx + 15, my + 15, 21, "#c9c6ff", 0.07);
    ctx.drawImage(this.sprites.moon, mx, my);

    // Drifting pixel clouds
    ctx.fillStyle = "rgba(48, 56, 130, 0.5)";
    for (const c of this.clouds) {
      const x = Math.round(c.x);
      const y = Math.round(c.y);
      ctx.fillRect(x + 4, y, c.w - 8, 2);
      ctx.fillRect(x, y + 2, c.w, 3);
      ctx.fillRect(x + 3, y + 5, c.w - 6, 2);
    }
  }

  private drawHills(ctx: CanvasRenderingContext2D) {
    const layer = (base: number, amp: number, f1: number, f2: number, parallax: number, color: string) => {
      ctx.fillStyle = color;
      const off = this.wizardX * parallax;
      for (let x = 0; x < W; x++) {
        const y = Math.round(base + Math.sin((x + off) * f1) * amp + Math.sin((x + off) * f2) * amp * 0.5);
        ctx.fillRect(x, y, 1, H - y);
      }
    };
    layer(246, 12, 0.035, 0.09, 0.15, "#10153d");
    layer(266, 8, 0.05, 0.13, 0.3, "#0b0e2b");

    // Foreground ground with grass tufts
    ctx.fillStyle = "#06081a";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = "#12304a";
    for (let x = 3; x < W; x += 9) {
      const sway = Math.round(Math.sin(this.clock * 2 + x) * 0.6);
      ctx.fillRect(x, GROUND_Y - 1, 1, 1);
      ctx.fillRect(x + 1 + sway, GROUND_Y - 2, 1, 2);
    }
  }

  private drawWizard(ctx: CanvasRenderingContext2D) {
    if (this.invuln > 0 && Math.floor(this.invuln / 0.08) % 2 === 0) return;
    const bob = this.moving ? Math.round(Math.sin(this.clock * 18)) : 0;
    const x = Math.round(this.wizardX - WIZARD_W / 2);
    const y = GROUND_Y - WIZARD_H + bob;
    ctx.drawImage(this.sprites.wizard, x, y);

    // Glowing orb on the staff
    const ox = x + WIZARD_STAFF_COL;
    const oy = y - 1;
    const pulse = Math.round(Math.sin(this.clock * 5));
    disc(ctx, ox, oy, 7 + pulse, "#4fc3f7", 0.12);
    disc(ctx, ox, oy, 5, "#4fc3f7", 0.25);
    disc(ctx, ox, oy, 3, "#aef6ff");
    disc(ctx, ox, oy, 1, "#ffffff");

    // Aim dots
    if (this.phase === "playing") {
      const tip = this.orbTip();
      ctx.fillStyle = "rgba(174, 246, 255, 0.55)";
      for (const dist of [14, 21, 28]) {
        ctx.fillRect(Math.round(tip.x + Math.cos(this.aimAngle) * dist), Math.round(tip.y + Math.sin(this.aimAngle) * dist), 1, 1);
      }
    }
  }

  private drawFoes(ctx: CanvasRenderingContext2D) {
    for (const foe of this.foes) {
      const sprite =
        foe.kind === "wraith" ? this.sprites.wraith : Math.floor(foe.t * 10) % 2 === 0 ? this.sprites.batA : this.sprites.batB;
      const x = Math.round(foe.x - sprite.width / 2);
      const bob = foe.kind === "wraith" ? Math.round(Math.sin(foe.t * 4)) : 0;
      const y = Math.round(foe.y - sprite.height / 2) + bob;
      if (foe.kind === "wraith") ctx.globalAlpha = 0.85;
      ctx.drawImage(sprite, x, y);
      ctx.globalAlpha = 1;
      if (foe.flash > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.8;
        ctx.drawImage(sprite, x, y);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  private drawBolts(ctx: CanvasRenderingContext2D) {
    for (const b of this.bolts) {
      const len = Math.hypot(b.vx, b.vy) || 1;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.5 - i * 0.12;
        ctx.fillStyle = "#4fc3f7";
        ctx.fillRect(Math.round(b.x - (b.vx / len) * i * 3) - 1, Math.round(b.y - (b.vy / len) * i * 3) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      disc(ctx, Math.round(b.x), Math.round(b.y), 3, "#4fc3f7", 0.35);
      disc(ctx, Math.round(b.x), Math.round(b.y), 1, "#ffffff");
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}
