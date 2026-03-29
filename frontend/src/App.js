// src/App.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "./context/UserContext";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import RestaurantPanel from "./components/RestaurantPanel";
import AuthScreen from "./components/AuthScreen";
import BottomTabBar from "./components/BottomTabBar";
import FollowTab from "./components/FollowTab";
import ProfilePage from "./components/ProfilePage";
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

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [personalPlaces, setPersonalPlaces] = useState([]);
  const [showPersonal, setShowPersonal] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    axios.get(`${API_BASE}/accounts/`).then((res) => setAccounts(res.data));
  }, []);

  useEffect(() => {
    if (user) {
      axios.get(`${API_BASE}/personal-places/?user_id=${user.user_id}`)
        .then((res) => setPersonalPlaces(res.data))
        .catch(() => {
          axios.get(`${API_BASE}/personal-places/`)
            .then((res) => setPersonalPlaces(res.data));
        });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      axios.get(`${API_BASE}/notifications/?user_id=${user.user_id}`)
        .then((res) => {
          const unread = res.data.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const params = selectedAccountIds.map((id) => `account_ids=${id}`).join("&");
    const url = `${API_BASE}/restaurants/${params ? "?" + params : ""}`;
    axios.get(url).then((res) => setRestaurants(res.data));
  }, [selectedAccountIds]);

  const toggleAccount = (id) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleMarkerClick = useCallback(async (restaurantId, isPersonal = false) => {
    if (isPersonal) {
      const place = personalPlaces.find((p) => `personal_${p.id}` === restaurantId);
      if (place) setSelectedRestaurant({ ...place, sources: [], isPersonal: true });
      if (isMobile) setSidebarOpen(false);
      return;
    }
    const res = await axios.get(`${API_BASE}/restaurants/${restaurantId}`);
    setSelectedRestaurant(res.data);
    if (isMobile) setSidebarOpen(false);
  }, [personalPlaces, isMobile]);

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
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        naver_place_id: place.naver_place_id,
        naver_place_url: place.naver_place_url,
        folder_id: place.folder_id || null,
        status: place.status || "want_to_go",
        rating: place.rating || null,
        memo: place.memo || null,
        instagram_post_url: place.instagram_post_url || null,
      };
      const url = user
        ? `${API_BASE}/personal-places/?user_id=${user.user_id}`
        : `${API_BASE}/personal-places/`;
      const res = await axios.post(url, payload);
      setPersonalPlaces((prev) => {
        const exists = prev.find((p) => p.id === res.data.id);
        if (exists) return prev;
        return [...prev, res.data];
      });
      if (isMobile) setSidebarOpen(false);
    } catch (e) {
      console.error("맛집 저장 실패", e);
    }
  }, [user, isMobile]);

  const deletePersonalPlace = useCallback(async (placeId) => {
    await axios.delete(`${API_BASE}/personal-places/${placeId}${user ? `?user_id=${user.user_id}` : ""}`);
    setPersonalPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }, [user]);

  const handleViewMap = useCallback(() => {
    setActiveTab("map");
  }, []);

  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));
  const sidebarWidth = sidebarOpen ? 280 : 0;

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "white", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🗺️</div>
        <p style={{ color: "#E8593C", fontWeight: 700 }}>맛집 지도</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="app">

      {/* 모바일 탭 — 팔로우 */}
      {isMobile && activeTab === "follow" && (
        <FollowTab onViewMap={handleViewMap} />
      )}

      {/* 모바일 탭 — 프로필 */}
      {isMobile && activeTab === "profile" && (
        <ProfilePage />
      )}

      {/* 사이드바 토글 버튼 (데스크탑) */}
      {!isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed", top: 16,
            left: sidebarOpen ? 290 : 16,
            zIndex: 30, width: 36, height: 36,
            borderRadius: "50%", background: "white",
            border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
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
        <div style={{
          width: sidebarOpen ? 280 : 0,
          overflow: "hidden",
          transition: "width 0.3s ease",
          flexShrink: 0,
        }}>
          <Sidebar
            accounts={accounts}
            setAccounts={setAccounts}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={toggleAccount}
            onAccountAdded={(acc) => setAccounts((prev) => [...prev, acc])}
            apiBase={API_BASE}
            onAddPersonalPlace={addPersonalPlace}
            personalPlaces={personalPlaces}
            showPersonal={showPersonal}
            setShowPersonal={setShowPersonal}
            onDeletePersonalPlace={deletePersonalPlace}
          />
        </div>
      )}

      {/* 지도 */}
      <MapView
        restaurants={visibleRestaurants}
        personalPlaces={showPersonal ? personalPlaces : []}
        accounts={accounts}
        onMarkerClick={handleMarkerClick}
      />

      {/* 맛집 상세 패널 */}
      {selectedRestaurant && (
        <RestaurantPanel
          restaurant={selectedRestaurant}
          accounts={accounts}
          onClose={() => setSelectedRestaurant(null)}
          onHide={hideRestaurant}
          apiBase={API_BASE}
          sidebarWidth={sidebarWidth}
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
