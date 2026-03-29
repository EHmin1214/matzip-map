// src/components/MapView.jsx
import { useEffect, useRef, useState } from "react";
import { getAccountColor } from "../App";

const STATUS_EMOJI = {
  want_to_go:      "🔖",
  visited:         "✅",
  want_revisit:    "❤️",
  not_recommended: "👎",
};

const FOLLOWING_COLORS = [
  "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56",
];
const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

export default function MapView({
  restaurants, personalPlaces = [], accounts, onMarkerClick, onMapReady,
  followingPlaces = [], // [{ userId, nickname, colorIdx, places: [...] }]
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const personalMarkersRef = useRef([]);
  const followingMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const hasFitBounds = useRef(false);

  // 지도 초기화
  useEffect(() => {
    const checkNaver = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(checkNaver);
        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(37.5665, 126.978),
          zoom: 13,
        });
        setMapReady(true);
        if (onMapReady) onMapReady(mapInstance.current);
      }
    }, 100);
    return () => clearInterval(checkNaver);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 블로거 맛집 마커
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (restaurants.length === 0) hasFitBounds.current = false;

    restaurants.forEach((r) => {
      const mentions = r.account_mentions || [];
      const primaryAccountId = mentions.length > 0 ? mentions[0].account_id : null;
      const color = primaryAccountId ? getAccountColor(primaryAccountId, accounts) : "#888";
      const hasMultiMention = mentions.some((m) => m.mention_count >= 2);
      const isMultiAccount = mentions.length >= 2;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: {
          content: `
            <div style="
              background:${color};color:white;padding:4px 8px;
              border-radius:12px;font-size:12px;font-weight:600;
              white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);
              cursor:pointer;
              border:${isMultiAccount ? "2px solid white" : "none"};
              outline:${isMultiAccount ? `2px solid ${color}` : "none"};
            ">${r.name}${hasMultiMention ? " ✶" : ""}</div>
          `,
          anchor: new window.naver.maps.Point(0, 0),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        const panelHeight = window.innerHeight * 0.25;
        const projection = mapInstance.current.getProjection();
        const point = projection.fromCoordToOffset(new window.naver.maps.LatLng(r.lat, r.lng));
        const adjustedCoord = projection.fromOffsetToCoord(
          new window.naver.maps.Point(point.x, point.y + panelHeight)
        );
        mapInstance.current.panTo(adjustedCoord);
        onMarkerClick(r.id, false);
      });
      markersRef.current.push(marker);
    });

    if (restaurants.length > 0 && !hasFitBounds.current) {
      const bounds = new window.naver.maps.LatLngBounds();
      restaurants.forEach((r) => bounds.extend(new window.naver.maps.LatLng(r.lat, r.lng)));
      mapInstance.current.fitBounds(bounds, { padding: 60 });
      hasFitBounds.current = true;
    }
  }, [restaurants, accounts, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // 내 맛집 마커
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    personalMarkersRef.current.forEach((m) => m.setMap(null));
    personalMarkersRef.current = [];

    personalPlaces.forEach((r) => {
      const emoji = STATUS_EMOJI[r.status] || "📌";
      const bgColor = r.folder_color || "#E8593C";

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: {
          content: `
            <div style="
              background:${bgColor};color:white;padding:4px 8px;
              border-radius:12px;font-size:12px;font-weight:600;
              white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);
              cursor:pointer;border:2px solid white;
            ">${emoji} ${r.name}</div>
          `,
          anchor: new window.naver.maps.Point(0, 0),
        },
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        const panelHeight = window.innerHeight * 0.25;
        const projection = mapInstance.current.getProjection();
        const point = projection.fromCoordToOffset(new window.naver.maps.LatLng(r.lat, r.lng));
        const adjustedCoord = projection.fromOffsetToCoord(
          new window.naver.maps.Point(point.x, point.y + panelHeight)
        );
        mapInstance.current.panTo(adjustedCoord);
        onMarkerClick(`personal_${r.id}`, true);
      });
      personalMarkersRef.current.push(marker);
    });
  }, [personalPlaces, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // 팔로잉 맛집 마커 — 닉네임 첫 글자 아바타 표시
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    followingMarkersRef.current.forEach((m) => m.setMap(null));
    followingMarkersRef.current = [];

    followingPlaces.forEach(({ nickname, colorIdx, places }) => {
      const color = getFollowingColor(colorIdx);
      const initial = nickname?.[0]?.toUpperCase() || "?";

      places.forEach((r) => {
        const emoji = STATUS_EMOJI[r.status] || "";
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(r.lat, r.lng),
          map: mapInstance.current,
          title: `${nickname}: ${r.name}`,
          icon: {
            content: `
              <div style="
                display:flex;align-items:center;gap:5px;
                background:${color};color:white;
                padding:3px 8px 3px 3px;
                border-radius:20px;font-size:12px;font-weight:600;
                white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);
                cursor:pointer;border:2px solid white;
              ">
                <div style="
                  width:20px;height:20px;border-radius:50%;
                  background:rgba(255,255,255,0.3);
                  display:flex;align-items:center;justify-content:center;
                  font-size:11px;font-weight:800;flex-shrink:0;
                ">${initial}</div>
                <span>${emoji} ${r.name}</span>
              </div>
            `,
            anchor: new window.naver.maps.Point(0, 0),
          },
        });

        window.naver.maps.Event.addListener(marker, "click", () => {
          const panelHeight = window.innerHeight * 0.25;
          const projection = mapInstance.current.getProjection();
          const point = projection.fromCoordToOffset(new window.naver.maps.LatLng(r.lat, r.lng));
          const adjustedCoord = projection.fromOffsetToCoord(
            new window.naver.maps.Point(point.x, point.y + panelHeight)
          );
          mapInstance.current.panTo(adjustedCoord);
        });

        followingMarkersRef.current.push(marker);
      });
    });
  }, [followingPlaces, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ flex: 1, height: "100vh", position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!mapReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f5f5f5", fontSize: 14, color: "#888",
        }}>
          지도 로딩 중...
        </div>
      )}

      {/* 범례 */}
      {(followingPlaces.length > 0 || accounts.length > 0) && (
        <div style={{
          position: "absolute", bottom: 80, right: 72,
          background: "white", borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          fontSize: 12, maxWidth: 160,
        }}>
          {/* 팔로잉 범례 */}
          {followingPlaces.map(({ nickname, colorIdx }) => (
            <div key={nickname} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: getFollowingColor(colorIdx),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
              }}>
                {nickname?.[0]?.toUpperCase()}
              </div>
              <span style={{ color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nickname}
              </span>
            </div>
          ))}
          {/* 블로거 범례 */}
          {accounts.map((acc) => (
            <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: getAccountColor(acc.id, accounts), flexShrink: 0,
              }} />
              <span style={{ color: "#333" }}>{acc.author_name}</span>
            </div>
          ))}
          {accounts.length > 0 && (
            <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 6, paddingTop: 6, color: "#aaa", fontSize: 11 }}>
              ✶ 여러 글에서 언급
            </div>
          )}
        </div>
      )}
    </div>
  );
}
