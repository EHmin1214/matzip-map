// src/components/MapView.jsx
// 마커 디자인: 미니멀, 세련됨. 범례 제거.
import { useEffect, useRef, useState } from "react";

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

const MY_COLOR = "#655d54"; // primary

const isSameLocation = (a, b, threshold = 0.0001) =>
  Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;

// ── 마커 HTML ─────────────────────────────────────────────────

// 내 맛집 마커 — 작고 세련된 필
const myMarker = ({ name, emoji, shared, avatars = [] }) => {
  const avatarStack = avatars.slice(0, 2).map(({ initial, color }) => `
    <div style="
      width:12px;height:12px;border-radius:50%;
      background:${color};
      display:inline-flex;align-items:center;justify-content:center;
      font-size:7px;color:white;font-weight:800;
      border:1.5px solid white;margin-left:-3px;
      font-family:'Manrope',sans-serif;
    ">${initial}</div>
  `).join("");

  return `
    <div style="
      display:inline-flex;align-items:center;gap:4px;
      background:${MY_COLOR};
      color:#fff6ef;
      padding:4px ${avatars.length > 0 ? "7px 4px 6px" : "9px"};
      border-radius:8px;
      font-family:'Manrope',sans-serif;
      font-size:11px;font-weight:600;
      white-space:nowrap;
      box-shadow:0 1px 8px rgba(101,93,84,0.28);
      cursor:pointer;
      letter-spacing:0.01em;
      ${shared ? "outline:2px solid rgba(255,255,255,0.6);" : ""}
    ">
      ${emoji ? `<span style="font-size:11px;line-height:1;">${emoji}</span>` : ""}
      <span>${name}</span>
      ${avatarStack ? `<div style="display:flex;align-items:center;margin-left:1px;">${avatarStack}</div>` : ""}
    </div>
  `;
};

// 팔로잉 마커 — 아바타 원형 + 이름 pill
const followingMarker = ({ name, initial, color, emoji = "" }) => `
  <div style="
    display:inline-flex;align-items:center;gap:5px;
    background:${color};
    color:white;
    padding:3px 9px 3px 3px;
    border-radius:20px;
    font-family:'Manrope',sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 1px 8px rgba(0,0,0,0.16);
    cursor:pointer;
    border:2px solid white;
  ">
    <div style="
      width:18px;height:18px;border-radius:50%;
      background:rgba(255,255,255,0.22);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:800;flex-shrink:0;
    ">${initial}</div>
    ${emoji ? `<span style="font-size:11px;">${emoji}</span>` : ""}
    <span>${name}</span>
  </div>
`;

// 블로거 맛집 마커 — 심플한 색상 pill
const blogMarker = ({ name, color }) => `
  <div style="
    display:inline-flex;align-items:center;
    background:${color};
    color:white;
    padding:4px 10px;
    border-radius:8px;
    font-family:'Manrope',sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 1px 8px rgba(0,0,0,0.18);
    cursor:pointer;
    letter-spacing:0.01em;
  ">${name}</div>
`;

