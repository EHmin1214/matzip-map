// src/utils/generateShareCard.js
// Canvas API로 공유 카드 생성 (Apple Music 스타일 — 컴팩트 카드)

import { SHARED_CAT_COLOR, BEST_CATEGORIES } from "../constants";

const CARD_W = 760;
const EDGE   = 32;
const PAD    = 40;
const INNER  = CARD_W - PAD * 2;
const R      = 28;
const PR     = 16;
const PH     = 480;

/* ── helpers ── */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW, maxLines = 99) {
  const chars = text.split("");
  const lines = [];
  let cur = "";
  for (const ch of chars) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur) {
      if (lines.length + 1 >= maxLines) {
        lines.push(cur.trimEnd() + "…");
        return lines;
      }
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawLogo(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  roundRect(ctx, 20, 14, 28, 34, 2);
  ctx.fillStyle = "#a89a8e";
  ctx.fill();
  roundRect(ctx, 14, 18, 28, 34, 2);
  ctx.fillStyle = "#a89a8e";
  ctx.fill();
  ctx.save();
  roundRect(ctx, 20, 14, 28, 34, 2);
  ctx.clip();
  roundRect(ctx, 14, 18, 28, 34, 2);
  ctx.fillStyle = "#867a6e";
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* ── main ── */

export default async function generateShareCard(place) {
  await document.fonts.ready;

  const FH = "'Noto Serif', Georgia, serif";
  const FL = "'Manrope', -apple-system, sans-serif";

  /* measure name */
  const mc = document.createElement("canvas").getContext("2d");
  mc.font = `700 34px ${FH}`;
  const nameLines = wrapLines(mc, place.name, INNER, 2);
  const nameLH = 44;

  /* subtitle */
  const cat = BEST_CATEGORIES.find((c) => c.key === place.category);
  const parts = [];
  if (cat) parts.push(cat.label);
  if (place.address) {
    parts.push(place.address.length > 24 ? place.address.slice(0, 24) + "…" : place.address);
  }
  const subtitle = parts.join(" · ");

  /* card height */
  let ch = PAD;
  ch += PH + 24;
  ch += nameLines.length * nameLH;
  if (subtitle) ch += 6 + 20;
  ch += 24 + 1 + 16;
  ch += 32;
  ch += PAD;

  /* canvas (card + shadow breathing room) */
  const W = CARD_W + EDGE * 2;
  const H = ch + EDGE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  /* card shadow + white bg */
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, EDGE, EDGE, CARD_W, ch, R);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  /* clip to card */
  ctx.save();
  roundRect(ctx, EDGE, EDGE, CARD_W, ch, R);
  ctx.clip();
  ctx.textBaseline = "top";

  const L = EDGE + PAD;
  let y = EDGE + PAD;

  /* ── photo ── */
  let hasPhoto = false;
  if (place.photo_url || place.photo_urls?.length) {
    try {
      const img = await loadImage(place.photo_urls?.[0] || place.photo_url);
      ctx.save();
      roundRect(ctx, L, y, INNER, PH, PR);
      ctx.clip();
      const ir = img.width / img.height, br = INNER / PH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (ir > br) { sw = sh * br; sx = (img.width - sw) / 2; }
      else { sh = sw / br; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, L, y, INNER, PH);
      ctx.restore();
      hasPhoto = true;
    } catch { /* ignore */ }
  }
  if (!hasPhoto) {
    const cc = SHARED_CAT_COLOR[place.category] || "#655d54";
    ctx.save();
    roundRect(ctx, L, y, INNER, PH, PR);
    ctx.clip();
    ctx.fillStyle = cc + "12";
    ctx.fillRect(L, y, INNER, PH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "120px serif";
    ctx.fillStyle = cc + "40";
    ctx.fillText(cat?.emoji || "📍", EDGE + CARD_W / 2, y + PH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.restore();
  }
  y += PH + 24;

  /* ── name ── */
  ctx.font = `700 34px ${FH}`;
  ctx.fillStyle = "#1c1c1e";
  for (const line of nameLines) {
    ctx.fillText(line, L, y);
    y += nameLH;
  }

  /* ── subtitle (● category · address) ── */
  if (subtitle) {
    y += 6;
    ctx.font = `400 16px ${FL}`;
    if (cat) {
      const cc = SHARED_CAT_COLOR[place.category] || "#655d54";
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.arc(L + 5, y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8e8e93";
      ctx.fillText(subtitle, L + 16, y);
    } else {
      ctx.fillStyle = "#8e8e93";
      ctx.fillText(subtitle, L, y);
    }
    y += 20;
  }

  /* ── divider ── */
  y += 24;
  ctx.fillStyle = "#e8e8ed";
  ctx.fillRect(L, y, INNER, 1);
  y += 1 + 16;

  /* ── branding ── */
  drawLogo(ctx, L - 8, y - 8, 0.65);
  ctx.font = `italic 700 17px ${FH}`;
  ctx.fillStyle = "#655d54";
  ctx.fillText("나의 공간", L + 34, y + 1);

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function shareCard(place) {
  const blob = await generateShareCard(place);
  const file = new File([blob], `${place.name}-myplace.png`, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: place.name });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${place.name}-myplace.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "downloaded";
}
