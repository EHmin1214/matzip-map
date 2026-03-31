// src/constants.js
// 앱 전역 공유 상수

export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || "https://myplace-map.vercel.app";

export const ACCOUNT_COLORS = ["#E8593C","#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56","#993C1D"];
export function getAccountColor(accountId, accounts) {
  const index = accounts.findIndex((a) => a.id === accountId);
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] || "#888";
}

export const FOLLOWING_COLORS = ["#E8593C","#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E"];
export const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

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

export const SHARED_CAT_COLOR = {
  restaurant:    "#E8593C",
  cafe:          "#3B8BD4",
  bar:           "#7F77DD",
  general_store: "#BA7517",
};

export const BEST_CATEGORIES = [
  { key: "restaurant", emoji: "🍽", label: "음식점" },
  { key: "cafe",       emoji: "☕", label: "카페/베이커리" },
  { key: "bar",        emoji: "🍸", label: "술집" },
  { key: "general_store", emoji: "🛍", label: "잡화점" },
];

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
