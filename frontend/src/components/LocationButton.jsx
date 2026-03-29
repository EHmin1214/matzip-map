// src/components/LocationButton.jsx
import { useState } from "react";

export default function LocationButton({ map }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = () => {
    if (!navigator.geolocation) {
      setError("위치 서비스를 지원하지 않는 브라우저예요");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (map) {
          // 네이버 지도 이동
          const latlng = new window.naver.maps.LatLng(latitude, longitude);
          map.setCenter(latlng);
          map.setZoom(15);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          setError("위치 권한을 허용해주세요");
        } else {
          setError("위치를 가져올 수 없어요");
        }
        setTimeout(() => setError(""), 3000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{
      position: "fixed",
      right: 16,
      bottom: 80, // 하단 탭바 위
      zIndex: 25,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
    }}>
      {/* 에러 메시지 */}
      {error && (
        <div style={{
          background: "rgba(0,0,0,0.7)", color: "white",
          padding: "6px 12px", borderRadius: 8,
          fontSize: 12, whiteSpace: "nowrap",
        }}>
          {error}
        </div>
      )}

      {/* 버튼 */}
      <button
        onClick={handleClick}
        disabled={loading}
        title="현재 위치로 이동"
        style={{
          width: 44, height: 44,
          borderRadius: "50%",
          background: "white",
          border: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
        }}
      >
        {loading ? (
          <span style={{
            width: 20, height: 20, border: "2px solid #E8593C",
            borderTopColor: "transparent", borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }} />
        ) : "📍"}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
