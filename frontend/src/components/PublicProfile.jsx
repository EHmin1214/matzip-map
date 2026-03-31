// src/components/PublicProfile.jsx
// 비회원도 볼 수 있는 공개 프로필 페이지 — /@nickname
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../context/UserContext";
import { STATUS_LABEL, STATUS_EMOJI, STATUS_COLOR } from "../constants";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54", primaryDim: "#595149",
  bg: "#faf9f6", surfaceLow: "#f4f4f0",
  container: "#edeeea", containerLowest: "#ffffff",
  onSurface: "#2f3430", onSurfaceVariant: "#5c605c",
  outlineVariant: "#8a8e8a", primaryContainer: "#ede0d5",
};

const mobile = () => window.innerWidth <= 768;

export default function PublicProfile({ nickname }) {
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const isMobile = mobile();

  const [curatedLists, setCuratedLists] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/lists/public/${nickname}`)
      .then((res) => setCuratedLists(res.data))
      .catch(() => {});
  }, [nickname]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/users/${nickname}`),
      axios.get(`${API_BASE}/users/${nickname}/public-places`),
    ])
      .then(([profileRes, placesRes]) => {
        setProfile(profileRes.data);
        setPlaces(placesRes.data);
      })
      .catch((e) => {
        const detail = e.response?.data?.detail;
        setError(detail === "비공개 프로필입니다." ? "비공개 프로필이에요" : "프로필을 찾을 수 없어요");
      })
      .finally(() => setLoading(false));
  }, [nickname]);

  // 네이버 지도 초기화
  useEffect(() => {
    if (!places.length || !window.naver || !mapContainerRef.current) return;
    if (mapRef.current) return; // 이미 초기화됨

    const bounds = new window.naver.maps.LatLngBounds();
    places.forEach((p) => bounds.extend(new window.naver.maps.LatLng(p.lat, p.lng)));

    const map = new window.naver.maps.Map(mapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 13,
      minZoom: 6,
      zoomControl: true,
      zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT },
      mapDataControl: false,
      scaleControl: false,
      logoControlOptions: { position: window.naver.maps.Position.BOTTOM_LEFT },
    });
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
    mapRef.current = map;

    return () => { try { map.destroy(); } catch {} mapRef.current = null; };
  }, [places]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !window.naver) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const filtered = filter === "all" ? places : places.filter((p) => p.status === filter);
    filtered.forEach((p) => {
      const sc = STATUS_COLOR[p.status];
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map: mapRef.current,
        icon: {
          content: `<div style="
            padding:4px 10px;border-radius:20px;
            background:${sc?.bg || C.surfaceLow};color:${sc?.color || C.onSurface};
            font-family:${FL};font-size:11px;font-weight:700;
            white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);
            border:2px solid white;
          ">${STATUS_EMOJI[p.status]} ${p.name}</div>`,
          anchor: new window.naver.maps.Point(15, 15),
        },
      });
      markersRef.current.push(marker);
    });
  }, [places, filter]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, flexDirection: "column", gap: 10 }}>
        <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 22, color: C.primary, margin: 0 }}>나의 공간</h1>
        <p style={{ fontFamily: FL, fontSize: 11, color: C.outlineVariant }}>불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 22, color: C.primary, margin: 0 }}>나의 공간</h1>
        <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: C.outlineVariant }}>{error}</p>
        <a href="/" style={{ fontFamily: FL, fontSize: 12, color: C.primary, textDecoration: "none", padding: "8px 20px", background: C.primaryContainer, borderRadius: 8, fontWeight: 600 }}>
          나도 시작하기
        </a>
      </div>
    );
  }

  const filtered = filter === "all" ? places : places.filter((p) => p.status === filter);
  const stats = {
    all: places.length,
    want_to_go: places.filter((p) => p.status === "want_to_go").length,
    visited: places.filter((p) => p.status === "visited").length,
    want_revisit: places.filter((p) => p.status === "want_revisit").length,
  };

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
          <h1 style={{ margin: 0, fontFamily: FH, fontStyle: "italic", fontSize: isMobile ? 18 : 22, color: C.primary }}>
            {profile.nickname}
          </h1>
          <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant, letterSpacing: "0.1em" }}>
            {profile.place_count}곳 큐레이션 &middot; 팔로워 {profile.follower_count}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noreferrer" style={{
              fontFamily: FL, fontSize: 10, color: C.primary, textDecoration: "none",
              padding: "5px 12px", background: C.primaryContainer, borderRadius: 6, fontWeight: 600,
            }}>Instagram</a>
          )}
          <a href="/" style={{
            fontFamily: FL, fontSize: 11, fontWeight: 700, color: "#fff6ef",
            padding: "8px 18px", background: C.primary, borderRadius: 8, textDecoration: "none",
          }}>
            나도 시작하기
          </a>
        </div>
      </header>

      {/* 필터 바 */}
      <div style={{
        padding: "10px 16px", display: "flex", gap: 8, overflowX: "auto",
        background: C.bg, borderBottom: `1px solid ${C.container}`,
        zIndex: 10,
      }}>
        {[
          { key: "all", label: "전체", count: stats.all },
          { key: "want_to_go", label: "🔖 가고 싶어요", count: stats.want_to_go },
          { key: "visited", label: "✅ 가봤어요", count: stats.visited },
          { key: "want_revisit", label: "❤️ 또 가고 싶어요", count: stats.want_revisit },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: FL, fontSize: 11, fontWeight: 600,
              background: filter === f.key ? C.primary : C.surfaceLow,
              color: filter === f.key ? "#fff6ef" : C.onSurfaceVariant,
              transition: "all 0.15s",
            }}>
            {f.label} {f.count > 0 ? f.count : ""}
          </button>
        ))}
      </div>

      {/* 메인: 지도 + 리스트 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* 지도 */}
        <div ref={mapContainerRef} style={{ flex: 1, minHeight: 0 }} />

        {/* 사이드 리스트 (데스크톱만) */}
        {!isMobile && (
          <div style={{
            width: 340, overflowY: "auto", background: C.bg,
            borderLeft: `1px solid ${C.container}`, padding: "16px",
          }}>
            <p style={{ margin: "0 0 12px", fontFamily: FL, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.outlineVariant }}>
              {profile.nickname}의 공간 &mdash; {filtered.length}곳
            </p>
            {/* 큐레이션 리스트 */}
            {curatedLists.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.primary }}>
                  큐레이션 리스트
                </p>
                {curatedLists.map((cl) => (
                  <div key={cl.id} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.container}` }}>
                    <p style={{ margin: 0, fontFamily: FH, fontSize: 13, fontWeight: 600, color: C.onSurface }}>{cl.title}</p>
                    <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>
                      {cl.item_count}곳 {cl.description ? `· ${cl.description}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {filtered.map((p) => {
              const sc = STATUS_COLOR[p.status];
              return (
                <div key={p.id}
                  onClick={() => {
                    if (mapRef.current && window.naver) {
                      mapRef.current.panTo(new window.naver.maps.LatLng(p.lat, p.lng), { duration: 280 });
                    }
                  }}
                  style={{
                    padding: "12px 10px", borderBottom: `1px solid ${C.container}`,
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceLow}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontFamily: FL, fontSize: 9, fontWeight: 600,
                      padding: "2px 6px", borderRadius: 4,
                      background: sc?.bg || C.surfaceLow, color: sc?.color || C.onSurfaceVariant,
                    }}>
                      {STATUS_EMOJI[p.status]} {STATUS_LABEL[p.status]}
                    </span>
                    {p.rating > 0 && (
                      <span style={{ fontFamily: FL, fontSize: 9, color: C.primary }}>
                        {"★".repeat(p.rating)}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontFamily: FH, fontSize: 14, color: C.onSurface }}>{p.name}</p>
                  {p.address && (
                    <p style={{ margin: "2px 0 0", fontFamily: FL, fontSize: 10, color: C.outlineVariant }}>{p.address}</p>
                  )}
                  {p.memo && (
                    <p style={{ margin: "4px 0 0", fontFamily: FH, fontStyle: "italic", fontSize: 11, color: C.onSurfaceVariant, lineHeight: 1.5 }}>
                      "{p.memo}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 모바일 하단 리스트 시트 */}
      {isMobile && (
        <MobileBottomSheet places={filtered} profile={profile} mapRef={mapRef} />
      )}
    </div>
  );
}

function MobileBottomSheet({ places, profile, mapRef }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      maxHeight: expanded ? "60vh" : 140,
      background: C.containerLowest,
      borderTopLeftRadius: 16, borderTopRightRadius: 16,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
      transition: "max-height 0.3s ease",
      overflowY: expanded ? "auto" : "hidden",
      zIndex: 20,
    }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: "12px 16px", cursor: "pointer", textAlign: "center" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.container, margin: "0 auto 10px" }} />
        <p style={{ margin: 0, fontFamily: FL, fontSize: 11, fontWeight: 700, color: C.onSurface }}>
          {profile.nickname}의 공간 &mdash; {places.length}곳
        </p>
      </div>
      {places.map((p) => {
        const sc = STATUS_COLOR[p.status];
        return (
          <div key={p.id}
            onClick={() => {
              if (mapRef.current && window.naver) {
                mapRef.current.panTo(new window.naver.maps.LatLng(p.lat, p.lng), { duration: 280 });
              }
            }}
            style={{ padding: "10px 16px", borderTop: `1px solid ${C.container}`, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                fontFamily: FL, fontSize: 9, fontWeight: 600,
                padding: "2px 6px", borderRadius: 4,
                background: sc?.bg, color: sc?.color,
              }}>
                {STATUS_EMOJI[p.status]}
              </span>
              <span style={{ fontFamily: FH, fontSize: 13, color: C.onSurface }}>{p.name}</span>
              {p.rating > 0 && (
                <span style={{ fontFamily: FL, fontSize: 9, color: C.primary }}>{"★".repeat(p.rating)}</span>
              )}
            </div>
            {p.memo && (
              <p style={{ margin: "2px 0 0", fontFamily: FH, fontStyle: "italic", fontSize: 11, color: C.onSurfaceVariant }}>"{p.memo}"</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
