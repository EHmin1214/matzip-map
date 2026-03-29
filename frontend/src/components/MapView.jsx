// src/components/MapView.jsx
import { useEffect, useRef, useState } from "react";
import { getAccountColor } from "../App";

const STATUS_EMOJI = {
  want_to_go:      "🔖",
  visited:         "✅",
  want_revisit:    "❤️",
  not_recommended: "👎",
};

// My Space 컬러 팔레트
const FOLLOWING_COLORS = [
  "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56",
];
const getFollowingColor = (idx) => FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];

const MY_PRIMARY = "#655d54";

const isSameLocation = (a, b, threshold = 0.0001) =>
  Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;

// 세련된 마커 HTML 생성
const makeMarker = ({ label, color = MY_PRIMARY, emoji = "", shared = false, avatars = [], bgOpacity = 1 }) => {
  const avatarHTML = avatars.slice(0, 2).map(({ initial, color: ac }) => `
    <div style="
      width:14px;height:14px;border-radius:50%;
      background:${ac};
      display:inline-flex;align-items:center;justify-content:center;
      font-size:7px;color:white;font-weight:800;font-family:'Manrope',sans-serif;
      border:1.5px solid #faf9f6;margin-left:-3px;
    ">${initial}</div>
  `).join("");

  return `
    <div style="
      display:inline-flex;align-items:center;gap:5px;
      background:${color};
      color:#fff6ef;
      padding:5px ${avatars.length > 0 ? "8px" : "10px"} 5px ${emoji ? "7px" : "10px"};
      border-radius:${shared ? "12px" : "10px"};
      font-family:'Manrope',sans-serif;
      font-size:11px;font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 10px rgba(47,52,48,${shared ? "0.25" : "0.18"});
      cursor:pointer;
      border:${shared ? "2px solid #faf9f6" : "none"};
      letter-spacing:0.01em;
      outline:${shared ? `2px solid ${color}` : "none"};
    ">
      ${emoji ? `<span style="font-size:12px;">${emoji}</span>` : ""}
      <span>${label}</span>
      ${avatarHTML ? `<div style="display:flex;align-items:center;">${avatarHTML}</div>` : ""}
    </div>
  `;
};

const makeFollowingMarker = ({ label, initial, color, emoji = "" }) => `
  <div style="
    display:inline-flex;align-items:center;gap:6px;
    background:${color};
    color:#fff6ef;
    padding:4px 10px 4px 4px;
    border-radius:20px;
    font-family:'Manrope',sans-serif;
    font-size:11px;font-weight:700;
    white-space:nowrap;
    box-shadow:0 2px 10px rgba(47,52,48,0.2);
    cursor:pointer;
    border:2px solid #faf9f6;
    letter-spacing:0.01em;
  ">
    <div style="
      width:20px;height:20px;border-radius:50%;
      background:rgba(255,246,239,0.25);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:800;flex-shrink:0;
    ">${initial}</div>
    ${emoji ? `<span style="font-size:12px;">${emoji}</span>` : ""}
    <span>${label}</span>
  </div>
`;

