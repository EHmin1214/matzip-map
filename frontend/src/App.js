// src/App.js
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useUser, API_BASE } from "./context/UserContext";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import RestaurantPanel from "./components/RestaurantPanel";
import AuthScreen from "./components/AuthScreen";
import BottomTabBar from "./components/BottomTabBar";
import ProfilePage from "./components/ProfilePage";
import FeedTab from "./components/FeedTab";
import NotificationTab from "./components/NotificationTab";
import SearchTab from "./components/SearchTab";
import LocationButton from "./components/LocationButton";
import MapFilter from "./components/MapFilter";
import RefreshButton from "./components/RefreshButton";
import PublicProfile from "./components/PublicProfile";
import UserProfileView from "./components/UserProfileView";
import PublicListPage from "./components/PublicListPage";
import OnboardingGuide from "./components/OnboardingGuide";
import LoginPrompt from "./components/LoginPrompt";
import Toast from "./components/Toast";
import "./App.css";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
export { ACCOUNT_COLORS, getAccountColor, FOLLOWING_COLORS } from "./constants";

// ── 레이아웃 상수 ─────────────────────────────────────────────
const SIDEBAR_W = 300;   // 일차 사이드탭 너비
const PANEL_W   = 325;   // 이차 사이드탭 너비 (데스크탑)

