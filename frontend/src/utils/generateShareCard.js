// src/utils/generateShareCard.js
// Canvas API로 인스타 스토리/피드 공유 카드 생성

import { STATUS_LABEL, STATUS_COLOR, SHARED_CAT_COLOR, BEST_CATEGORIES } from "../constants";

const COLORS = {
  bg: "#faf9f6",
  primary: "#655d54",
  primaryContainer: "#ede0d5",
  onSurface: "#2f3430",
  onSurfaceVariant: "#5c605c",
  outline: "#8a8e8a",
  surfaceLow: "#f4f4f0",
};

const STATUS_PILL = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, v]) => [k, { ...v, label: STATUS_LABEL[k] }])
);

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

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const words = text.split("");
  let line = "";
  let lineCount = 0;
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line.slice(0, -1) + "…", x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawPill(ctx, text, x, y, bg, fg, fontSize = 28) {
  ctx.font = `700 ${fontSize}px 'Manrope', sans-serif`;
  const metrics = ctx.measureText(text);
  const pw = metrics.width + fontSize * 1.2;
  const ph = fontSize * 1.6;
  const pr = ph / 2;

  roundRect(ctx, x, y, pw, ph, pr);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + fontSize * 0.6, y + ph / 2);
  ctx.textBaseline = "alphabetic";
  return { w: pw, h: ph };
}

function drawStars(ctx, rating, x, y, size = 32) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  ctx.font = `${size}px 'Manrope', sans-serif`;
  ctx.fillStyle = "#D4A053";
  let cx = x;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < full || (i === full && half) ? "#D4A053" : "#ddd8d2";
    ctx.fillText("★", cx, y);
    cx += size * 1.1;
  }
}

function drawLogo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // 뒤쪽 카드
  roundRect(ctx, 20, 14, 28, 34, 2);
  ctx.fillStyle = "#a89a8e";
  ctx.fill();
  // 앞쪽 카드
  roundRect(ctx, 14, 18, 28, 34, 2);
  ctx.fillStyle = "#a89a8e";
  ctx.fill();
  // 겹치는 영역
  ctx.save();
  roundRect(ctx, 20, 14, 28, 34, 2);
  ctx.clip();
  roundRect(ctx, 14, 18, 28, 34, 2);
  ctx.fillStyle = "#867a6e";
  ctx.fill();
  ctx.restore();
  ctx.restore();
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

export default async function generateShareCard(place, { format = "story" } = {}) {
  await document.fonts.ready;

  const W = 1080;
  const H = format === "story" ? 1920 : 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 배경
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // 장식 — 우상단 큰 원
  ctx.beginPath();
  ctx.arc(W + 80, -80, 400, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.primaryContainer + "40";
  ctx.fill();

  const pad = 80;
  let curY = format === "story" ? 160 : 80;

  // 사진 영역
  const photoH = format === "story" ? 640 : 400;
  let hasPhoto = false;
  if (place.photo_url || (place.photo_urls && place.photo_urls.length > 0)) {
    const photoUrl = place.photo_urls?.[0] || place.photo_url;
    try {
      const img = await loadImage(photoUrl);
      ctx.save();
      roundRect(ctx, pad, curY, W - pad * 2, photoH, 24);
      ctx.clip();
      // cover crop
      const imgRatio = img.width / img.height;
      const boxRatio = (W - pad * 2) / photoH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, pad, curY, W - pad * 2, photoH);
      ctx.restore();
      curY += photoH + 48;
      hasPhoto = true;
    } catch {
      // 사진 로드 실패 시 무시
    }
  }

  if (!hasPhoto) {
    // 사진 없으면 — 카테고리 이모지 + 배경
    const cat = BEST_CATEGORIES.find((c) => c.key === place.category);
    const catColor = SHARED_CAT_COLOR[place.category] || COLORS.primary;
    roundRect(ctx, pad, curY, W - pad * 2, photoH, 24);
    ctx.fillStyle = catColor + "18";
    ctx.fill();
    ctx.font = `${format === "story" ? 180 : 120}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = catColor + "60";
    ctx.fillText(cat?.emoji || "📍", W / 2, curY + photoH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    curY += photoH + 48;
  }

  // 카테고리 pill
  const cat = BEST_CATEGORIES.find((c) => c.key === place.category);
  const catColor = SHARED_CAT_COLOR[place.category] || COLORS.primary;
  if (cat) {
    const { h } = drawPill(ctx, cat.label.toUpperCase(), pad, curY, catColor + "20", catColor, 26);
    curY += h + 24;
  }

  // 장소 이름
  ctx.font = `700 ${format === "story" ? 64 : 52}px 'Noto Serif', Georgia, serif`;
  ctx.fillStyle = COLORS.onSurface;
  curY = drawWrappedText(ctx, place.name, pad, curY + 48, W - pad * 2, format === "story" ? 80 : 64, 2);
  curY += 12;

  // 주소
  if (place.address) {
    ctx.font = `400 ${format === "story" ? 30 : 26}px 'Manrope', sans-serif`;
    ctx.fillStyle = COLORS.outline;
    const addrText = place.address.length > 40 ? place.address.slice(0, 40) + "…" : place.address;
    ctx.fillText(addrText, pad, curY + 30);
    curY += 56;
  }

  // 상태 pill + 별점
  curY += 16;
  let pillEndX = pad;
  if (place.status && STATUS_PILL[place.status]) {
    const sp = STATUS_PILL[place.status];
    const { w } = drawPill(ctx, sp.label, pad, curY, sp.bg, sp.color, 26);
    pillEndX = pad + w + 20;
  }
  if (place.rating) {
    drawStars(ctx, place.rating, pillEndX, curY + 34, 30);
  }
  curY += 64;

  // 메모
  if (place.memo) {
    curY += 16;
    ctx.font = `italic 400 ${format === "story" ? 30 : 26}px 'Noto Serif', Georgia, serif`;
    ctx.fillStyle = COLORS.onSurfaceVariant;
    curY = drawWrappedText(ctx, `"${place.memo}"`, pad, curY + 30, W - pad * 2, format === "story" ? 42 : 36, 3);
    curY += 8;
  }

  // 하단 브랜딩
  const brandY = H - 120;
  // 구분선
  ctx.fillStyle = COLORS.primaryContainer;
  ctx.fillRect(pad, brandY - 40, W - pad * 2, 1);

  // 로고
  drawLogo(ctx, pad - 10, brandY - 28, 1.2);

  // 앱 이름
  ctx.font = `italic 700 32px 'Noto Serif', Georgia, serif`;
  ctx.fillStyle = COLORS.primary;
  ctx.fillText("나의 공간", pad + 70, brandY + 8);
  ctx.font = `500 16px 'Manrope', sans-serif`;
  ctx.fillStyle = COLORS.outline;
  ctx.fillText("The Curated Archive", pad + 70, brandY + 36);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function shareCard(place, format = "story") {
  const blob = await generateShareCard(place, { format });
  const file = new File([blob], `${place.name}-myplace.png`, { type: "image/png" });

  // 모바일: Web Share API
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: place.name });
      return "shared";
    } catch {
      // 유저가 취소한 경우
      return "cancelled";
    }
  }

  // 데스크톱: 다운로드
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
