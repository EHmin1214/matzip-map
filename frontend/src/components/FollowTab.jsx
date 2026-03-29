// src/components/FollowTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

// embedded=true : 사이드바 안에 들어갈 때 (position normal)
// embedded=false : 모바일 전체화면 (position fixed)
export default function FollowTab({ onViewMap, embedded = false }) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const loadFollowing = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowing(res.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchError("");
    setSearchResult(null);
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/users/${searchQuery.trim()}`);
      setSearchResult(res.data);
    } catch (e) {
      if (e.response?.status === 404) {
        setSearchError("존재하지 않는 닉네임이에요");
      } else {
        setSearchError("검색 중 오류가 발생했어요");
      }
    } finally {
      setSearching(false);
    }
  };

  const isFollowing = (targetId) => following.some((f) => f.id === targetId);

  const handleFollowToggle = async (targetId, targetNickname) => {
    if (!user) return;
    setLoadingFollow(true);
    try {
      if (isFollowing(targetId)) {
        await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        setFollowing((prev) => prev.filter((f) => f.id !== targetId));
        if (searchResult?.id === targetId) {
          setSearchResult((prev) => ({ ...prev, follower_count: prev.follower_count - 1 }));
        }
      } else {
        await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
        if (searchResult?.id === targetId) {
          setSearchResult((prev) => ({ ...prev, follower_count: prev.follower_count + 1 }));
        }
        loadFollowing();
      }
    } catch (e) {
      const msg = e.response?.data?.detail;
      alert(msg || "오류가 발생했어요");
    } finally {
      setLoadingFollow(false);
    }
  };

  const containerStyle = embedded
    ? {
        height: "100%", overflowY: "auto",
        background: "white",
      }
    : {
        position: "fixed", inset: 0,
        background: "#f8f8f8", overflowY: "auto",
        paddingBottom: 80, zIndex: 20,
      };

  return (
    <div style={containerStyle}>
      {/* 헤더 — 전체화면 모드에서만 표시 */}
      {!embedded && (
        <div style={{
          background: "white", padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>
            팔로우
          </h2>
        </div>
      )}

      <div style={{ padding: embedded ? "12px" : "20px 16px" }}>

        {/* 유저 검색 */}
        <div style={{ marginBottom: 20 }}>
          {!embedded && (
            <p style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 }}>
              유저 검색
            </p>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="닉네임으로 검색"
              style={{
                flex: 1, padding: embedded ? "8px 10px" : "11px 14px",
                border: "1.5px solid #eee", borderRadius: 10,
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#E8593C"}
              onBlur={(e) => e.target.style.borderColor = "#eee"}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: embedded ? "8px 12px" : "11px 18px",
                background: "#E8593C", color: "white",
                border: "none", borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {searching ? "..." : "검색"}
            </button>
          </div>

          {searchError && (
            <p style={{ color: "#E8593C", fontSize: 12, marginTop: 6 }}>{searchError}</p>
          )}

          {searchResult && (
            <UserCard
              userData={searchResult}
              isMe={searchResult.id === user?.user_id}
              isFollowing={isFollowing(searchResult.id)}
              onFollowToggle={handleFollowToggle}
              onViewMap={onViewMap}
              loadingFollow={loadingFollow}
              compact={embedded}
            />
          )}
        </div>

        {/* 팔로잉 목록 */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>
            팔로우 중{" "}
            {following.length > 0 && (
              <span style={{ color: "#E8593C" }}>{following.length}</span>
            )}
          </p>

          {following.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "24px 12px",
              color: "#bbb", fontSize: 13,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              아직 팔로우한 사람이 없어요
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {following.map((f) => (
                <UserCard
                  key={f.id}
                  userData={f}
                  isMe={false}
                  isFollowing={true}
                  onFollowToggle={handleFollowToggle}
                  onViewMap={onViewMap}
                  loadingFollow={loadingFollow}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserCard({ userData, isMe, isFollowing, onFollowToggle, onViewMap, loadingFollow, compact = false }) {
  return (
    <div style={{
      background: compact ? "#f8f8f8" : "white",
      borderRadius: 12,
      padding: compact ? "10px 12px" : "16px",
      marginTop: compact ? 0 : 10,
      boxShadow: compact ? "none" : "0 1px 8px rgba(0,0,0,0.06)",
      border: compact ? "1px solid #f0f0f0" : "none",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {/* 아바타 */}
      <div style={{
        width: compact ? 36 : 44, height: compact ? 36 : 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #E8593C, #ff8a65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: compact ? 14 : 18, color: "white", fontWeight: 700, flexShrink: 0,
      }}>
        {userData.nickname?.[0]?.toUpperCase() || "?"}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: compact ? 13 : 15, color: "#222" }}>
            {userData.nickname}
          </span>
          {isMe && (
            <span style={{
              fontSize: 10, background: "#fff0ed", color: "#E8593C",
              padding: "1px 5px", borderRadius: 5, fontWeight: 600,
            }}>나</span>
          )}
        </div>
        {!compact && userData.follower_count !== undefined && (
          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>
              팔로워 <b style={{ color: "#666" }}>{userData.follower_count}</b>
            </span>
            <span style={{ fontSize: 11, color: "#aaa" }}>
              맛집 <b style={{ color: "#666" }}>{userData.place_count}</b>
            </span>
          </div>
        )}
        {userData.instagram_url && (
          <a
            href={userData.instagram_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11, color: "#E8593C", textDecoration: "none", display: "block", marginTop: 2 }}
          >
            📷 Instagram
          </a>
        )}
      </div>

      {/* 버튼들 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {isFollowing && (
          <button
            onClick={() => onViewMap(userData)}
            style={{
              padding: "5px 10px", background: "#f0f0f0",
              border: "none", borderRadius: 7,
              fontSize: 11, fontWeight: 600, color: "#555", cursor: "pointer",
            }}
          >
            🗺️ 지도
          </button>
        )}
        {!isMe && (
          <button
            onClick={() => onFollowToggle(userData.id, userData.nickname)}
            disabled={loadingFollow}
            style={{
              padding: "5px 10px",
              background: isFollowing ? "white" : "#E8593C",
              border: isFollowing ? "1.5px solid #ddd" : "none",
              borderRadius: 7, fontSize: 11, fontWeight: 700,
              color: isFollowing ? "#888" : "white",
              cursor: loadingFollow ? "not-allowed" : "pointer",
            }}
          >
            {isFollowing ? "팔로잉" : "팔로우"}
          </button>
        )}
      </div>
    </div>
  );
}
