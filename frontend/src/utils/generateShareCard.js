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

/* ══════════════════════════════════════════════════════════
   프로필 공유 카드 (Apple Music 스타일)
   ══════════════════════════════════════════════════════════ */

const STATUS_DOT = { want_to_go: "#BA7517", visited: "#1D9E75", want_revisit: "#D4537E" };
const MAP_H = 850;  // 4:5 ratio (INNER 680 * 5/4)

function drawDotMap(ctx, places, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  /* 배경 — 지도 느낌의 그라디언트 */
  const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bgGrad.addColorStop(0, "#eae7e0");
  bgGrad.addColorStop(0.3, "#f0efec");
  bgGrad.addColorStop(0.7, "#ece9e3");
  bgGrad.addColorStop(1, "#f2f0ec");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  if (places.length === 0) {
    ctx.font = `italic 400 16px 'Noto Serif', Georgia, serif`;
    ctx.fillStyle = "#a8a29e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("아직 저장된 공간이 없어요", x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.restore();
    return;
  }

  /* bounds */
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  places.forEach((p) => {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  });
  const lp = Math.max((maxLat - minLat) * 0.18, 0.004);
  const gp = Math.max((maxLng - minLng) * 0.18, 0.004);
  minLat -= lp; maxLat += lp; minLng -= gp; maxLng += gp;
  const latR = maxLat - minLat || 0.01;
  const lngR = maxLng - minLng || 0.01;

  /* 지도 배경 — 불규칙한 도로/블록 패턴 */
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#c5c0b8";
  ctx.lineWidth = 1;
  // 가로 도로
  const seed = places.length * 7;
  for (let i = 0; i < 8; i++) {
    const ry = y + h * ((i * 0.13 + 0.04 + (((seed + i * 37) % 100) / 1000)));
    const thick = (i % 3 === 0) ? 2.5 : 1;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(x, ry);
    // 약간 구불구불한 선
    for (let sx = 0; sx <= w; sx += w / 4) {
      const offset = ((seed + i * 13 + sx) % 20) - 10;
      ctx.lineTo(x + sx, ry + offset * 0.3);
    }
    ctx.stroke();
  }
  // 세로 도로
  for (let i = 0; i < 6; i++) {
    const rx = x + w * ((i * 0.17 + 0.06 + (((seed + i * 53) % 100) / 1000)));
    const thick = (i % 2 === 0) ? 2.5 : 1;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(rx, y);
    for (let sy = 0; sy <= h; sy += h / 4) {
      const offset = ((seed + i * 17 + sy) % 20) - 10;
      ctx.lineTo(rx + offset * 0.3, y + sy);
    }
    ctx.stroke();
  }

  /* 블록 채움 — 도시 느낌 */
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#a09888";
  for (let i = 0; i < 12; i++) {
    const bx = x + ((seed * 3 + i * 67) % (w - 60 | 0));
    const by = y + ((seed * 5 + i * 43) % (h - 40 | 0));
    const bw = 30 + ((seed + i * 23) % 40);
    const bh = 20 + ((seed + i * 31) % 30);
    roundRect(ctx, bx, by, bw, bh, 3);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  /* grid lines (subtle) */
  ctx.strokeStyle = "#ddd9d2";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 6; i++) {
    const gy = y + (h / 6) * i;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    const gx = x + (w / 6) * i;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
  }

  /* dots */
  const dotR = places.length > 30 ? 5 : places.length > 15 ? 6 : 7;
  const mp = 24;
  places.forEach((p) => {
    const px = x + mp + ((p.lng - minLng) / lngR) * (w - mp * 2);
    const py = y + mp + ((maxLat - p.lat) / latR) * (h - mp * 2);
    const color = STATUS_DOT[p.status] || "#655d54";
    // glow
    ctx.beginPath(); ctx.arc(px, py, dotR + 6, 0, Math.PI * 2);
    ctx.fillStyle = color + "15"; ctx.fill();
    // outer ring
    ctx.beginPath(); ctx.arc(px, py, dotR + 3, 0, Math.PI * 2);
    ctx.fillStyle = color + "25"; ctx.fill();
    // dot
    ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  });

  ctx.restore();
}

