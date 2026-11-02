import { useEffect, useRef } from "react";
import type { Course, SavedRound } from "../types";
import { holeKind, mixFor, snowCount, verdict } from "../engine/scoring";
import { formatDate, vsPar } from "../engine/id";
import { perNine, playedRounds } from "../engine/handicap";
import { useStore } from "../store";
import pete from "../assets/pete.png";

export function RoundCard({ round, pid, course }: { round: SavedRound; pid: string; course: Course }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useStore();
  const player = state.players.find((p) => p.id === pid)?.name ?? "Player";

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const scores = round.scores[pid];
    if (!scores) return;
    const par = course.par.slice(0, scores.length);
    const total = scores.reduce((a, b) => a + b, 0);
    const parTotal = par.reduce((a, b) => a + b, 0);
    const prs = playedRounds(pid, state.rounds, state.courses);
    const mine = prs.find((p) => p.round.id === round.id);
    const prior = prs.filter((p) => p.round.id !== round.id && p.holes === scores.length);
    const isBest = Boolean(mine && prior.length && perNine(mine) < Math.min(...prior.map(perNine)));
    const mx = mixFor(scores, par);
    const sn = snowCount(scores);

    const W = 1080;
    const paper = "#ffffff";
    const ink = "#111111";
    const muted = "#6a6e6b";
    const green = "#3d6b4e";
    const warn = "#9a3b2a";
    const n = scores.length;
    const rows = n > 9 ? 2 : 1;
    const per = n > 9 ? 9 : n;
    const cw = (W - 160) / per;
    const g = cv.getContext("2d");
    if (!g) return;

    const line = verdict(scores, par, isBest);
    g.font = "56px 'Punk Head Pete', cursive";
    const words = line.split(" ");
    const vlines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (g.measureText(t).width > W - 160 && cur) {
        vlines.push(cur);
        cur = w;
      } else cur = t;
    }
    vlines.push(cur);

    const logoY = 70;
    const nameY = 250;
    const scoreY = 560;
    const y0 = scoreY + 110;
    const sy = y0 + (rows - 1) * 120 + 80;
    const vy = sy + 225;
    const footY = vy + (vlines.length - 1) * 64 + 50;
    const H = footY + 70;
    cv.height = H;
    cv.width = W;

    g.fillStyle = paper;
    g.fillRect(0, 0, W, H);
    g.fillStyle = ink;
    g.fillRect(0, 0, W, 14);

    g.font = "64px 'Punk Head Pete', cursive";
    g.fillStyle = ink;
    g.fillText("Punk Head Pete", 80, logoY + 50);
    g.font = "700 22px Archivo, sans-serif";
    g.fillStyle = muted;
    g.fillText("GOLF", 80, logoY + 84);

    g.fillStyle = ink;
    g.fillRect(80, logoY + 110, W - 160, 4);

    g.fillStyle = muted;
    g.font = "700 28px Archivo, sans-serif";
    g.fillText(course.name.toUpperCase(), 80, 210);
    g.fillText(formatDate(round.date).toUpperCase(), 80, 248);

    g.fillStyle = ink;
    g.font = "800 64px Archivo, sans-serif";
    g.fillText(player.toUpperCase(), 80, nameY + 80);

    g.font = "900 280px Archivo, sans-serif";
    g.fillText(String(total), 70, scoreY);
    const sw = g.measureText(String(total)).width;
    const ov = total - parTotal;
    g.font = "800 90px Archivo, sans-serif";
    g.fillStyle = ov <= 0 ? green : ink;
    g.fillText(vsPar(total, parTotal), Math.min(W - 300, 90 + sw), scoreY - 50);
    g.fillStyle = muted;
    g.font = "600 30px Archivo, sans-serif";
    g.fillText(`Par ${parTotal} · ${n} holes`, Math.min(W - 300, 90 + sw), scoreY);

    for (let rI = 0; rI < rows; rI++) {
      for (let i = 0; i < per; i++) {
        const idx = rI * 9 + i;
        if (idx >= n) break;
        const v = scores[idx];
        const p = par[idx];
        const cx = 80 + cw * i + cw / 2;
        const cy = y0 + rI * 120;
        const k = holeKind(v, p);
        g.lineWidth = 4;
        g.fillStyle = muted;
        g.font = "700 20px Archivo, sans-serif";
        g.textAlign = "center";
        g.fillText(String(idx + 1), cx, cy - 48);
        if (k === "birdie" || k === "eagle") {
          g.strokeStyle = green;
          g.beginPath();
          g.arc(cx, cy, 32, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = green;
        } else if (k === "bogey" || k === "double") {
          g.strokeStyle = ink;
          g.strokeRect(cx - 30, cy - 30, 60, 60);
          if (k === "double") g.strokeRect(cx - 39, cy - 39, 78, 78);
          g.fillStyle = ink;
        } else if (k === "snow") {
          g.fillStyle = warn;
          g.fillRect(cx - 32, cy - 32, 64, 64);
          g.fillStyle = "#fff";
        } else if (k === "triple") {
          g.fillStyle = ink;
          g.fillRect(cx - 32, cy - 32, 64, 64);
          g.fillStyle = paper;
        } else g.fillStyle = ink;
        g.font = "800 38px Archivo, sans-serif";
        g.fillText(String(v), cx, cy + 13);
      }
    }
    g.textAlign = "left";
    g.fillStyle = "#e4e5e2";
    g.fillRect(80, sy, W - 160, 2);
    [
      [mx.birdie, "Birdies"],
      [mx.par, "Pars"],
      [sn, "Snowmen"],
    ].forEach(([val, label], i) => {
      const sx = 80 + i * ((W - 160) / 3);
      g.fillStyle = label === "Snowmen" && Number(val) ? warn : ink;
      g.font = "900 72px Archivo, sans-serif";
      g.fillText(String(val), sx, sy + 95);
      g.fillStyle = muted;
      g.font = "700 22px Archivo, sans-serif";
      g.fillText(String(label).toUpperCase(), sx, sy + 130);
    });

    g.fillStyle = ink;
    g.font = "56px 'Punk Head Pete', cursive";
    vlines.forEach((l, i) => g.fillText(l, 80, vy + i * 64));

    g.fillStyle = ink;
    g.fillRect(0, footY, W, 70);
    g.fillStyle = paper;
    g.font = "700 24px Archivo, sans-serif";
    g.fillText("IF YOU KNOW, YOU GOLF", 80, footY + 44);
    g.textAlign = "right";
    g.fillText("TRIAL · PUNKHEADPETE.COM", W - 80, footY + 44);
    g.textAlign = "left";
  }, [round, pid, course, player, state.rounds, state.courses, state.players]);

  function save() {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `pete-scorecard-${round.date}-${player}.png`.replace(/[^\w.-]+/g, "-").toLowerCase();
      a.click();
    }, "image/png");
  }

  return (
    <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
      <img src={pete} alt="" className="pete" hidden />
      <span className="eyebrow">Round card</span>
      <canvas ref={canvasRef} width={1080} height={1350} className="cardimg" role="img" aria-label="Round card image" />
      <button className="btn solid" type="button" onClick={save}>
        Save image
      </button>
    </div>
  );
}
