import { useEffect, useRef, useState } from "react";
import { GameAudio } from "../game/audio";
import { Game, H, W, type Input, type Phase, type RunStats } from "../game/engine";
import { bests, formatTime, loadRuns, requestPersistentStorage, saveRun, type RunResult } from "../game/results";

interface Sources {
  kbMove: number;
  touchMove: number;
  kbTurn: number;
  kbFire: boolean;
  ptrFire: boolean;
  aim: { x: number; y: number } | undefined;
}

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>();
  const srcRef = useRef<Sources>({ kbMove: 0, touchMove: 0, kbTurn: 0, kbFire: false, ptrFire: false, aim: undefined });
  const audioRef = useRef<GameAudio>();
  if (!audioRef.current) audioRef.current = new GameAudio();
  const timeEl = useRef<HTMLSpanElement>(null);
  const scoreEl = useRef<HTMLSpanElement>(null);
  const livesEl = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [final, setFinal] = useState<RunStats>();
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [muted, setMuted] = useState(audioRef.current.muted);

  useEffect(() => {
    void loadRuns().then(setRuns);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const game = new Game();
    gameRef.current = game;
    const audio = audioRef.current!;
    game.onEvent = (sound) => audio.play(sound);

    const src = srcRef.current;
    const pointers = new Set<number>();

    const toLogical = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };

    const syncKeys = (keys: Set<string>) => {
      src.kbMove = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      src.kbTurn = (keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0);
      src.kbFire = keys.has(" ");
    };
    const keys = new Set<string>();
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ([" ", "arrowleft", "arrowright", "a", "d", "q", "e"].includes(k)) {
        if (k === " " || k.startsWith("arrow")) e.preventDefault();
        if (down) keys.add(k);
        else keys.delete(k);
        syncKeys(keys);
      }
      if (down && (k === "p" || k === "escape")) {
        if (game.phase === "playing") game.pause();
        else game.resume();
      }
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.add(e.pointerId);
      src.aim = toLogical(e);
      src.ptrFire = true;
    };
    const onMove = (e: PointerEvent) => {
      // Mouse always aims, even unpressed; touch only aims while a finger is down.
      if (e.pointerType === "mouse" || pointers.has(e.pointerId)) src.aim = toLogical(e);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) src.ptrFire = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const onVisibility = () => {
      if (document.hidden) game.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let last = performance.now();
    let raf = 0;
    let shownPhase: Phase = "ready";
    let lastHud = "";

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const input: Input = {
        moveX: src.kbMove !== 0 ? src.kbMove : src.touchMove,
        aim: src.aim,
        aimTurn: src.kbTurn,
        firing: src.kbFire || src.ptrFire,
      };
      game.step(dt, input);
      audio.setIntensity(game.time / 150);
      game.render(ctx);

      const hud = `${formatTime(game.time)}|${game.score}|${game.lives}`;
      if (hud !== lastHud) {
        lastHud = hud;
        if (timeEl.current) timeEl.current.textContent = formatTime(game.time);
        if (scoreEl.current) scoreEl.current.textContent = String(game.score).padStart(4, "0");
        if (livesEl.current) livesEl.current.textContent = "♥".repeat(Math.max(0, game.lives)) + "♡".repeat(Math.max(0, 3 - game.lives));
      }

      if (game.phase !== shownPhase) {
        shownPhase = game.phase;
        setPhase(game.phase);
        if (game.phase === "playing") audio.startMusic();
        else audio.stopMusic();
        if (game.phase === "over") {
          const stats = game.stats();
          setFinal(stats);
          // Only the final result is persisted, and only once the run is over.
          void saveRun(stats).then(setRuns);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      audio.stopMusic();
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const best = bests(runs);

  // Audio can only start from a user gesture, so unlock it on the button taps.
  const begin = () => {
    void requestPersistentStorage();
    audioRef.current?.unlock();
    gameRef.current?.start();
  };
  const resume = () => {
    audioRef.current?.unlock();
    gameRef.current?.resume();
  };
  const holdMove = (dir: -1 | 1) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      srcRef.current.touchMove = dir;
    },
    onPointerUp: () => {
      if (srcRef.current.touchMove === dir) srcRef.current.touchMove = 0;
    },
    onPointerCancel: () => {
      if (srcRef.current.touchMove === dir) srcRef.current.touchMove = 0;
    },
  });
  const toggleMute = () => {
    const next = !muted;
    audioRef.current?.setMuted(next);
    setMuted(next);
  };

  return (
    <div className="stage">
      <div className="frame" onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} width={W} height={H} />

        <button className="mute" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>

        <div className="hud">
          <span ref={livesEl} className="lives">
            ♥♥♥
          </span>
          <span ref={timeEl} className="time">
            00:00.0
          </span>
          <span ref={scoreEl} className="score">
            0000
          </span>
        </div>

        {phase === "playing" && (
          <div className="touch-controls">
            <button aria-label="Move left" {...holdMove(-1)}>
              ◀
            </button>
            <button aria-label="Move right" {...holdMove(1)}>
              ▶
            </button>
          </div>
        )}

        {phase === "ready" && (
          <div className="overlay">
            <h1>Night Wizard</h1>
            <p>Bats and wraiths swarm the night sky. Blast them with your orb. Survive as long as you can.</p>
            <ul className="controls">
              <li>
                <b>Touch</b> ◀ ▶ buttons move · touch the sky to aim &amp; shoot
              </li>
              <li>
                <b>Keys</b> A/D or ←/→ move · mouse aims · click or Space shoots · P pauses
              </li>
            </ul>
            <button className="primary" onClick={begin}>
              Start
            </button>
            {best.score > 0 && (
              <p className="muted">
                Best {best.score} pts · longest {formatTime(best.seconds)}
              </p>
            )}
          </div>
        )}

        {phase === "paused" && (
          <div className="overlay">
            <h1>Paused</h1>
            <button className="primary" onClick={resume}>
              Resume
            </button>
          </div>
        )}

        {phase === "over" && final && (
          <div className="overlay">
            <h1>The night wins</h1>
            <p className="big">{formatTime(final.seconds)}</p>
            <p>
              {final.score} pts · {final.kills} slain
            </p>
            <p className="muted">
              Best {best.score} pts · longest {formatTime(best.seconds)}
            </p>
            <button className="primary" onClick={begin}>
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
