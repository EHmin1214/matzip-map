// src/components/MapView.jsx
// 마커: 미니멀 — 이름 + 상태 도트만. 이모지/아바타 스택 제거.
import { useEffect, useRef, useState } from "react";

import { FOLLOWING_COLORS, getFollowingColor, SHARED_CAT_COLOR } from "../constants";

const MY_PRIMARY = "#655d54";
const MY_DIM     = "#595149";

const STATUS_DOT = {
  want_to_go:      "#BA7517",   // 황금 — 가고싶어요
  visited:         "#1D9E75",   // 초록 — 가봤어요
  want_revisit:    "#D4537E",   // 핑크 — 또가고싶어요
};

const isSameLocation = (a, b, threshold = 0.0001) =>
  Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;

/* ── 마커 HTML ───────────────────────────────────────────── */

// 내 맛집 — 컬렉션/상태 색상 pill (dot 제거)
const myMarker = ({ name, status, shared = false, folderColor }) => {
  const bg = folderColor || STATUS_DOT[status] || MY_PRIMARY;
  return `
    <div class="map-pill" style="
      display:inline-flex;align-items:center;
      background:${bg};
      color:#fff6ef;
      padding:4px 9px;
      border-radius:6px;
      font-family:'Manrope',-apple-system,sans-serif;
      font-size:11px;font-weight:600;
      white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,0.18);
      cursor:pointer;
      letter-spacing:0.01em;
      ${shared ? "outline:1.5px solid rgba(255,246,239,0.5);outline-offset:1px;" : ""}
    ">
      <span>${name}</span>
    </div>
  `;
};

// 팔로잉 마커 — 프로필 아바타 + 이름
const followingMarker = ({ name, color, nickname }) => `
  <div class="map-pill" style="
    display:inline-flex;align-items:center;gap:5px;
    background:rgba(255,255,255,0.92);
    color:${color};
    padding:4px 9px 4px 4px;
    border-radius:6px;
    border:1.5px solid ${color};
    font-family:'Manrope',-apple-system,sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.08);
    cursor:pointer;
    letter-spacing:0.01em;
  ">
    <span style="
      width:18px;height:18px;border-radius:50%;
      background:${color};
      display:inline-flex;align-items:center;justify-content:center;
      font-family:'Noto Serif',Georgia,serif;font-style:italic;
      font-size:9px;color:white;font-weight:700;flex-shrink:0;
    ">${nickname?.[0]?.toUpperCase() || '?'}</span>
    <span>${name}</span>
  </div>
`;

// 블로거 맛집 마커
const blogMarker = ({ name, color }) => `
  <div class="map-pill" style="
    display:inline-flex;align-items:center;
    background:${color};
    color:white;
    padding:4px 9px;
    border-radius:6px;
    font-family:'Manrope',-apple-system,sans-serif;
    font-size:11px;font-weight:600;
    white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.15);
    cursor:pointer;
    letter-spacing:0.01em;
  ">${name}</div>
`;

// 우리의 공간 마커 — (N) 장소명, 채움 스타일
const sharedMarker = ({ name, count, category }) => {
  const color = SHARED_CAT_COLOR[category] || "#655d54";
  return `
  <div class="map-pill" style="
    display:inline-flex;align-items:center;gap:4px;
    background:${color};
    color:#fff6ef;
    padding:4px 9px;
    border-radius:6px;
    font-family:'Manrope',-apple-system,sans-serif;
    font-size:11px;
    white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,0.18);
    cursor:pointer;
    letter-spacing:0.01em;
  ">
    <span style="font-weight:800">(${count})</span>
    <span style="font-weight:600">${name}</span>
  </div>
`;
};

const ZOOM_THRESHOLD = 12; // 이 줌 이하면 dot, 이상이면 pill

// 축소 시 보이는 dot 마커
const dotMarker = (color) => `
  <div style="
    width:8px;height:8px;border-radius:50%;
    background:${color};
    border:1.5px solid rgba(255,255,255,0.8);
    box-shadow:0 1px 4px rgba(0,0,0,0.25);
  "></div>
`;

