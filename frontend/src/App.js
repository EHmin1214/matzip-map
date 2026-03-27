// src/App.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import RestaurantPanel from "./components/RestaurantPanel";
import "./App.css";

const API_BASE = "https://restaurantmap-production.up.railway.app";

// 블로거별 색상 팔레트
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

  // 숨긴 맛집 ID 목록 (지도에서 제거, DB는 유지)
  const [hiddenIds, setHiddenIds] = useState(new Set());

  // 광고 분석 검색으로 추가된 임시 마커
  const [searchMarkers, setSearchMarkers] = useState([]);
  // { id: "search_xxx", name, lat, lng, category, address, isSearchResult: true }

  // 계정 목록 로드
  useEffect(() => {
    axios.get(`${API_BASE}/accounts/`).then((res) => setAccounts(res.data));
  }, []);

  // 선택된 계정 바뀔 때마다 맛집 다시 로드
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

  // 마커 클릭 → 상세 패널
  const handleMarkerClick = useCallback(async (restaurantId, isSearchResult = false) => {
    if (isSearchResult) {
      // 검색 결과 마커는 로컬 데이터 사용
      const marker = searchMarkers.find((m) => m.id === restaurantId);
      if (marker) setSelectedRestaurant({ ...marker, sources: [] });
      return;
    }
    const res = await axios.get(`${API_BASE}/restaurants/${restaurantId}`);
    setSelectedRestaurant(res.data);
  }, [searchMarkers]);

  // 가게 숨기기 (지도에서 제거)
  const hideRestaurant = useCallback((restaurantId, isSearchResult = false) => {
    if (isSearchResult) {
      setSearchMarkers((prev) => prev.filter((m) => m.id !== restaurantId));
    } else {
      setHiddenIds((prev) => new Set([...prev, restaurantId]));
    }
    setSelectedRestaurant(null);
  }, []);

  // 광고 분석 검색 결과로 마커 추가
  const addSearchMarker = useCallback((place) => {
    setSearchMarkers((prev) => {
      const exists = prev.find((m) => m.name === place.name && m.lat === place.lat);
      if (exists) return prev;
      return [...prev, { ...place, id: `search_${Date.now()}`, isSearchResult: true }];
    });
  }, []);

  // 숨긴 가게 제외한 실제 표시 목록
  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));

  return (
    <div className="app">
      <Sidebar
        accounts={accounts}
        setAccounts={setAccounts}
        selectedAccountIds={selectedAccountIds}
        onToggleAccount={toggleAccount}
        onAccountAdded={(acc) => setAccounts((prev) => [...prev, acc])}
        apiBase={API_BASE}
        onAddSearchMarker={addSearchMarker}
      />
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
        />
      )}
    </div>
  );
}