export default function MapView({
  restaurants, personalPlaces = [], accounts, onMarkerClick, onMapReady,
  followingPlaces = [],
  onFollowingMarkerClick,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const personalMarkersRef = useRef([]);
  const followingMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const hasFitBounds = useRef(false);

  useEffect(() => {
    const checkNaver = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(checkNaver);
        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(37.5665, 126.978),
          zoom: 13,
          mapTypeControl: false,
        });
        setMapReady(true);
        if (onMapReady) onMapReady(mapInstance.current);
      }
    }, 100);
    return () => clearInterval(checkNaver);
  }, []); // eslint-disable-line

  const panToPlace = (lat, lng) => {
    if (!mapInstance.current) return;
    const isMobile = window.innerWidth <= 768;
    const panelHeight = isMobile ? window.innerHeight * 0.3 : window.innerHeight * 0.25;
    const projection = mapInstance.current.getProjection();
    const point = projection.fromCoordToOffset(new window.naver.maps.LatLng(lat, lng));
    const adjustedCoord = projection.fromOffsetToCoord(
      new window.naver.maps.Point(point.x, point.y + panelHeight)
    );
    mapInstance.current.panTo(adjustedCoord, { duration: 300 });
  };

  // 블로거 맛집
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

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: {
          content: makeMarker({ label: r.name + (hasMultiMention ? " ·" : ""), color }),
          anchor: new window.naver.maps.Point(0, 0),
        },
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

  // 내 맛집 + 공유 클러스터
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    personalMarkersRef.current.forEach((m) => m.setMap(null));
    personalMarkersRef.current = [];

    const allFollowingPlaces = followingPlaces.flatMap(({ places, nickname, colorIdx }) =>
      places.map((p) => ({ ...p, _nickname: nickname, _colorIdx: colorIdx }))
    );

    personalPlaces.forEach((r) => {
      const emoji = STATUS_EMOJI[r.status] || "";
      const sharedWith = allFollowingPlaces.filter((fp) => {
        if (r.naver_place_id && fp.naver_place_id) return r.naver_place_id === fp.naver_place_id;
        return isSameLocation(r, fp);
      });
      const isShared = sharedWith.length > 0;

      const avatars = sharedWith.slice(0, 2).map(({ _nickname, _colorIdx }) => ({
        initial: _nickname?.[0]?.toUpperCase() || "?",
        color: getFollowingColor(_colorIdx),
      }));

      const content = makeMarker({
        label: r.name,
        color: MY_PRIMARY,
        emoji,
        shared: isShared,
        avatars,
      });

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: { content, anchor: new window.naver.maps.Point(0, 0) },
        zIndex: isShared ? 10 : 5,
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
    if (!mapReady || !mapInstance.current) return;
    followingMarkersRef.current.forEach((m) => m.setMap(null));
    followingMarkersRef.current = [];

    followingPlaces.forEach(({ userId, nickname, colorIdx, places }) => {
      const color = getFollowingColor(colorIdx);
      const initial = nickname?.[0]?.toUpperCase() || "?";

      places.forEach((r) => {
        const isDuplicate = personalPlaces.some((p) => {
          if (p.naver_place_id && r.naver_place_id) return p.naver_place_id === r.naver_place_id;
          return isSameLocation(p, r);
        });
        if (isDuplicate) return;

        const emoji = STATUS_EMOJI[r.status] || "";
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(r.lat, r.lng),
          map: mapInstance.current,
          title: `${nickname}: ${r.name}`,
          icon: {
            content: makeFollowingMarker({ label: r.name, initial, color, emoji }),
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
          background: "#f4f4f0", fontSize: 14, color: "#777c77",
          fontFamily: "'Manrope', sans-serif",
        }}>
          지도 불러오는 중...
        </div>
      )}

      {/* 범례 */}
      {followingPlaces.length > 0 && (
        <div style={{
          position: "absolute", bottom: 80, right: 72,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: 12, padding: "12px 14px",
          boxShadow: "0 4px 20px rgba(47,52,48,0.08)",
          border: "1px solid rgba(101,93,84,0.08)",
          fontSize: 11, maxWidth: 160,
        }}>
          {followingPlaces.map(({ nickname, colorIdx }) => (
            <div key={nickname} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: getFollowingColor(colorIdx),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: "white", fontWeight: 800,
                fontFamily: "'Manrope', sans-serif",
              }}>
                {nickname?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: "#2f3430", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nickname}</span>
            </div>
          ))}
          <div style={{
            borderTop: "1px solid rgba(101,93,84,0.08)", marginTop: 6, paddingTop: 6,
            fontFamily: "'Manrope', sans-serif", fontSize: 9, color: "#afb3ae",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            공유 장소 = 겹친 마커
          </div>
        </div>
      )}
    </div>
  );
}
