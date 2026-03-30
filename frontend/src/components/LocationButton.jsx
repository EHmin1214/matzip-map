// src/components/LocationButton.jsx
import { useState } from "react";

const isMobile = () => window.innerWidth <= 768;

export default function LocationButton({ map }) {
  const [loading, setLoading] = useState(false);
  const mobile = isMobile();

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
        position: "absolute",
        bottom: mobile ? 80 : 20,
        right: 14,
        zIndex: 26,
        width: 38, height: 38,
        borderRadius: "50%",
        background: "rgba(250,249,246,0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "none",
        boxShadow: "0 2px 16px rgba(101,93,84,0.10)",
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: loading ? "#a8a29e" : "#655d54",
        WebkitTapHighlightColor: "transparent",
        transition: "box-shadow 0.15s, opacity 0.15s",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = "0 4px 20px rgba(101,93,84,0.16)")}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 16px rgba(101,93,84,0.10)"}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
        {loading ? "hourglass_empty" : "my_location"}
      </span>
    </button>
  );
}
