// src/components/FriendsTab.jsx
// 모바일 전용 — 팔로잉/팔로워 목록 + 프로필 진입
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary: "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg: "#faf9f6",
  surfaceLow: "#f4f4f0",
  container: "#edeeea",
  onSurface: "#2f3430",
  onSurfaceVariant: "#5c605c",
  outlineVariant: "#8a8e8a",
  error: "#9e422c",
};

export default function FriendsTab({ onViewUserProfile }) {
  const { user } = useUser();
  const [subTab, setSubTab] = useState("following"); // "following" | "followers"
  const [followingList, setFollowingList] = useState([]);
  const [followerList, setFollowerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const fetchAll = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/follows/${user.user_id}/following`),
      axios.get(`${API_BASE}/follows/${user.user_id}/followers`),
      axios.get(`${API_BASE}/follows/requests/${user.user_id}`),
    ]).then(([fg, fr, rq]) => {
      setFollowingList(fg.data);
      setFollowerList(fr.data);
      setRequests(rq.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUnfollow = async (targetId) => {
    setActionLoading(targetId);
    try {
      await axios.delete(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      setFollowingList((prev) => prev.filter((u) => (u.id || u.user_id) !== targetId));
    } catch { alert("팔로우 해제 실패"); }
    finally { setActionLoading(null); }
  };

  const handleFollowBack = async (targetId) => {
    setActionLoading(targetId);
    try {
      await axios.post(`${API_BASE}/follows/${targetId}?follower_id=${user.user_id}`);
      const res = await axios.get(`${API_BASE}/follows/${user.user_id}/following`);
      setFollowingList(res.data);
    } catch { alert("팔로우 요청 실패"); }
    finally { setActionLoading(null); }
  };

  const handleAccept = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/accept?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
      fetchAll();
    } catch { alert("수락 실패"); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (fromId) => {
    setProcessingId(fromId);
    try {
      await axios.post(`${API_BASE}/follows/requests/${fromId}/reject?user_id=${user.user_id}`);
      setRequests((prev) => prev.filter((r) => r.from_user_id !== fromId));
    } catch { alert("거절 실패"); }
    finally { setProcessingId(null); }
  };

  // 팔로워 중 내가 팔로우하지 않는 사람 체크
  const followingIds = new Set(followingList.map((u) => u.id || u.user_id));
  const isFollowing = (id) => followingIds.has(id);

  const UserRow = ({ u, showAction }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0",
      borderBottom: `1px solid ${C.container}`,
    }}>
      <div
        onClick={() => onViewUserProfile?.(u.nickname)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          flex: 1, minWidth: 0, cursor: "pointer",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: u.profile_photo_url
            ? `url(${u.profile_photo_url}) center/cover`
            : `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#fff6ef", fontWeight: 700,
        }}>
          {!u.profile_photo_url && u.nickname?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontFamily: FL, fontSize: 14, fontWeight: 600,
            color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {u.nickname}
          </p>
          {u.bio && (
            <p style={{
              margin: "2px 0 0", fontFamily: FL, fontSize: 11, color: C.outlineVariant,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {u.bio}
            </p>
          )}
        </div>
      </div>
      {showAction}
    </div>
  );

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100%", padding: "48px 16px", textAlign: "center" }}>
        <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e" }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      {/* 상단 세그먼트 토글 */}
      <div style={{
        padding: "14px 16px 0",
        background: C.bg,
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{
          display: "flex", gap: 0, width: "100%",
          background: "rgba(237,238,234,0.6)",
          borderRadius: 10, padding: 3,
        }}>
          {[
            { key: "following", label: `팔로잉 ${followingList.length}` },
            { key: "followers", label: `팔로워 ${followerList.length}` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                flex: 1, padding: "8px 0",
                background: subTab === t.key ? "#ffffff" : "transparent",
                border: "none", borderRadius: 8,
                fontFamily: FL, fontSize: 13, fontWeight: subTab === t.key ? 700 : 500,
                color: subTab === t.key ? C.primary : C.outlineVariant,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: subTab === t.key ? "0 1px 4px rgba(47,52,48,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 16px 16px" }}>
        {/* 팔로우 요청 (항상 상단) */}
        {requests.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{
              margin: "8px 0 6px", fontFamily: FL, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em", color: C.primary,
            }}>
              팔로우 요청 {requests.length}
            </p>
            {requests.map((req) => (
              <div key={req.from_user_id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", borderBottom: `1px solid ${C.container}`,
              }}>
                <div
                  onClick={() => onViewUserProfile?.(req.from_nickname)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    flex: 1, minWidth: 0, cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.primaryDim}, ${C.primary})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#fff6ef", fontWeight: 700,
                  }}>
                    {req.from_nickname?.[0]?.toUpperCase()}
                  </div>
                  <p style={{
                    margin: 0, fontFamily: FL, fontSize: 14, fontWeight: 600,
                    color: C.onSurface, flex: 1,
                  }}>
                    {req.from_nickname}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAccept(req.from_user_id)}
                    disabled={processingId === req.from_user_id}
                    style={{
                      padding: "6px 14px", borderRadius: 6,
                      background: C.primary, border: "none",
                      fontFamily: FL, fontSize: 11, fontWeight: 700,
                      color: "#fff6ef", cursor: "pointer",
                    }}
                  >
                    수락
                  </button>
                  <button
                    onClick={() => handleReject(req.from_user_id)}
                    disabled={processingId === req.from_user_id}
                    style={{
                      padding: "6px 14px", borderRadius: 6,
                      background: "none", border: `1px solid ${C.container}`,
                      fontFamily: FL, fontSize: 11, fontWeight: 600,
                      color: C.outlineVariant, cursor: "pointer",
                    }}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 팔로잉 목록 */}
        {subTab === "following" && (
          <>
            {followingList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px" }}>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 15, color: "#a8a29e", margin: "0 0 6px" }}>
                  아직 팔로우하는 사람이 없어요
                </p>
                <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e" }}>
                  검색 탭에서 사람을 찾아보세요
                </p>
              </div>
            ) : (
              followingList.map((u) => (
                <UserRow key={u.id || u.user_id} u={u} showAction={
                  <button
                    onClick={() => handleUnfollow(u.id || u.user_id)}
                    disabled={actionLoading === (u.id || u.user_id)}
                    style={{
                      padding: "6px 12px", borderRadius: 6, flexShrink: 0,
                      background: "none", border: `1px solid rgba(158,66,44,0.15)`,
                      fontFamily: FL, fontSize: 11, fontWeight: 600,
                      color: C.error, cursor: "pointer",
                      opacity: actionLoading === (u.id || u.user_id) ? 0.5 : 1,
                    }}
                  >
                    해제
                  </button>
                } />
              ))
            )}
          </>
        )}

        {/* 팔로워 목록 */}
        {subTab === "followers" && (
          <>
            {followerList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px" }}>
                <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 15, color: "#a8a29e", margin: "0 0 6px" }}>
                  아직 팔로워가 없어요
                </p>
              </div>
            ) : (
              followerList.map((u) => {
                const uid = u.id || u.user_id;
                const alreadyFollowing = isFollowing(uid);
                return (
                  <UserRow key={uid} u={u} showAction={
                    uid !== user?.user_id && !alreadyFollowing ? (
                      <button
                        onClick={() => handleFollowBack(uid)}
                        disabled={actionLoading === uid}
                        style={{
                          padding: "6px 14px", borderRadius: 6, flexShrink: 0,
                          background: C.primary, border: "none",
                          fontFamily: FL, fontSize: 11, fontWeight: 700,
                          color: "#fff6ef", cursor: "pointer",
                          opacity: actionLoading === uid ? 0.5 : 1,
                        }}
                      >
                        팔로우
                      </button>
                    ) : alreadyFollowing ? (
                      <span style={{
                        padding: "6px 12px", borderRadius: 6,
                        border: `1px solid ${C.container}`,
                        fontFamily: FL, fontSize: 11, fontWeight: 600,
                        color: C.outlineVariant, flexShrink: 0,
                      }}>
                        팔로잉
                      </span>
                    ) : null
                  } />
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