export default function App() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState("map");
  const [unreadCount, setUnreadCount] = useState(0);
  const mapRef = useRef(null);
  const pendingDeepLink = useRef(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
  const [folders, setFolders] = useState([]);
  const [viewingUserNickname, setViewingUserNickname] = useState(null);
  const [toast, setToast] = useState(null);

  const isMobile = window.innerWidth <= 768;
  const showMap = activeTab === "map";

  // ── 데이터 로드 ────────────────────────────────────────────
  const loadPersonalPlaces = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/personal-places/?user_id=${user.user_id}`)
      .then((res) => {
        setPersonalPlaces(res.data);
        // 첫 사용자 온보딩: 장소 0개 + 이전에 안 봤으면
        if (res.data.length === 0 && !localStorage.getItem("matzip_onboarded")) {
          setShowOnboarding(true);
        }
      }).catch(() => {});
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

  const loadFolders = useCallback(() => {
    if (!user) return Promise.resolve();
    return axios.get(`${API_BASE}/folders/?user_id=${user.user_id}`)
      .then((res) => setFolders(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPersonalPlaces(); loadFollowingList(); loadUnread(); loadFolders();
      // 로그인 성공 시 모달 닫기
      setShowLoginPrompt(false);
    }
  }, [user, loadPersonalPlaces, loadFollowingList, loadUnread, loadFolders]);

  // ── 딥링크 처리 (?place=ID) ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get("place");
    if (!placeId) return;
    window.history.replaceState({}, "", window.location.pathname);
    axios.get(`${API_BASE}/personal-places/${placeId}/detail`)
      .then((res) => {
        const found = res.data;
        setSelectedRestaurant({ ...found, sources: [], isPersonal: true });
        setActiveTab("map");
        // 지도가 준비되면 이동, 아직이면 pendingDeepLink에 저장
        if (mapRef.current && window.naver) {
          mapRef.current.setCenter(new window.naver.maps.LatLng(found.lat, found.lng));
          mapRef.current.setZoom(16);
        } else {
          pendingDeepLink.current = found;
        }
      }).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => { loadUnread(); loadPersonalPlaces(); }, 30000);
    return () => clearInterval(interval);
  }, [user, loadUnread, loadPersonalPlaces]);

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

  const handleToggleFollowing = useCallback((targetUserId) => {
    setSelectedFollowingIds((prev) => {
      if (prev.includes(targetUserId)) return prev.filter((id) => id !== targetUserId);
      return [...prev, targetUserId];
    });
    // 장소 데이터 없으면 비동기로 로드
    if (!followingPlacesMap[targetUserId]) {
      axios.get(`${API_BASE}/personal-places/?user_id=${targetUserId}`)
        .then((res) => setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: res.data.filter((p) => p.is_public !== false) })))
        .catch(() => setFollowingPlacesMap((m) => ({ ...m, [targetUserId]: [] })));
    }
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

  const handleViewUserProfile = useCallback((nickname) => {
    setViewingUserNickname(nickname);
  }, []);

  const handleActivityPlaceClick = useCallback((activity) => {
    // Own places pass _original with full data; following items have activity shape
    if (activity._original) {
      setSelectedRestaurant({ ...activity._original, sources: [], isPersonal: true });
    } else {
      setSelectedRestaurant({
        id: activity.place_id, name: activity.place_name,
        address: activity.place_address,
        lat: activity.place_lat, lng: activity.place_lng,
        category: activity.place_category,
        status: activity.place_status,
        rating: activity.rating,
        memo: activity.memo,
        photo_url: activity.photo_url,
        photo_urls: activity.photo_urls || [],
        instagram_post_url: activity.instagram_post_url,
        like_count: activity.like_count,
        comment_count: activity.comment_count,
        user_id: activity.owner_id,
        owner_nickname: activity.owner_nickname,
        isPersonal: true, sources: [],
      });
    }
    setActiveTab("map");
    const lat = activity.lat || activity.place_lat;
    const lng = activity.lng || activity.place_lng;
    if (mapRef.current && window.naver && lat && lng) {
      mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
      mapRef.current.setZoom(16);
    }
  }, []);

  const hideRestaurant = useCallback((restaurantId, isPersonal = false) => {
    if (isPersonal) {
      const place = personalPlaces.find((p) => `personal_${p.id}` === restaurantId || p.id === restaurantId);
      if (place) axios.delete(`${API_BASE}/personal-places/${place.id}${user ? `?user_id=${user.user_id}` : ""}`)
        .then(() => setPersonalPlaces((prev) => prev.filter((p) => p.id !== place.id)));
    } else {
      setHiddenIds((prev) => new Set([...prev, restaurantId]));
    }
    setSelectedRestaurant(null);
  }, [personalPlaces, user]);

  const addPersonalPlace = useCallback(async (place) => {
    try {
      const payload = { ...place, folder_id: place.folder_id || null, status: place.status || "want_to_go", rating: place.rating || null, memo: place.memo || null, photo_url: place.photo_url || null, photo_urls: place.photo_urls || null, instagram_post_url: place.instagram_post_url || null };
      const url = user ? `${API_BASE}/personal-places/?user_id=${user.user_id}` : `${API_BASE}/personal-places/`;
      const res = await axios.post(url, payload);
      setPersonalPlaces((prev) => { const e = prev.find((p) => p.id === res.data.id); return e ? prev : [...prev, res.data]; });
    } catch (e) { console.error("저장 실패", e); }
  }, [user]);

  const deletePersonalPlace = useCallback(async (placeId) => {
    await axios.delete(`${API_BASE}/personal-places/${placeId}${user ? `?user_id=${user.user_id}` : ""}`);
    setPersonalPlaces((prev) => prev.filter((p) => p.id !== placeId));
    setToast("삭제됐어요");
  }, [user]);

  const handlePlaceUpdated = useCallback((updated) => {
    setPersonalPlaces((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }, []);

  const addPlace = (p) => { setPersonalPlaces((prev) => { const e = prev.find((x) => x.id === p.id); return e ? prev : [...prev, p]; }); setToast("저장됐어요"); };

  const filteredPersonalPlaces = activeFilter ? personalPlaces.filter((p) => p.status === activeFilter) : personalPlaces;
  const visibleRestaurants = restaurants.filter((r) => !hiddenIds.has(r.id));

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#faf9f6", flexDirection: "column", gap: 10,
    }}>
      <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 26, color: "#655d54", margin: 0, letterSpacing: "-0.02em" }}>
        나의 공간
      </h1>
      <p style={{ fontFamily: FL, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: "#c7c4bf", margin: 0 }}>
        The Curated Archive
      </p>
    </div>
  );

  // 공개 라우트 — 비회원 접근 가능
  const profileMatch = window.location.pathname.match(/^\/@(.+)$/);
  if (profileMatch) {
    return <PublicProfile nickname={decodeURIComponent(profileMatch[1])} />;
  }
  const listMatch = window.location.pathname.match(/^\/list\/(\d+)$/);
  if (listMatch) {
    return <PublicListPage listId={parseInt(listMatch[1])} />;
  }

  // 로그인 필요한 탭 전환 시 체크
  const requireAuth = (tab) => {
    if (!user && tab !== "map") {
      setShowLoginPrompt(true);
      return true;
    }
    return false;
  };

  const handleTabChange = (tab) => {
    if (requireAuth(tab)) return;
    setActiveTab(tab);
  };

  const renderPanel = (tab) => {
    if (tab === "search")        return <SearchTab onPlaceAdded={addPlace} personalPlaces={personalPlaces} onViewUserProfile={handleViewUserProfile} />;
    if (tab === "feed")          return <FeedTab personalPlaces={personalPlaces} onPlaceClick={handleActivityPlaceClick} onDataChange={loadPersonalPlaces} onNavigate={setActiveTab} />;
    if (tab === "notifications") return <NotificationTab onUnreadChange={setUnreadCount} />;
    if (tab === "profile")       return <ProfilePage personalPlaces={personalPlaces} onViewMap={() => setActiveTab("map")} onViewUserProfile={handleViewUserProfile} onPlaceClick={(p) => {
      setSelectedRestaurant({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, status: p.status, user_id: p.user_id, isPersonal: true, sources: [] });
      setActiveTab("map");
      if (mapRef.current && window.naver) { mapRef.current.setCenter(new window.naver.maps.LatLng(p.lat, p.lng)); mapRef.current.setZoom(16); }
    }} />;
    return null;
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("matzip_onboarded", "1");
  };

  return (
    <div className="app">
      {showOnboarding && user && (
        <OnboardingGuide
          onStart={() => { dismissOnboarding(); setActiveTab("search"); }}
          onDismiss={dismissOnboarding}
        />
      )}

      {showLoginPrompt && !user && (
        <LoginPrompt onClose={() => { setShowLoginPrompt(false); setActiveTab("map"); }} />
      )}

      {/* ─── 모바일 ──────────────────────────────────────────── */}
      {isMobile && (
        <>
          {/* 지도 항상 렌더 (뒤) */}
          <div style={{ position: "fixed", inset: 0, zIndex: 1 }}>
            <MapView
              restaurants={visibleRestaurants}
              personalPlaces={showPersonal ? filteredPersonalPlaces : []}
              accounts={accounts}
              onMarkerClick={handleMarkerClick}
              onMapReady={(map) => {
                mapRef.current = map;
                if (pendingDeepLink.current && window.naver) {
                  const p = pendingDeepLink.current;
                  pendingDeepLink.current = null;
                  map.setCenter(new window.naver.maps.LatLng(p.lat, p.lng));
                  map.setZoom(16);
                }
              }}
              followingPlaces={followingPlaces}
              onFollowingMarkerClick={handleFollowingMarkerClick}
              folders={folders}
            />
          </div>

          {/* 모바일 팔로잉 가로 스크롤 — 지도 상단 */}
          {showMap && followingList.length > 0 && (
            <div style={{
              position: "fixed", top: 10, left: 0, right: 0, zIndex: 26,
              pointerEvents: "none",
            }}>
              <div style={{
                display: "flex", gap: 8, padding: "0 14px",
                overflowX: "auto", overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                pointerEvents: "auto",
                msOverflowStyle: "none", scrollbarWidth: "none",
              }}>
                {followingList.map((f, idx) => {
                  const isSelected = selectedFollowingIds.includes(f.id);
                  const color = FOLLOWING_COLORS[idx % FOLLOWING_COLORS.length];
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleToggleFollowing(f.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px 6px 6px",
                        background: isSelected ? color : "rgba(250,249,246,0.92)",
                        backdropFilter: "blur(8px)",
                        border: isSelected ? "none" : "1px solid rgba(101,93,84,0.12)",
                        borderRadius: 999, cursor: "pointer",
                        flexShrink: 0, transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(47,52,48,0.1)",
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: isSelected ? "rgba(255,255,255,0.3)" : color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: FH, fontStyle: "italic",
                        fontSize: 11, color: isSelected ? "white" : "#fff", fontWeight: 700,
                      }}>
                        {f.nickname?.[0]?.toUpperCase()}
                      </div>
                      <span style={{
                        fontFamily: FL, fontSize: 11, fontWeight: 600,
                        color: isSelected ? "white" : "#2f3430",
                        whiteSpace: "nowrap",
                      }}>
                        {f.nickname}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 지도 오버레이 컨트롤 — 우측 하단 세로 스택 */}
          {showMap && (
            <div style={{
              position: "fixed",
              right: 14, bottom: 80,
              zIndex: 26,
              display: "flex", flexDirection: "column",
              alignItems: "flex-end", gap: 8,
              pointerEvents: "none",
            }}>
              <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <RefreshButton onRefresh={handleRefresh} />
                <MapFilter
                  activeFilter={activeFilter} onFilterChange={setActiveFilter}
                  followingList={[]} selectedFollowingIds={selectedFollowingIds}
                  onToggleFollowing={handleToggleFollowing}
                  showPersonal={showPersonal} onTogglePersonal={() => setShowPersonal((v) => !v)}
                />
                <LocationButton map={mapRef.current} />
              </div>
            </div>
          )}

          {/* 비지도 탭 콘텐츠 */}
          {!showMap && (
            <div style={{ position: "fixed", inset: 0, zIndex: 20, paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))", overflowY: "auto", background: "#faf9f6" }}>
              {renderPanel(activeTab)}
            </div>
          )}

          {/* 상세 패널 */}
          {selectedRestaurant && showMap && (
            <RestaurantPanel
              restaurant={selectedRestaurant}
              onClose={() => setSelectedRestaurant(null)} onHide={hideRestaurant}
              sidebarWidth={0}
              onPlaceUpdated={handlePlaceUpdated} mapInstance={mapRef.current}
              onDataChange={loadPersonalPlaces}
            />
          )}

          <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} userNickname={user?.nickname} />
        </>
      )}

      {/* ─── 데스크탑 ─────────────────────────────────────────── */}
      {!isMobile && (
        <>
          {/* 사이드바 (항상 표시) */}
          <Sidebar
            activeTab={activeTab} onTabChange={handleTabChange}
            personalPlaces={personalPlaces}
            onDeletePersonalPlace={deletePersonalPlace}
            unreadCount={unreadCount}
            selectedFollowingIds={selectedFollowingIds}
            onToggleFollowing={handleToggleFollowing}
            followingList={followingList}
            onFollowChange={loadFollowingList}
            sidebarWidth={SIDEBAR_W}
            onViewUserProfile={handleViewUserProfile}
            onPlaceSelect={(place) => {
              setSelectedRestaurant({ ...place, sources: [], isPersonal: true });
              setActiveTab("map");
              if (mapRef.current && window.naver) {
                mapRef.current.panTo(new window.naver.maps.LatLng(place.lat, place.lng), { duration: 280 });
                // 디테일 패널(360px) 보정
                setTimeout(() => mapRef.current?.panBy(new window.naver.maps.Point(-180, 0)), 300);
              }
            }}
          />

          {/* 지도 — 항상 전체 화면 뒤에서 렌더 */}
          <div style={{
            position: "fixed",
            left: SIDEBAR_W, right: 0, top: 0, bottom: 0,
            zIndex: 1,
          }}>
            <MapView
              restaurants={visibleRestaurants}
              personalPlaces={showPersonal ? filteredPersonalPlaces : []}
              accounts={accounts}
              onMarkerClick={(id, isPersonal) => {
                handleMarkerClick(id, isPersonal);
                // 마커 클릭 시 지도 탭으로 이동
                setActiveTab("map");
              }}
              onMapReady={(map) => {
                mapRef.current = map;
                if (pendingDeepLink.current && window.naver) {
                  const p = pendingDeepLink.current;
                  pendingDeepLink.current = null;
                  map.setCenter(new window.naver.maps.LatLng(p.lat, p.lng));
                  map.setZoom(16);
                }
              }}
              followingPlaces={followingPlaces}
              onFollowingMarkerClick={(place) => {
                handleFollowingMarkerClick(place);
                setActiveTab("map");
              }}
            />

            {/* 지도 위 컨트롤 — 우측 하단 세로 스택 */}
            <div style={{
              position: "absolute",
              right: 14, bottom: 14,
              display: "flex", flexDirection: "column",
              alignItems: "flex-end", gap: 8,
              zIndex: 26,
            }}>
              <RefreshButton onRefresh={handleRefresh} />
              <MapFilter
                activeFilter={activeFilter} onFilterChange={setActiveFilter}
                followingList={[]} selectedFollowingIds={selectedFollowingIds}
                onToggleFollowing={handleToggleFollowing}
                showPersonal={showPersonal} onTogglePersonal={() => setShowPersonal((v) => !v)}
              />
              <LocationButton map={mapRef.current} />
            </div>
          </div>

          {/* 슬라이드 패널 — 비지도 탭일 때 */}
          {!showMap && (
            <div style={{
              position: "fixed",
              left: SIDEBAR_W, top: 0,
              width: PANEL_W, height: "100vh",
              background: "#faf9f6",
              zIndex: 30,
              boxShadow: "4px 0 32px rgba(47,52,48,0.10)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              animation: "slideInPanel 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}>
              {renderPanel(activeTab)}
            </div>
          )}

          {/* 상세 패널 — 지도 탭에서 마커 클릭 시 */}
          {selectedRestaurant && showMap && (
            <RestaurantPanel
              restaurant={selectedRestaurant}
              onClose={() => setSelectedRestaurant(null)} onHide={hideRestaurant}
              sidebarWidth={SIDEBAR_W}
              onPlaceUpdated={handlePlaceUpdated} mapInstance={mapRef.current}
              onDataChange={loadPersonalPlaces}
            />
          )}
        </>
      )}

      {/* 다른 사용자 프로필 — 데스크탑: 사이드 패널 / 모바일: 전체 화면 */}
      {viewingUserNickname && (
        isMobile ? (
          <UserProfileView
            nickname={viewingUserNickname}
            onClose={() => setViewingUserNickname(null)}
          />
        ) : (
          <div style={{
            position: "fixed",
            left: SIDEBAR_W, top: 0,
            width: PANEL_W, height: "100vh",
            background: "#faf9f6",
            zIndex: 35,
            boxShadow: "4px 0 32px rgba(47,52,48,0.10)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            animation: "slideInPanel 0.22s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <UserProfileView
              nickname={viewingUserNickname}
              onClose={() => setViewingUserNickname(null)}
              embedded
            />
          </div>
        )
      )}

      <Toast message={toast} onClose={() => setToast(null)} />

      <style>{`
        @keyframes slideInPanel {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
