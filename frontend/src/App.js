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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedFollowingIds, setSelectedFollowingIds] = useState([]);
  const [followingPlacesMap, setFollowingPlacesMap] = useState({});
  const [followingList, setFollowingList] = useState([]);

  const isMobile = window.innerWidth <= 768;

  const loadPersonalPlaces = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/personal-places/?user_id=${user.user_id}`)
      .then((res) => setPersonalPlaces(res.data))
      .catch(() => {});
  }, [user]);

  const loadFollowingList = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowingList(res.data))
      .catch(() => {});
  }, [user]);

  const loadUnread = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`)
      .then((res) => setUnreadCount(res.data.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPersonalPlaces();
      loadFollowingList();
      loadUnread();
    }
  }, [user, loadPersonalPlaces, loadFollowingList, loadUnread]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [user, loadUnread]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadPersonalPlaces(),
      loadFollowingList(),
      loadUnread(),
      ...selectedFollowingIds.map((uid) =>
        axios.get(`${API_BASE}/personal-places/?user_id=${uid}`)
          .then((res) => {
            const publicPlaces = res.data.filter((p) => p.is_public !== false);
            setFollowingPlacesMap((m) => ({ ...m, [uid]: publicPlaces }));
          })
          .catch(() => {})
      ),
    ]);
  }, [loadPersonalPlaces, loadFollowingList, loadUnread, selectedFollowingIds]);

  const handleToggleFollowing = useCallback(async (targetUserId) => {
    setSelectedFollowingIds((prev) => {
      if (prev.includes(targetUserId)) {
        return prev.filter((id) => id !== targetUserId);
      } else {
        if (!followingPlacesMap[targetUserId]) {
          axios.get(`${API_BASE}/personal-places/?user_id=${targetUserId}`)
            .then((res) => {
              const publicPlaces = res.data.filter((p) => p.is_public !== false);
              setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: publicPlaces }));
            })
            .catch(() => setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: [] })));
        }
        return [...prev, targetUserId];
      }
    });
  }, [followingPlacesMap]);

  const followingPlaces = selectedFollowingIds.map((uid) => {
    const u = followingList.find((f) => f.id === uid);
    return {
      userId: uid,
      nickname: u?.nickname || "?",
      colorIdx: followingList.findIndex((f) => f.id === uid),
      places: followingPlacesMap[uid] || [],
    };
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
        name: place.name, address: place.address,
        lat: place.lat, lng: place.lng,
        category: place.category, naver_place_id: place.naver_place_id,
        naver_place_url: place.naver_place_url,
        folder_id: place.folder_id || null,
        status: place.status || "want_to_go",
        rating: place.rating || null, memo: place.memo || null,
        instagram_post_url: place.instagram_post_url || null,
      };
      const url = user
        ? `${API_BASE}/personal-places/?user_id=${user.user_id}`
        : `${API_BASE}/personal-places/`;
      const res = await axios.post(url, payload);
      setPersonalPlaces((prev) => {
        const exists = prev.find((p) => p.id === res.data.id);
        return exists ? prev : [...prev, res.data];
      });
    } catch (e) {
      console.error("맛집 저장 실패", e);
    }
  }, [user]);

  const deletePersonalPlace = useCallback(async (placeId) => {
    await axios.delete(`${API_BASE}/personal-places/${placeId}${user ? `?user_id=${user.user_id}` : ""}`);
    setPersonalPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }, [user]);

  const handlePlaceUpdated = useCallback((updatedPlace) => {
    setPersonalPlaces((prev) =>
      prev.map((p) => p.id === updatedPlace.id ? { ...p, ...updatedPlace } : p)
    );
  }, []);

  const filteredPersonalPlaces = activeFilter
    ? personalPlaces.filter((p) => p.status === activeFilter)
    : personalPlaces;

  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));
  const sidebarWidth = sidebarOpen && !isMobile ? 280 : 0;

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "white", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🗺️</div>
        <p style={{ color: "#E8593C", fontWeight: 700, fontSize: 18 }}>맛집 지도</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="app">

      {/* 모바일 탭 */}
      {isMobile && activeTab === "follow" && <FollowTab onViewMap={() => setActiveTab("map")} onFollowChange={loadFollowingList} />}
      {isMobile && activeTab === "search" && (
        <SearchTab onPlaceAdded={(place) => {
          setPersonalPlaces((prev) => {
            const exists = prev.find((p) => p.id === place.id);
            return exists ? prev : [...prev, place];
          });
        }} />
      )}
      {isMobile && activeTab === "notify" && <NotificationTab onUnreadChange={setUnreadCount} />}
      {isMobile && activeTab === "profile" && <ProfilePage />}
      {isMobile && activeTab === "feed" && <ActivityFeed onPlaceClick={handleActivityPlaceClick} />}

      {/* 사이드바 토글 (데스크탑) */}
      {!isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed", top: 16, left: sidebarOpen ? 290 : 16,
            zIndex: 30, width: 36, height: 36, borderRadius: "50%",
            background: "white", border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "left 0.3s ease",
          }}
        >
          {sidebarOpen ? "◀" : "☰"}
        </button>
      )}

      {/* 사이드바 (데스크탑) */}
      {!isMobile && (
        <div style={{ width: sidebarOpen ? 280 : 0, overflow: "hidden", transition: "width 0.3s ease", flexShrink: 0 }}>
          <Sidebar
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
        </div>
      )}

      {/* 지도 */}
      <MapView
        restaurants={visibleRestaurants}
        personalPlaces={showPersonal ? filteredPersonalPlaces : []}
        accounts={accounts}
        onMarkerClick={handleMarkerClick}
        onMapReady={(map) => { mapRef.current = map; }}
        followingPlaces={followingPlaces}
        onFollowingMarkerClick={handleFollowingMarkerClick}
      />

      {/* 통합 필터 — 상태 필터 + 팔로잉 레이어 선택 */}
      {(activeTab === "map" || !isMobile) && (
        <MapFilter
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sidebarWidth={sidebarWidth}
          followingList={isMobile ? followingList : []}
          selectedFollowingIds={selectedFollowingIds}
          onToggleFollowing={handleToggleFollowing}
          showPersonal={showPersonal}
          onTogglePersonal={() => setShowPersonal((v) => !v)}
        />
      )}

      {/* 새로고침 버튼 */}
      {(activeTab === "map" || !isMobile) && (
        <RefreshButton onRefresh={handleRefresh} />
      )}

      {/* 현재 위치 버튼 */}
      <LocationButton map={mapRef.current} />

      {/* 맛집 상세 패널 */}
      {selectedRestaurant && (
        <RestaurantPanel
          restaurant={selectedRestaurant}
          accounts={accounts}
          onClose={() => setSelectedRestaurant(null)}
          onHide={hideRestaurant}
          apiBase={API_BASE}
          sidebarWidth={sidebarWidth}
          onPlaceUpdated={handlePlaceUpdated}
          mapInstance={mapRef.current}
        />
      )}

      {/* 하단 탭바 (모바일) */}
      {isMobile && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
}
