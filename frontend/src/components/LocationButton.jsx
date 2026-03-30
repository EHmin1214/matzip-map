// src/components/LocationButton.jsx
// 디자인: map.html 우측 컨트롤 — 원형 glass 버튼
import { useState } from "react";

export default function LocationButton({ map }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation || !map || !window.naver) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setCenter(new window.naver.maps.LatLng(lat, lng));
        map.setZoom(16);
        setLoading(false);
      },
      () => { setLoading(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      title="내 위치"
      style={{
        position: "fixed",
        // 모바일: 탭바 위, 새로고침 버튼 아래
        bottom: window.innerWidth <= 768 ? 80 : 24,
        right: 16,
        zIndex: 26,
        width: 40, height: 40,
        borderRadius: "50%",
        background: "rgba(250,249,246,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "none",
        boxShadow: "0 4px 20px rgba(101,93,84,0.12)",
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: loading ? "#a8a29e" : "#655d54",
        WebkitTapHighlightColor: "transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 24px rgba(101,93,84,0.18)"}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 20px rgba(101,93,84,0.12)"}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {loading ? "hourglass_empty" : "my_location"}
      </span>
    </button>
  );
}
