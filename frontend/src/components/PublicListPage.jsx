// src/components/PublicListPage.jsx
// 공개 큐레이션 리스트 페이지 — /list/:id
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../context/UserContext";
import { STATUS_EMOJI, STATUS_COLOR } from "../constants";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", surfaceLow: "#f4f4f0",
  container: "#edeeea", containerLowest: "#ffffff",
  onSurface: "#2f3430", outlineVariant: "#8a8e8a",
  primaryContainer: "#ede0d5",
};

export default function PublicListPage({ listId }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    axios.get(`${API_BASE}/lists/${listId}`)
      .then((res) => setList(res.data))
      .catch((e) => setError(e.response?.data?.detail || "리스트를 찾을 수 없어요"))
      .finally(() => setLoading(false));
  }, [listId]);

  useEffect(() => {
    if (!list?.places?.length || !window.naver || !mapContainerRef.current || mapRef.current) return;
    const bounds = new window.naver.maps.LatLngBounds();
    list.places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));
    const map = new window.naver.maps.Map(mapContainerRef.current, {
      center: bounds.getCenter(), zoom: 13,
      mapDataControl: false, scaleControl: false,
      logoControlOptions: { position: window.naver.maps.Position.BOTTOM_LEFT },
    });
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
    mapRef.current = map;

    list.places.forEach((p, i) => {
      const sc = STATUS_COLOR[p.status];
      new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
        icon: {
          content: `<div style="
            padding:3px 8px;border-radius:16px;
            background:${sc?.bg || C.surfaceLow};color:${sc?.color || C.onSurface};
            font-family:${FL};font-size:10px;font-weight:700;
            white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);
            border:2px solid white;
          ">${i + 1}. ${p.name}</div>`,
          anchor: new window.naver.maps.Point(15, 15),
        },
      });
    });

    return () => { try { map.destroy(); } catch {} mapRef.current = null; };
  }, [list]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <p style={{ fontFamily: FL, fontSize: 12, color: C.outlineVariant }}>불러오는 중...</p>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, flexDirection: "column", gap: 12 }}>
        <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.outlineVariant }}>{error || "리스트를 찾을 수 없어요"}</p>
        <a href="/" style={{ fontFamily: FL, fontSize: 12, color: C.primary, textDecoration: "none", padding: "8px 20px", background: C.primaryContainer, borderRadius: 8, fontWeight: 600 }}>
          나도 시작하기
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: C.bg }}>
      {/* 헤더 */}
      <header style={{
        padding: isMobile ? "14px 16px" : "16px 32px",
        background: "rgba(250,249,246,0.9)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.container}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
      }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: FH, fontSize: isMobile ? 18 : 22, color: C.onSurface }}>
            {list.title}
          </h1>
          <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
            {list.owner_nickname} &middot; {list.places?.length || 0}곳
            {list.description ? ` · ${list.description}` : ""}
          </p>
        </div>
        <a href="/" style={{
          fontFamily: FL, fontSize: 11, fontWeight: 700, color: "#fff6ef",
          padding: "8px 18px", background: C.primary, borderRadius: 8, textDecoration: "none",
        }}>
          나도 시작하기
        </a>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div ref={mapContainerRef} style={{ flex: 1 }} />

        {!isMobile && list.places && (
          <div style={{
            width: 340, overflowY: "auto", background: C.bg,
            borderLeft: `1px solid ${C.container}`, padding: 16,
          }}>
            {list.places.map((p, i) => {
              const sc = STATUS_COLOR[p.status];
              return (
                <div key={p.id}
                  onClick={() => mapRef.current?.panTo(new window.naver.maps.LatLng(p.lat, p.lng), { duration: 280 })}
                  style={{ padding: "12px 10px", borderBottom: `1px solid ${C.container}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontFamily: FL, fontSize: 11, fontWeight: 700, color: C.primary,
                      width: 22, textAlign: "center",
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: FH, fontSize: 14, color: C.onSurface }}>{p.name}</p>
                      {p.address && <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>{p.address}</p>}
                    </div>
                    <span style={{
                      fontFamily: FL, fontSize: 9, fontWeight: 600, padding: "2px 6px",
                      borderRadius: 4, background: sc?.bg, color: sc?.color,
                    }}>{STATUS_EMOJI[p.status]}</span>
                  </div>
                  {p.memo && (
                    <p style={{ margin: "4px 0 0 30px", fontFamily: FH, fontStyle: "italic", fontSize: 11, color: "#78716c" }}>"{p.memo}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