export default function MapView({
  restaurants, personalPlaces = [], accounts, onMarkerClick, onMapReady,
  followingPlaces = [], onFollowingMarkerClick,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const personalMarkersRef = useRef([]);
  const followingMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const hasFitBounds = useRef(false);

  const getAccountColor = (accountId) => {
    const COLORS = ["#E8593C","#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56","#993C1D"];
    const idx = accounts.findIndex((a) => a.id === accountId);
    return COLORS[idx % COLORS.length] || "#777c77";
  };

  // 지도 초기화
  useEffect(() => {
    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check);
        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(37.5665, 126.978),
          zoom: 13,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
        });
        setMapReady(true);
        if (onMapReady) onMapReady(mapInstance.current);
      }
    }, 100);
    return () => clearInterval(check);
  }, []); // eslint-disable-line

  // 마커 클릭 후 지도 이동 (패널 공간 확보)
  const panToPlace = (lat, lng) => {
    if (!mapInstance.current || !window.naver) return;
    const isMobile = window.innerWidth <= 768;
    const offset = isMobile ? window.innerHeight * 0.28 : window.innerHeight * 0.22;
    const proj = mapInstance.current.getProjection();
    const pt = proj.fromCoordToOffset(new window.naver.maps.LatLng(lat, lng));
    const adjusted = proj.fromOffsetToCoord(new window.naver.maps.Point(pt.x, pt.y + offset));
    mapInstance.current.panTo(adjusted, { duration: 280 });
  };

  // 블로거 맛집 마커
  useEffect(() => {
    if (!mapReady) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (restaurants.length === 0) hasFitBounds.current = false;

    restaurants.forEach((r) => {
      const mentions = r.account_mentions || [];
      const color = mentions.length > 0 ? getAccountColor(mentions[0].account_id) : "#777c77";
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: { content: blogMarker({ name: r.name, color }), anchor: new window.naver.maps.Point(0, 0) },
      });
      window.naver.maps.Event.addListener(marker, "click", () => { panToPlace(r.lat, r.lng); onMarkerClick(r.id, false); });
      markersRef.current.push(marker);
    });

    if (restaurants.length > 0 && !hasFitBounds.current) {
      const bounds = new window.naver.maps.LatLngBounds();
      restaurants.forEach((r) => bounds.extend(new window.naver.maps.LatLng(r.lat, r.lng)));
      mapInstance.current.fitBounds(bounds, { padding: 60 });
      hasFitBounds.current = true;
    }
  }, [restaurants, accounts, mapReady]); // eslint-disable-line

  // 내 맛집 마커 (공유 클러스터 포함)
  useEffect(() => {
    if (!mapReady) return;
    personalMarkersRef.current.forEach((m) => m.setMap(null));
    personalMarkersRef.current = [];

    const allFollowing = followingPlaces.flatMap(({ places, nickname, colorIdx }) =>
      places.map((p) => ({ ...p, _nickname: nickname, _colorIdx: colorIdx }))
    );

    personalPlaces.forEach((r) => {
      const emoji = STATUS_EMOJI[r.status] || "";
      const sharedWith = allFollowing.filter((fp) => {
        if (r.naver_place_id && fp.naver_place_id) return r.naver_place_id === fp.naver_place_id;
        return isSameLocation(r, fp);
      });

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: {
          content: myMarker({
            name: r.name, emoji,
            shared: sharedWith.length > 0,
            avatars: sharedWith.slice(0, 2).map(({ _nickname, _colorIdx }) => ({
              initial: _nickname?.[0]?.toUpperCase() || "?",
              color: getFollowingColor(_colorIdx),
            })),
          }),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: sharedWith.length > 0 ? 10 : 5,
      });
      window.naver.maps.Event.addListener(marker, "click", () => { panToPlace(r.lat, r.lng); onMarkerClick(`personal_${r.id}`, true); });
      personalMarkersRef.current.push(marker);
    });
  }, [personalPlaces, followingPlaces, mapReady]); // eslint-disable-line

  // 팔로잉 마커 (겹치는 건 내 마커에 표시)
  useEffect(() => {
    if (!mapReady) return;
    followingMarkersRef.current.forEach((m) => m.setMap(null));
    followingMarkersRef.current = [];

    followingPlaces.forEach(({ userId, nickname, colorIdx, places }) => {
      const color = getFollowingColor(colorIdx);
      const initial = nickname?.[0]?.toUpperCase() || "?";

      places.forEach((r) => {
        const isDup = personalPlaces.some((p) => {
          if (p.naver_place_id && r.naver_place_id) return p.naver_place_id === r.naver_place_id;
          return isSameLocation(p, r);
        });
        if (isDup) return;

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(r.lat, r.lng),
          map: mapInstance.current,
          title: `${nickname}: ${r.name}`,
          icon: {
            content: followingMarker({ name: r.name, initial, color, emoji: STATUS_EMOJI[r.status] || "" }),
            anchor: new window.naver.maps.Point(0, 0),
          },
        });
        window.naver.maps.Event.addListener(marker, "click", () => {
          panToPlace(r.lat, r.lng);
          if (onFollowingMarkerClick) onFollowingMarkerClick({ ...r, ownerNickname: nickname, ownerUserId: userId });
        });
        followingMarkersRef.current.push(marker);
      });
    });
  }, [followingPlaces, personalPlaces, mapReady]); // eslint-disable-line

  return (
    <div style={{ flex: 1, height: "100vh", position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!mapReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f4f4f0",
          fontFamily: "'Manrope', sans-serif", fontSize: 13,
          color: "#a8a29e", letterSpacing: "0.05em",
        }}>
          불러오는 중...
        </div>
      )}
    </div>
  );
}