function drawDotsOverlay(ctx, places, x, y, w, h) {
  if (!places.length) return;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  places.forEach((p) => {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  });
  const lp = Math.max((maxLat - minLat) * 0.18, 0.004);
  const gp = Math.max((maxLng - minLng) * 0.18, 0.004);
  minLat -= lp; maxLat += lp; minLng -= gp; maxLng += gp;
  const latR = maxLat - minLat || 0.01;
  const lngR = maxLng - minLng || 0.01;
  const dotR = places.length > 30 ? 5 : places.length > 15 ? 6 : 7;
  const mp = 24;
  places.forEach((p) => {
    const px = x + mp + ((p.lng - minLng) / lngR) * (w - mp * 2);
    const py = y + mp + ((maxLat - p.lat) / latR) * (h - mp * 2);
    const color = STATUS_DOT[p.status] || "#655d54";
    // shadow
    ctx.beginPath(); ctx.arc(px, py, dotR + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fill();
    // dot
    ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke();
  });
}

export async function generateProfileCard(user, places, mapImage) {
  await document.fonts.ready;

  const FH = "'Noto Serif', Georgia, serif";
  const FL = "'Manrope', -apple-system, sans-serif";

  const statLine = `총 ${places.length}개의 큐레이션 공간`;

  /* card height (2x fonts) */
  let ch = PAD + MAP_H + 36;    // map + gap
  ch += 96;                       // avatar row (88px avatar)
  ch += 16 + 36;                  // gap + stat line
  ch += 40 + 1 + 28 + 48 + PAD;  // divider area + brand + bottom

  const W = CARD_W + EDGE * 2;
  const H = ch + EDGE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  /* shadow + card bg */
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 24; ctx.shadowOffsetY = 4;
  roundRect(ctx, EDGE, EDGE, CARD_W, ch, R);
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.restore();

  /* clip */
  ctx.save();
  roundRect(ctx, EDGE, EDGE, CARD_W, ch, R);
  ctx.clip();
  ctx.textBaseline = "top";

  const L = EDGE + PAD;
  let y = EDGE + PAD;

  /* map — static map image + dots overlay, or fallback dots */
  ctx.save();
  roundRect(ctx, L, y, INNER, MAP_H, PR);
  ctx.clip();
  if (mapImage) {
    // 지도 이미지 그리기 (중앙 맞춤)
    const ir = mapImage.width / mapImage.height;
    const br = INNER / MAP_H;
    let sx = 0, sy = 0, sw = mapImage.width, sh = mapImage.height;
    if (ir > br) { sw = sh * br; sx = (mapImage.width - sw) / 2; }
    else { sh = sw / br; sy = (mapImage.height - sh) / 2; }
    ctx.drawImage(mapImage, sx, sy, sw, sh, L, y, INNER, MAP_H);
    // 지도 위에 dot 마커 오버레이
    drawDotsOverlay(ctx, places, L, y, INNER, MAP_H);
  } else {
    drawDotMap(ctx, places, L, y, INNER, MAP_H, PR);
  }
  ctx.restore();
  y += MAP_H + 36;

  /* avatar + name row (2x) */
  const avatarSize = 88;
  if (user.profile_photo_url) {
    try {
      const img = await loadImage(user.profile_photo_url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(L + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, L, y, avatarSize, avatarSize);
      ctx.restore();
    } catch {
      drawAvatarFallback(ctx, L, y, avatarSize, user.nickname, FH);
    }
  } else {
    drawAvatarFallback(ctx, L, y, avatarSize, user.nickname, FH);
  }

  const tx = L + avatarSize + 20;
  ctx.font = `700 56px ${FH}`;
  ctx.fillStyle = "#1c1c1e";
  ctx.fillText(user.nickname, tx, y + 16);
  y += 96;

  /* stat line (2x) */
  y += 16;
  ctx.font = `600 30px ${FL}`;
  ctx.fillStyle = "#5c605c";
  ctx.fillText(statLine, L, y);
  y += 36;

  /* divider */
  y += 40;
  ctx.fillStyle = "#e8e8ed";
  ctx.fillRect(L, y, INNER, 1);
  y += 1 + 28;

  /* branding (2x) */
  drawLogo(ctx, L - 12, y - 12, 1.2);
  ctx.font = `italic 700 34px ${FH}`;
  ctx.fillStyle = "#655d54";
  ctx.fillText("나의 공간", L + 56, y + 2);

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function drawAvatarFallback(ctx, x, y, size, nickname, fh) {
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, "#595149");
  grad.addColorStop(1, "#655d54");
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.font = `italic 700 ${Math.round(size * 0.45)}px ${fh}`;
  ctx.fillStyle = "#fff6ef";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText((nickname || "?")[0].toUpperCase(), x + size / 2, y + size / 2);
  ctx.textAlign = "left"; ctx.textBaseline = "top";
}

async function fetchStaticMapImage(places) {
  if (!places.length) return null;
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  places.forEach((p) => {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  });
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // zoom 레벨 계산 (범위 기반)
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const span = Math.max(latSpan, lngSpan);
  let level = 13;
  if (span > 5) level = 7;
  else if (span > 3) level = 8;
  else if (span > 1.5) level = 9;
  else if (span > 0.8) level = 10;
  else if (span > 0.4) level = 11;
  else if (span > 0.15) level = 12;
  else if (span > 0.05) level = 13;
  else level = 14;

  try {
    const url = `${API_BASE}/static-map?center_lng=${centerLng}&center_lat=${centerLat}&level=${level}&w=600&h=750`;
    const img = await loadImage(url);
    return img;
  } catch (e) {
    console.warn("Static map fetch failed:", e);
    return null;
  }
}

export async function shareProfileCard(user, places, target = "instagram") {
  /* Naver Static Map API로 실제 지도 이미지 가져오기 */
  const mapImage = await fetchStaticMapImage(places);

  const blob = await generateProfileCard(user, places, mapImage);
  const file = new File([blob], `${user.nickname}-myplace-profile.png`, { type: "image/png" });

  // 카카오톡: Web Share API로 이미지 파일 공유 (지원되면)
  if (target === "kakao") {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${user.nickname}의 공간` });
        return "shared";
      } catch {
        return "cancelled";
      }
    }
    // Web Share 미지원 → 다운로드 후 카카오 SDK fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${user.nickname}-myplace-profile.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "kakao_fallback";
  }

  // 인스타그램 등: Web Share API 또는 다운로드
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${user.nickname}의 공간` });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${user.nickname}-myplace-profile.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "downloaded";
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
