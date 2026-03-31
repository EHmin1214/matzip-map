// src/constants.js
// 앱 전역 공유 상수

export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || "https://myplace-map.vercel.app";

export const STATUS_COLOR = {
  want_to_go:   { bg: "#FEF3CD", color: "#BA7517" },
  visited:      { bg: "#E0F4EC", color: "#1D9E75" },
  want_revisit: { bg: "#FCE4EE", color: "#D4537E" },
};

export const STATUS_EMOJI = {
  want_to_go: "🔖",
  visited: "✅",
  want_revisit: "❤️",
};

export const STATUS_LABEL = {
  want_to_go: "가고 싶어요",
  visited: "가봤어요",
  want_revisit: "또 가고 싶어요",
};

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
