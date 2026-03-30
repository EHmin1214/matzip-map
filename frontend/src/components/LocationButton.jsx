// src/components/LocationButton.jsx
import { useState, useRef } from "react";

const isMobile = () => window.innerWidth <= 768;

const MY_LOCATION_MARKER_HTML = `
  <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
    <div style="
      position:absolute;width:20px;height:20px;border-radius:50%;
      background:rgba(66,133,244,0.2);
      animation:loc-pulse 1.8s ease-out infinite;
    "></div>
    <div style="
      width:12px;height:12px;border-radius:50%;
      background:#4285F4;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(66,133,244,0.5);
      position:relative;z-index:1;
    "></div>
  </div>
  <style>
    @keyframes loc-pulse {
      0%   { transform:scale(1); opacity:0.7; }
      100% { transform:scale(2.8); opacity:0; }
    }
  </style>
`;

export default function LocationButton({ map }) {
  const [loading, setLoading] = useState(false);
  const mobile = isMobile();
  const markerRef = useRef(null);

  const handleClick = () => {
    if (!navigator.geolocation || !map || !window.naver) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const position = new window.naver.maps.LatLng(lat, lng);

        if (markerRef.current) {
          markerRef.current.setPosition(position);
        } else {
          markerRef.current = new window.naver.maps.Marker({
            position,
            map,
            icon: {
              content: MY_LOCATION_MARKER_HTML,
              anchor: new window.naver.maps.Point(10, 10),
            },
            zIndex: 50,
          });
        }

        map.setCenter(position);
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
        flexShrink: 0,
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
