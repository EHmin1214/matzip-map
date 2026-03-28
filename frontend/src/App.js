// src/App.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import RestaurantPanel from "./components/RestaurantPanel";
import "./App.css";

const API_BASE = "https://restaurantmap-production.up.railway.app";

export const ACCOUNT_COLORS = [
  "#E8593C", "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#0F6E56", "#993C1D",
];

export function getAccountColor(accountId, accounts) {
  const index = accounts.findIndex((a) => a.id === accountId);
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] || "#888";
}

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [searchMarkers, setSearchMarkers] = useState([]);

  // 사이드바 열림/닫힘 상태 — 모바일에선 기본 닫힘
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    axios.get(`${API_BASE}/accounts/`).then((res) => setAccounts(res.data));
  }, []);

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

  const handleMarkerClick = useCallback(async (restaurantId, isSearchResult = false) => {
    if (isSearchResult) {
      const marker = searchMarkers.find((m) => m.id === restaurantId);
      if (marker) setSelectedRestaurant({ ...marker, sources: [] });
      return;
    }
    const res = await axios.get(`${API_BASE}/restaurants/${restaurantId}`);
    setSelectedRestaurant(res.data);
    // 모바일에서 마커 클릭 시 사이드바 자동 닫기
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, [searchMarkers]);

  const hideRestaurant = useCallback((restaurantId, isSearchResult = false) => {
    if (isSearchResult) {
      setSearchMarkers((prev) => prev.filter((m) => m.id !== restaurantId));
    } else {
      setHiddenIds((prev) => new Set([...prev, restaurantId]));
    }
    setSelectedRestaurant(null);
  }, []);

  const addSearchMarker = useCallback((place) => {
    setSearchMarkers((prev) => {
      const exists = prev.find((m) => m.name === place.name && m.lat === place.lat);
      if (exists) return prev;
      return [...prev, { ...place, id: `search_${Date.now()}`, isSearchResult: true }];
    });
    // 모바일에서 검색 후 사이드바 자동 닫기
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, []);

  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));
  const sidebarWidth = sidebarOpen ? 280 : 0;

  return (
    <div className="app">
      {/* 사이드바 토글 버튼 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "fixed",
          top: 16,
          left: sidebarOpen ? 290 : 16,
          zIndex: 30,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "white",
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "left 0.3s ease",
        }}
      >
        {sidebarOpen ? "◀" : "☰"}
      </button>

      {/* 사이드바 */}
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
          onAddSearchMarker={addSearchMarker}
        />
      </div>

      <MapView
        restaurants={visibleRestaurants}
        searchMarkers={searchMarkers}
        accounts={accounts}
        onMarkerClick={handleMarkerClick}
      />

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
    </div>
  );
}