export default function MapView({
  restaurants, personalPlaces = [], accounts, onMarkerClick, onMapReady,
  followingPlaces = [], onFollowingMarkerClick, folders = [],
  focusPlace = null,
  mapMode = "personal", sharedPlaces = [], onSharedMarkerClick,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const personalMarkersRef = useRef([]);
  const followingMarkersRef = useRef([]);
  const sharedMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const hasFitBounds = useRef(false);
  const activeMarkerRef = useRef(null);
  const zoomRef = useRef(13);

  // 마커 DOM 컨테이너 z-index 설정 (네이버 지도 내부 래퍼까지 올림)
  const setMarkerZ = (marker, z) => {
    try {
      marker.setZIndex(z);
      const el = marker.getElement?.();
      if (el) {
        el.style.zIndex = z;
        // 네이버 지도는 마커를 여러 겹의 div로 감쌈 — 가장 가까운 position:absolute 부모까지
        let parent = el.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          if (parent.style.position === "absolute" || getComputedStyle(parent).position === "absolute") {
            parent.style.zIndex = z;
            break;
          }
          parent = parent.parentElement;
        }
      }
    } catch (e) {}
  };

  // z-index 스택 카운터 — hover/touch 할 때마다 증가 (FILO)
  const zCounterRef = useRef(100);

  // 모바일 touchstart 리스너를 마커 DOM에 부착 (중복 방지)
  const attachTouchZ = (marker) => {
    const el = marker.getElement?.();
    if (!el || el._touchZAttached) return;
    el.addEventListener("touchstart", () => {
      zCounterRef.current += 1;
      setMarkerZ(marker, zCounterRef.current);
    }, { passive: true });
    el._touchZAttached = true;
  };

  const bringToFront = (marker) => {
    // 이전 활성 마커: 줌아웃 상태이면 dot으로 복원
    if (activeMarkerRef.current && activeMarkerRef.current !== marker) {
      if (zoomRef.current < ZOOM_THRESHOLD && activeMarkerRef.current._dotIcon) {
        activeMarkerRef.current.setIcon(activeMarkerRef.current._dotIcon);
      }
    }
    // 클릭된 마커: 항상 pill로 표시 (줌아웃에서도 이름 보이게)
    if (marker._pillIcon) marker.setIcon(marker._pillIcon);
    // 맵에서 제거 후 재추가 → 렌더링 최상위 + DOM z-index
    try {
      const map = mapInstance.current;
      marker.setMap(null);
      marker.setMap(map);
      zCounterRef.current += 1;
      const z = zCounterRef.current;
      requestAnimationFrame(() => {
        setMarkerZ(marker, z);
        attachTouchZ(marker);
      });
    } catch (e) {}
    activeMarkerRef.current = marker;
  };

  // 마커에 hover/touch 이벤트 — FILO 스택: 올라온 순서대로 z-index 유지
  const addHoverZ = (marker) => {
    // 데스크톱: mouseover — 카운터 증가, mouseout에서 되돌리지 않음
    window.naver.maps.Event.addListener(marker, "mouseover", () => {
      zCounterRef.current += 1;
      setMarkerZ(marker, zCounterRef.current);
    });
    // 모바일: touchstart (DOM 렌더 후 부착)
    requestAnimationFrame(() => attachTouchZ(marker));
  };

  // 줌 레벨에 따라 모든 마커의 icon을 pill ↔ dot으로 전환
  const updateMarkerIcons = (showPill) => {
    const allMarkers = [
      ...markersRef.current,
      ...personalMarkersRef.current,
      ...followingMarkersRef.current,
      ...sharedMarkersRef.current,
    ];
    allMarkers.forEach((m) => {
      // 활성(클릭된) 마커는 항상 pill 유지
      if (m === activeMarkerRef.current) return;
      const icon = showPill ? m._pillIcon : m._dotIcon;
      if (icon) {
        m.setIcon(icon);
        requestAnimationFrame(() => attachTouchZ(m));
      }
    });
  };

  const getFolderColor = (folderId) => {
    if (!folderId) return null;
    const f = folders.find((x) => x.id === folderId);
    return f?.color || null;
  };

  const getAccountColor = (accountId) => {
    const COLORS = ["#E8593C","#3B8BD4","#1D9E75","#BA7517","#7F77DD","#D4537E","#0F6E56","#993C1D"];
    const idx = accounts.findIndex((a) => a.id === accountId);
    return COLORS[idx % COLORS.length] || "#777c77";
  };

  // 지도 초기화
  useEffect(() => {
    const FALLBACK = { lat: 37.5665, lng: 126.978 }; // 서울 시청

    const initMap = (lat, lng) => {
      mapInstance.current = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(lat, lng),
        zoom: 13,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      window.naver.maps.Event.addListener(mapInstance.current, "zoom_changed", (zoom) => {
        const wasPill = zoomRef.current >= ZOOM_THRESHOLD;
        const isPill = zoom >= ZOOM_THRESHOLD;
        zoomRef.current = zoom;
        if (wasPill !== isPill) updateMarkerIcons(isPill);
      });
      setMapReady(true);
      if (onMapReady) onMapReady(mapInstance.current);
    };

    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check);
        // 현위치 기반 초기화, 실패 시 서울 시청 폴백
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
            () => initMap(FALLBACK.lat, FALLBACK.lng),
            { timeout: 3000, maximumAge: 300000 }
          );
        } else {
          initMap(FALLBACK.lat, FALLBACK.lng);
        }
      }
    }, 100);
    return () => clearInterval(check);
  }, []); // eslint-disable-line

  // 마커 클릭 시 지도 이동 — pill 중앙을 보이는 영역 중앙에 배치
  const panToPlace = (lat, lng, markerEl) => {
    const map = mapInstance.current;
    if (!map || !window.naver) return;

    const isMob = window.innerWidth <= 768;
    const proj = map.getProjection();
    const coord = new window.naver.maps.LatLng(lat, lng);
    const size = map.getSize();

    // pill 중앙 오프셋 (anchor x=6 기준)
    let pillOffsetX = 34;
    if (markerEl) {
      const el = markerEl.getElement?.() || markerEl._element;
      if (el) {
        const pill = el.querySelector("div");
        if (pill) pillOffsetX = pill.offsetWidth / 2 - 6;
      }
    }

    // 보이는 영역의 중앙 (맵 픽셀 좌표)
    const mapCX = size.width / 2;
    const mapCY = size.height / 2;
    let visibleCX, visibleCY;

    if (isMob) {
      // 모바일: 하단 시트(~210) + 탭바(64) = ~274px 가림
      visibleCX = mapCX;
      visibleCY = (size.height - 274) / 2;
    } else {
      // 데스크톱: 좌측 패널 360px 가림
      const panelW = 360;
      visibleCX = panelW + (size.width - panelW) / 2;
      visibleCY = mapCY;
    }

    // 마커 좌표의 픽셀 위치
    const markerPx = proj.fromCoordToOffset(coord);

    // panTo(coord) 시 마커 anchor → (mapCX, mapCY)
    // pill 중앙 → (mapCX + pillOffsetX, mapCY)
    // pill 중앙을 (visibleCX, visibleCY)에 놓으려면
    // 뷰포트 중앙을 (markerPx + pillOffsetX - (visibleCX - mapCX), markerPx.y - (visibleCY - mapCY))로 이동
    const newCenterPx = new window.naver.maps.Point(
      markerPx.x + pillOffsetX - (visibleCX - mapCX),
      markerPx.y - (visibleCY - mapCY)
    );
    const newCenter = proj.fromOffsetToCoord(newCenterPx);
    map.panTo(newCenter, { duration: 280 });
  };

  // 모드 전환 시 마커 숨김/표시
  useEffect(() => {
    if (!mapReady) return;
    const isPersonal = mapMode === "personal";
    markersRef.current.forEach((m) => m.setMap(isPersonal ? mapInstance.current : null));
    // shared 모드에서도 personalPlaces가 넘어오면 표시 (App에서 빈 배열이면 마커 없음)
    personalMarkersRef.current.forEach((m) => m.setMap(mapInstance.current));
    followingMarkersRef.current.forEach((m) => m.setMap(isPersonal ? mapInstance.current : null));
    sharedMarkersRef.current.forEach((m) => m.setMap(!isPersonal ? mapInstance.current : null));
  }, [mapMode, mapReady]);

  // 블로거 맛집 마커
  useEffect(() => {
    if (!mapReady) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    zCounterRef.current = 100;
    if (restaurants.length === 0) hasFitBounds.current = false;

    const isPill = zoomRef.current >= ZOOM_THRESHOLD;
    restaurants.forEach((r) => {
      const mentions = r.account_mentions || [];
      const color = mentions.length > 0 ? getAccountColor(mentions[0].account_id) : "#777c77";
      const pillIcon = { content: blogMarker({ name: r.name, color }), anchor: new window.naver.maps.Point(6, 12) };
      const dotIcon_ = { content: dotMarker(color), anchor: new window.naver.maps.Point(4, 4) };
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        zIndex: 1,
        icon: isPill ? pillIcon : dotIcon_,
      });
      marker._pillIcon = pillIcon;
      marker._dotIcon = dotIcon_;
      window.naver.maps.Event.addListener(marker, "click", () => {
        bringToFront(marker);
        panToPlace(r.lat, r.lng, marker);
        onMarkerClick(r.id, false);
      });
      addHoverZ(marker);
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
    zCounterRef.current = 100;

    const allFollowing = followingPlaces.flatMap(({ places, nickname, colorIdx }) =>
      places.map((p) => ({ ...p, _nickname: nickname, _colorIdx: colorIdx }))
    );

    const isPill = zoomRef.current >= ZOOM_THRESHOLD;
    personalPlaces.forEach((r) => {
      const sharedWith = allFollowing.filter((fp) => {
        if (r.naver_place_id && fp.naver_place_id) return r.naver_place_id === fp.naver_place_id;
        return isSameLocation(r, fp);
      });

      const folderColor = getFolderColor(r.folder_id);
      const dotColor = folderColor || STATUS_DOT[r.status] || MY_PRIMARY;
      const pillIcon = {
        content: myMarker({ name: r.name, status: r.status, shared: sharedWith.length > 0, folderColor }),
        anchor: new window.naver.maps.Point(6, 12),
      };
      const dotIcon_ = { content: dotMarker(dotColor), anchor: new window.naver.maps.Point(4, 4) };
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(r.lat, r.lng),
        map: mapInstance.current,
        title: r.name,
        icon: isPill ? pillIcon : dotIcon_,
        zIndex: sharedWith.length > 0 ? 2 : 1,
      });
      marker._pillIcon = pillIcon;
      marker._dotIcon = dotIcon_;
      window.naver.maps.Event.addListener(marker, "click", () => {
        bringToFront(marker);
        panToPlace(r.lat, r.lng, marker);
        onMarkerClick(`personal_${r.id}`, true);
      });
      addHoverZ(marker);
      personalMarkersRef.current.push(marker);
    });
  }, [personalPlaces, followingPlaces, folders, mapReady]); // eslint-disable-line

  // 팔로잉 마커
  useEffect(() => {
    if (!mapReady) return;
    followingMarkersRef.current.forEach((m) => m.setMap(null));
    followingMarkersRef.current = [];
    zCounterRef.current = 100;

    const isPill = zoomRef.current >= ZOOM_THRESHOLD;
    followingPlaces.forEach(({ userId, nickname, colorIdx, places }) => {
      const color = getFollowingColor(colorIdx);

      places.forEach((r) => {
        const isDup = personalPlaces.some((p) => {
          if (p.naver_place_id && r.naver_place_id) return p.naver_place_id === r.naver_place_id;
          return isSameLocation(p, r);
        });
        if (isDup) return;

        const pillIcon = {
          content: followingMarker({ name: r.name, color, nickname }),
          anchor: new window.naver.maps.Point(6, 12),
        };
        const dotIcon_ = { content: dotMarker(color), anchor: new window.naver.maps.Point(4, 4) };
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(r.lat, r.lng),
          map: mapInstance.current,
          title: `${nickname}: ${r.name}`,
          zIndex: 1,
          icon: isPill ? pillIcon : dotIcon_,
        });
        marker._pillIcon = pillIcon;
        marker._dotIcon = dotIcon_;
        window.naver.maps.Event.addListener(marker, "click", () => {
          bringToFront(marker);
          panToPlace(r.lat, r.lng, marker);
          if (onFollowingMarkerClick) onFollowingMarkerClick({ ...r, ownerNickname: nickname, ownerUserId: userId });
        });
        addHoverZ(marker);
        followingMarkersRef.current.push(marker);
      });
    });
  }, [followingPlaces, personalPlaces, mapReady]); // eslint-disable-line

  // 우리의 공간 마커
  useEffect(() => {
    if (!mapReady) return;
    sharedMarkersRef.current.forEach((m) => m.setMap(null));
    sharedMarkersRef.current = [];

    if (mapMode !== "shared") return;

    const isPill = zoomRef.current >= ZOOM_THRESHOLD;
    sharedPlaces.forEach((p) => {
      const catColor = SHARED_CAT_COLOR[p.category] || MY_PRIMARY;
      const pillIcon = {
        content: sharedMarker({ name: p.name, count: p.pick_count, category: p.category }),
        anchor: new window.naver.maps.Point(6, 12),
      };
      const dotIcon_ = { content: dotMarker(catColor), anchor: new window.naver.maps.Point(4, 4) };
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map: mapInstance.current,
        title: `(${p.pick_count}) ${p.name}`,
        zIndex: p.pick_count,
        icon: isPill ? pillIcon : dotIcon_,
      });
      marker._pillIcon = pillIcon;
      marker._dotIcon = dotIcon_;
      window.naver.maps.Event.addListener(marker, "click", () => {
        bringToFront(marker);
        panToPlace(p.lat, p.lng, marker);
        if (onSharedMarkerClick) onSharedMarkerClick(p);
      });
      addHoverZ(marker);
      sharedMarkersRef.current.push(marker);
    });
  }, [sharedPlaces, mapMode, mapReady]); // eslint-disable-line

  // 피드에서 다이렉트로 진입한 장소 — 임시 마커 표시
  const focusMarkerRef = useRef(null);
  useEffect(() => {
    if (focusMarkerRef.current) { focusMarkerRef.current.setMap(null); focusMarkerRef.current = null; }
    if (!mapReady || !focusPlace || !window.naver) return;

    // 이미 지도에 마커가 있는 장소면 임시 마커 불필요
    const allMarkers = [...personalMarkersRef.current, ...followingMarkersRef.current, ...sharedMarkersRef.current];
    const exists = allMarkers.some((m) => {
      const pos = m.getPosition();
      return Math.abs(pos.lat() - focusPlace.lat) < 0.0001 && Math.abs(pos.lng() - focusPlace.lng) < 0.0001;
    });
    if (exists) return;

    const color = focusPlace.owner_nickname ? "#8B7E74" : MY_PRIMARY;
    const inner = focusPlace.owner_nickname
      ? followingMarker({ name: focusPlace.name, color, nickname: focusPlace.owner_nickname })
      : myMarker({ name: focusPlace.name, status: focusPlace.status });
    const icon = {
      content: `<div style="transform:translateX(-50%)">${inner}</div>`,
      anchor: new window.naver.maps.Point(0, 12),
    };
    focusMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(focusPlace.lat, focusPlace.lng),
      map: mapInstance.current, icon, zIndex: 10,
    });
  }, [focusPlace, mapReady]); // eslint-disable-line

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <style>{`
        .map-pill { transition: transform 0.1s; }
        .map-pill:hover { transform: scale(1.03); }
      `}</style>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!mapReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f4f4f0",
          fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: 12,
          color: "#a8a29e", letterSpacing: "0.08em",
        }}>
          불러오는 중…
        </div>
      )}
    </div>
  );
}
