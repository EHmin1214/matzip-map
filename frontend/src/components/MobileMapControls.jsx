// src/components/MobileMapControls.jsx
// 모바일 전용 — 팔로잉이 있을 때만 간단한 토글 표시
// MobileMapControls is no longer a heavy legend panel.
// Layer toggling is now handled directly in MapFilter.
// This component is kept minimal for any future mobile-specific controls.

export default function MobileMapControls() {
  // Layer controls are now in MapFilter pill at the top.
  // This component intentionally renders nothing.
  return null;
}
