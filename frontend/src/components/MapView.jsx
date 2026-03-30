// src/components/MapView.jsx
// 마커: 미니멀 — 이름 + 상태 도트만. 이모지/아바타 스택 제거.
import { useEffect, useRef, useState } from "react";

const FOLLOWING_COLORS = [
  "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56",
];
const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const MY_PRIMARY = "#655d54";
const MY_DIM     = "#595149";

const STATUS_DOT = {
  want_to_go:      "#BA7517",   // 황금 — 가고싶어요
  visited:         "#1D9E75",   // 초록 — 가봤어요
  want_revisit:    "#D4537E",   // 핑크 — 또가고싶어요
  not_recommended: "#afb3ae",   // 회색 — 별로
};

const isSameLocation = (a, b, threshold = 0.0001) =>
  Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;

/* ── 마커 HTML ───────────────────────────────────────────── */

// 내 맛집 — 작은 rounded pill, 상태 색상 도트
const myMarker = ({ name, status, shared = false }) => {
  const dotColor = STATUS_DOT[status] || MY_PRIMARY;
  return `
    <div style="
      display:inline-flex;align-items:center;gap:5px;
      background:${MY_PRIMARY};
      color:#fff6ef;
      padding:4px 9px 4px 6px;
      border-radius:6px;
      font-family:'Manrope',sans-serif;
      font-size:11px;font-weight:600;
      white-space:nowrap;
      box-shadow:0 2px 10px rgba(101,93,84,0.22);
      cursor:pointer;
      letter-spacing:0.01em;
      ${shared ? "outline:1.5px solid rgba(255,246,239,0.5);outline-offset:1px;" : ""}
    ">
      <span style="
        width:6px;height:6px;border-radius:50%;
        background:${dotColor};flex-shrink:0;
        display:inline-block;
      "></span>
      <span>${name}</span>
    </div>
  `;
};

// 팔로잉 마커 — 컬러 pill
const followingMarker = ({ name, color }) => `
  <div style="
    display:inline-flex;align-items:center;gap:4px;
    background:${color};
    color:white;
    padding:4px 9px;
    border-radius:6px;
    font-family:'Manrope',sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.15);
    cursor:pointer;
    letter-spacing:0.01em;
  ">
    <span>${name}</span>
  </div>
`;

// 블로거 맛집 마커
const blogMarker = ({ name, color }) => `
  <div style="
    display:inline-flex;align-items:center;
    background:${color};
    color:white;
    padding:4px 9px;
    border-radius:6px;
    font-family:'Manrope',sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.15);
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

  // 마커 클릭 시 지도 이동
  const panToPlace = (lat, lng) => {
    if (!mapInstance.current || !window.naver) return;
    const isMobile = window.innerWidth <= 768;
    const proj = mapInstance.current.getProjection();
    const targetLatLng = new window.naver.maps.LatLng(lat, lng);

    if (!isMobile) {
      mapInstance.current.panTo(targetLatLng, { duration: 280 });
      return;
    }

    // 모바일: x는 건드리지 않고 y만 아래로 이동 (하단 시트 위에 마커 표시)
    const pt = proj.fromCoordToOffset(targetLatLng);
    const offset = window.innerHeight * 0.22;
    const adjusted = proj.fromOffsetToCoord(
      new window.naver.maps.Point(pt.x, pt.y + offset)
    );
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
        icon: { content: blogMarker({ name: r.name, color }), anchor: new window.naver.maps.Point(6, 12) },
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        panToPlace(r.lat, r.lng);
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
  }, [restaurants, accounts, mapReady]); // eslint-disable-line

  // 내 맛집 마커 (공유 표시 포함)
  useEffect(() => {
    if (!mapReady) return;
    personalMarkersRef.current.forEach((m) => m.setMap(null));
    personalMarkersRef.current = [];

    const allFollowing = followingPlaces.flatMap(({ places, nickname, colorIdx }) =>
      places.map((p) => ({ ...p, _nickname: nickname, _colorIdx: colorIdx }))
    );

    personalPlaces.forEach((r) => {
      const sharedWith = allFollowing.filter((fp) => {
        if (r.naver_place_id && fp.naver_place_id) return r.naver_place_id === fp.naver_place_id;
        return isSameLocation(r, fp);
      });

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: {
          content: myMarker({ name: r.name, status: r.status, shared: sharedWith.length > 0 }),
          anchor: new window.naver.maps.Point(6, 12),
        },
        zIndex: sharedWith.length > 0 ? 10 : 5,
      });
      window.naver.maps.Event.addListener(marker, "click", () => {
        panToPlace(r.lat, r.lng);
        onMarkerClick(`personal_${r.id}`, true);
      });
      personalMarkersRef.current.push(marker);
    });
  }, [personalPlaces, followingPlaces, mapReady]); // eslint-disable-line

  // 팔로잉 마커
  useEffect(() => {
    if (!mapReady) return;
    followingMarkersRef.current.forEach((m) => m.setMap(null));
    followingMarkersRef.current = [];

    followingPlaces.forEach(({ userId, nickname, colorIdx, places }) => {
      const color = getFollowingColor(colorIdx);

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
            content: followingMarker({ name: r.name, color }),
            anchor: new window.naver.maps.Point(6, 12),
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
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!mapReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f4f4f0",
          fontFamily: "'Manrope', sans-serif", fontSize: 12,
          color: "#a8a29e", letterSpacing: "0.08em",
        }}>
          불러오는 중…
        </div>
      )}
    </div>
  );
}
