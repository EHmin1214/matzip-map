// src/components/FollowTab.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

export default function FollowTab({ onViewMap }) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null); // 검색된 유저
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState([]); // 내가 팔로우하는 사람 목록
  const [loadingFollow, setLoadingFollow] = useState(false);

  // 팔로잉 목록 로드
  const loadFollowing = useCallback(() => {
    if (!user) return;
    axios.get(`${API_BASE}/follows/${user.user_id}/following`)
      .then((res) => setFollowing(res.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  // 유저 검색
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

  // 팔로우 여부 확인
  const isFollowing = (targetId) => following.some((f) => f.id === targetId);

  // 팔로우 토글
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
        setFollowing((prev) => [...prev, { id: targetId, nickname: targetNickname }]);
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

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#f8f8f8",
      overflowY: "auto", paddingBottom: 80,
      zIndex: 20,
    }}>
      {/* 헤더 */}
      <div style={{
        background: "white", padding: "16px 20px",
        borderBottom: "1px solid #f0f0f0",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#222" }}>
          팔로우
        </h2>
      </div>

      <div style={{ padding: "20px 16px" }}>

        {/* 검색 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 }}>
            유저 검색
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="닉네임 입력"
              style={{
                flex: 1, padding: "11px 14px",
                border: "1.5px solid #eee", borderRadius: 10,
                fontSize: 14, outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#E8593C"}
              onBlur={(e) => e.target.style.borderColor = "#eee"}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: "11px 18px", background: "#E8593C",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              {searching ? "..." : "검색"}
            </button>
          </div>

          {/* 검색 에러 */}
          {searchError && (
            <p style={{ color: "#E8593C", fontSize: 13, marginTop: 8 }}>{searchError}</p>
          )}

          {/* 검색 결과 */}
          {searchResult && (
            <UserCard
              userData={searchResult}
              isMe={searchResult.id === user?.user_id}
              isFollowing={isFollowing(searchResult.id)}
              onFollowToggle={handleFollowToggle}
              onViewMap={onViewMap}
              loadingFollow={loadingFollow}
            />
          )}
        </div>

        {/* 팔로잉 목록 */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 }}>
            팔로우 중 {following.length > 0 && <span style={{ color: "#E8593C" }}>{following.length}</span>}
          </p>

          {following.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "#bbb", fontSize: 14,
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
              아직 팔로우한 사람이 없어요
              <br />위에서 닉네임으로 검색해보세요!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

// ── 유저 카드 컴포넌트 ──────────────────────────────────────

function UserCard({ userData, isMe, isFollowing, onFollowToggle, onViewMap, loadingFollow, compact = false }) {
  return (
    <div style={{
      background: "white", borderRadius: 14,
      padding: compact ? "14px 16px" : "18px 16px",
      marginTop: compact ? 0 : 12,
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {/* 아바타 */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "linear-gradient(135deg, #E8593C, #ff8a65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, color: "white", fontWeight: 700, flexShrink: 0,
      }}>
        {userData.nickname?.[0]?.toUpperCase() || "?"}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>
            {userData.nickname}
          </span>
          {isMe && (
            <span style={{
              fontSize: 10, background: "#fff0ed", color: "#E8593C",
              padding: "2px 6px", borderRadius: 6, fontWeight: 600,
            }}>나</span>
          )}
        </div>

        {/* 통계 */}
        {!compact && (
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            {userData.follower_count !== undefined && (
              <span style={{ fontSize: 12, color: "#888" }}>
                팔로워 <b style={{ color: "#555" }}>{userData.follower_count}</b>
              </span>
            )}
            {userData.place_count !== undefined && (
              <span style={{ fontSize: 12, color: "#888" }}>
                맛집 <b style={{ color: "#555" }}>{userData.place_count}</b>
              </span>
            )}
          </div>
        )}

        {/* 인스타 링크 */}
        {userData.instagram_url && (
          <a
            href={userData.instagram_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: "#E8593C", textDecoration: "none", marginTop: 2, display: "block" }}
          >
            📷 Instagram
          </a>
        )}
      </div>

      {/* 버튼들 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {/* 지도 보기 */}
        {isFollowing && (
          <button
            onClick={() => onViewMap(userData)}
            style={{
              padding: "6px 12px", background: "#f5f5f5",
              border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer",
            }}
          >
            🗺️ 지도
          </button>
        )}

        {/* 팔로우 버튼 */}
        {!isMe && (
          <button
            onClick={() => onFollowToggle(userData.id, userData.nickname)}
            disabled={loadingFollow}
            style={{
              padding: "6px 12px",
              background: isFollowing ? "white" : "#E8593C",
              border: isFollowing ? "1.5px solid #ddd" : "none",
              borderRadius: 8, fontSize: 12, fontWeight: 700,
              color: isFollowing ? "#888" : "white",
              cursor: loadingFollow ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {isFollowing ? "팔로잉" : "팔로우"}
          </button>
        )}
      </div>
    </div>
  );
}
