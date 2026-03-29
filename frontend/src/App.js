// src/App.js
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "./context/UserContext";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import RestaurantPanel from "./components/RestaurantPanel";
import AuthScreen from "./components/AuthScreen";
import BottomTabBar from "./components/BottomTabBar";
import FollowTab from "./components/FollowTab";
import ProfilePage from "./components/ProfilePage";
import NotificationTab from "./components/NotificationTab";
import ActivityFeed from "./components/ActivityFeed";
import LocationButton from "./components/LocationButton";
import MapFilter from "./components/MapFilter";
import SearchTab from "./components/SearchTab";
import RefreshButton from "./components/RefreshButton";
import "./App.css";

export const ACCOUNT_COLORS = [
  "#E8593C", "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56", "#993C1D",
];

export function getAccountColor(accountId, accounts) {
  const index = accounts.findIndex((a) => a.id === accountId);
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] || "#888";
}

export default function App() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState("map");
  const [unreadCount, setUnreadCount] = useState(0);
  const mapRef = useRef(null);

  const [accounts] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [personalPlaces, setPersonalPlaces] = useState([]);
  const [showPersonal, setShowPersonal] = useState(true);

  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedFollowingIds, setSelectedFollowingIds] = useState([]);
  const [followingPlacesMap, setFollowingPlacesMap] = useState({});
  const [followingList, setFollowingList] = useState([]);

  const isMobile = window.innerWidth <= 768;
  const SIDEBAR_WIDTH = 256; // desktopsearch.html: w-64 = 256px

  const loadPersonalPlaces = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/personal-places/?user_id=${user.user_id}`)
      .then((res) => setPersonalPlaces(res.data)).catch(() => {});
  }, [user]);

  const loadFollowingList = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowingList(res.data)).catch(() => {});
  }, [user]);

  const loadUnread = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`)
      .then((res) => setUnreadCount(res.data.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) { loadPersonalPlaces(); loadFollowingList(); loadUnread(); }
  }, [user, loadPersonalPlaces, loadFollowingList, loadUnread]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [user, loadUnread]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadPersonalPlaces(), loadFollowingList(), loadUnread(),
      ...selectedFollowingIds.map((uid) =>
        axios.get(`${API_BASE}/personal-places/?user_id=${uid}`)
          .then((res) => setFollowingPlacesMap((m) => ({ ...m, [uid]: res.data.filter((p) => p.is_public !== false) })))
          .catch(() => {})
      ),
    ]);
  }, [loadPersonalPlaces, loadFollowingList, loadUnread, selectedFollowingIds]);

  const handleToggleFollowing = useCallback(async (targetUserId) => {
    setSelectedFollowingIds((prev) => {
      if (prev.includes(targetUserId)) return prev.filter((id) => id !== targetUserId);
      if (!followingPlacesMap[targetUserId]) {
        axios.get(`${API_BASE}/personal-places/?user_id=${targetUserId}`)
          .then((res) => setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: res.data.filter((p) => p.is_public !== false) })))
          .catch(() => setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: [] })));
      }
      return [...prev, targetUserId];
    });
  }, [followingPlacesMap]);

  const followingPlaces = selectedFollowingIds.map((uid) => {
    const u = followingList.find((f) => f.id === uid);
    return { userId: uid, nickname: u?.nickname || "?", colorIdx: followingList.findIndex((f) => f.id === uid), places: followingPlacesMap[uid] || [] };
  });

  const handleMarkerClick = useCallback(async (restaurantId, isPersonal = false) => {
    if (isPersonal) {
      const place = personalPlaces.find((p) => `personal_${p.id}` === restaurantId);
      if (place) setSelectedRestaurant({ ...place, sources: [], isPersonal: true });
      return;
    }
    const res = await axios.get(`${API_BASE}/restaurants/${restaurantId}`);
    setSelectedRestaurant(res.data);
  }, [personalPlaces]);

  const handleFollowingMarkerClick = useCallback((place) => {
    setSelectedRestaurant({ ...place, sources: [], isPersonal: true });
  }, []);

  const handleActivityPlaceClick = useCallback((activity) => {
    setSelectedRestaurant({
      id: activity.place_id, name: activity.place_name,
      lat: activity.place_lat, lng: activity.place_lng,
      status: activity.place_status, user_id: activity.owner_id,
      isPersonal: true, sources: [],
    });
    setActiveTab("map");
    if (mapRef.current && window.naver) {
      mapRef.current.setCenter(new window.naver.maps.LatLng(activity.place_lat, activity.place_lng));
      mapRef.current.setZoom(16);
    }
  }, []);

  const hideRestaurant = useCallback((restaurantId, isPersonal = false) => {
    if (isPersonal) {
      const place = personalPlaces.find((p) => `personal_${p.id}` === restaurantId || p.id === restaurantId);
      if (place) {
        axios.delete(`${API_BASE}/personal-places/${place.id}${user ? `?user_id=${user.user_id}` : ""}`)
          .then(() => setPersonalPlaces((prev) => prev.filter((p) => p.id !== place.id)));
      }
    } else {
      setHiddenIds((prev) => new Set([...prev, restaurantId]));
    }
    setSelectedRestaurant(null);
  }, [personalPlaces, user]);

  const addPersonalPlace = useCallback(async (place) => {
    try {
      const payload = {
        name: place.name, address: place.address, lat: place.lat, lng: place.lng,
        category: place.category, naver_place_id: place.naver_place_id, naver_place_url: place.naver_place_url,
        folder_id: place.folder_id || null, status: place.status || "want_to_go",
        rating: place.rating || null, memo: place.memo || null, instagram_post_url: place.instagram_post_url || null,
      };
      const url = user ? `${API_BASE}/personal-places/?user_id=${user.user_id}` : `${API_BASE}/personal-places/`;
      const res = await axios.post(url, payload);
      setPersonalPlaces((prev) => { const exists = prev.find((p) => p.id === res.data.id); return exists ? prev : [...prev, res.data]; });
    } catch (e) { console.error("맛집 저장 실패", e); }
  }, [user]);

  const deletePersonalPlace = useCallback(async (placeId) => {
    await axios.delete(`${API_BASE}/personal-places/${placeId}${user ? `?user_id=${user.user_id}` : ""}`);
    setPersonalPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }, [user]);

  const handlePlaceUpdated = useCallback((updatedPlace) => {
    setPersonalPlaces((prev) => prev.map((p) => p.id === updatedPlace.id ? { ...p, ...updatedPlace } : p));
  }, []);

  const filteredPersonalPlaces = activeFilter ? personalPlaces.filter((p) => p.status === activeFilter) : personalPlaces;
  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#faf9f6", flexDirection: "column", gap: 16,
      }}>
        <h1 style={{ fontFamily: "'Noto Serif', Georgia, serif", fontStyle: "italic", fontSize: 28, color: "#655d54", margin: 0 }}>
          나의 공간
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8a29e", margin: 0 }}>
          The Curated Archive
        </p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // ── 탭별 전체화면 콘텐츠 (모바일) ──────────────────────────────
  const renderMobileTab = () => {
    if (activeTab === "feed")    return <ActivityFeed onPlaceClick={handleActivityPlaceClick} />;
    if (activeTab === "search")  return <SearchTab onPlaceAdded={(p) => setPersonalPlaces((prev) => { const e = prev.find((x) => x.id === p.id); return e ? prev : [...prev, p]; })} />;
    if (activeTab === "follow")  return <FollowTab onViewMap={() => setActiveTab("map")} onFollowChange={loadFollowingList} />;
    if (activeTab === "notify")  return <NotificationTab onUnreadChange={setUnreadCount} />;
    if (activeTab === "profile") return <ProfilePage />;
    return null;
  };

  // ── 데스크탑 탭별 메인 콘텐츠 ──────────────────────────────────
  const renderDesktopContent = () => {
    if (activeTab === "feed")    return <ActivityFeed onPlaceClick={handleActivityPlaceClick} />;
    if (activeTab === "search")  return <SearchTab onPlaceAdded={(p) => setPersonalPlaces((prev) => { const e = prev.find((x) => x.id === p.id); return e ? prev : [...prev, p]; })} />;
    if (activeTab === "follow")  return <FollowTab onViewMap={() => setActiveTab("map")} onFollowChange={loadFollowingList} />;
    if (activeTab === "notify")  return <NotificationTab onUnreadChange={setUnreadCount} />;
    if (activeTab === "profile") return <ProfilePage />;
    return null;
  };

  const showMap = activeTab === "map";

  return (
    <div className="app">

      {/* ── 모바일 ─────────────────────────────────────────────── */}
      {isMobile && (
        <>
          {/* 지도 탭이 아닌 경우 전체 화면 탭 */}
          {!showMap && (
            <div style={{ position: "fixed", inset: 0, zIndex: 20, paddingBottom: 64 }}>
              {renderMobileTab()}
            </div>
          )}

          {/* 지도는 항상 렌더, 다른 탭 땐 뒤로 감춤 */}
          <div style={{ display: showMap ? "block" : "none", position: "fixed", inset: 0 }}>
            <MapView
              restaurants={visibleRestaurants}
              personalPlaces={showPersonal ? filteredPersonalPlaces : []}
              accounts={accounts}
              onMarkerClick={handleMarkerClick}
              onMapReady={(map) => { mapRef.current = map; }}
              followingPlaces={followingPlaces}
              onFollowingMarkerClick={handleFollowingMarkerClick}
            />
          </div>

          {/* 지도 탭 UI 오버레이 */}
          {showMap && (
            <>
              <MapFilter
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                sidebarWidth={0}
                followingList={followingList}
                selectedFollowingIds={selectedFollowingIds}
                onToggleFollowing={handleToggleFollowing}
                showPersonal={showPersonal}
                onTogglePersonal={() => setShowPersonal((v) => !v)}
              />
              <RefreshButton onRefresh={handleRefresh} />
              <LocationButton map={mapRef.current} />
            </>
          )}

          {/* 맛집 상세 패널 */}
          {selectedRestaurant && (
            <RestaurantPanel
              restaurant={selectedRestaurant} accounts={accounts}
              onClose={() => setSelectedRestaurant(null)} onHide={hideRestaurant}
              apiBase={API_BASE} sidebarWidth={0}
              onPlaceUpdated={handlePlaceUpdated} mapInstance={mapRef.current}
            />
          )}

          <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
        </>
      )}

      {/* ── 데스크탑 ────────────────────────────────────────────── */}
      {!isMobile && (
        <>
          {/* 좌측 고정 사이드바 — desktopsearch.html: w-64 fixed */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            apiBase={API_BASE}
            onAddPersonalPlace={addPersonalPlace}
            personalPlaces={personalPlaces}
            showPersonal={showPersonal}
            setShowPersonal={setShowPersonal}
            onDeletePersonalPlace={deletePersonalPlace}
            unreadCount={unreadCount}
            onUnreadChange={setUnreadCount}
            selectedFollowingIds={selectedFollowingIds}
            onToggleFollowing={handleToggleFollowing}
            followingList={followingList}
            onFollowChange={loadFollowingList}
            onActivityPlaceClick={handleActivityPlaceClick}
          />

          {/* 메인 콘텐츠 영역 — ml-64 */}
          <div style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, minHeight: "100vh", display: "flex" }}>
            {showMap ? (
              /* 지도 화면 */
              <div style={{ flex: 1, position: "relative" }}>
                <MapView
                  restaurants={visibleRestaurants}
                  personalPlaces={showPersonal ? filteredPersonalPlaces : []}
                  accounts={accounts}
                  onMarkerClick={handleMarkerClick}
                  onMapReady={(map) => { mapRef.current = map; }}
                  followingPlaces={followingPlaces}
                  onFollowingMarkerClick={handleFollowingMarkerClick}
                />
                <MapFilter
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  sidebarWidth={0}
                  followingList={[]}
                  selectedFollowingIds={selectedFollowingIds}
                  onToggleFollowing={handleToggleFollowing}
                  showPersonal={showPersonal}
                  onTogglePersonal={() => setShowPersonal((v) => !v)}
                />
                <RefreshButton onRefresh={handleRefresh} />
                <LocationButton map={mapRef.current} />
              </div>
            ) : (
              /* 다른 탭 콘텐츠 */
              <div style={{ flex: 1, display: "flex" }}>
                {renderDesktopContent()}
              </div>
            )}
          </div>

          {/* 맛집 상세 패널 (지도 탭) */}
          {selectedRestaurant && showMap && (
            <RestaurantPanel
              restaurant={selectedRestaurant} accounts={accounts}
              onClose={() => setSelectedRestaurant(null)} onHide={hideRestaurant}
              apiBase={API_BASE} sidebarWidth={SIDEBAR_WIDTH}
              onPlaceUpdated={handlePlaceUpdated} mapInstance={mapRef.current}
            />
          )}
        </>
      )}
    </div>
  );
}
