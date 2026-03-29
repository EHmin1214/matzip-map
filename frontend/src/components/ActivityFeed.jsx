// src/components/ActivityFeed.jsx
// 디자인: desktop_2.html (Discovery Feed) 기반
import { useState, useEffect } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";

const STATUS_LABEL = { want_to_go: "가고 싶어요", visited: "가봤어요", want_revisit: "또 가고 싶어요", not_recommended: "별로였어요" };
const STATUS_EMOJI = { want_to_go: "🔖", visited: "✅", want_revisit: "❤️", not_recommended: "👎" };

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
  containerLowest: "#ffffff",
  onSurface:  "#2f3430",
  variant:    "#5c605c",
};

const isMobile = () => window.innerWidth <= 768;

export default function ActivityFeed({ embedded = false, onPlaceClick }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/activity-feed?user_id=${user.user_id}`)
      .then((res) => setActivities(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (embedded) {
    // 사이드바 내 임베드 버전 (간소화)
    return (
      <div style={{ height: "100%", overflowY: "auto", background: C.bg, padding: "12px 8px" }}>
        <p style={{ fontFamily: FL, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", margin: "0 4px 12px" }}>
          팔로잉 활동
        </p>
        {loading ? (
          <p style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e", padding: "8px 4px" }}>불러오는 중...</p>
        ) : activities.length === 0 ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 13, color: "#a8a29e", padding: "8px 4px" }}>아직 활동이 없어요</p>
        ) : (
          activities.map((a, idx) => (
            <div key={idx} onClick={() => onPlaceClick && onPlaceClick(a)}
              style={{
                padding: "10px 8px", borderBottom: `1px solid ${C.container}`,
                cursor: onPlaceClick ? "pointer" : "default",
              }}>
              <p style={{ margin: 0, fontFamily: FH, fontSize: 12, color: C.onSurface, lineHeight: 1.5 }}>
                <b>{a.owner_nickname}</b>님이{" "}
                <span style={{ fontStyle: "italic", color: C.primary }}>{a.place_name}</span>을(를){" "}
                {STATUS_EMOJI[a.place_status]} {STATUS_LABEL[a.place_status]}에 추가
              </p>
              <p style={{ margin: "3px 0 0", fontFamily: FL, fontSize: 9, color: "#a8a29e" }}>{formatTime(a.created_at)}</p>
            </div>
          ))
        )}
      </div>
    );
  }

  // 풀스크린 버전 — desktop_2.html Discovery Feed 레이아웃
  return (
    <div style={{
      flex: 1, minHeight: "100vh",
      background: C.bg, overflowY: "auto",
      paddingBottom: mobile ? 80 : 48,
      WebkitOverflowScrolling: "touch",
    }}>
      {/* 상단 고정 헤더 (PC) */}
      {!mobile && (
        <header style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(250,249,246,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.container}`,
          padding: "14px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 22, color: C.primary, margin: 0 }}>My Space</h1>
        </header>
      )}

      <main style={{ maxWidth: 900, margin: "0 auto", padding: mobile ? "20px 16px" : "48px 40px" }}>
        {/* 에디토리얼 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 64,
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ maxWidth: 480 }}>
            <h2 style={{
              fontFamily: FH, fontSize: mobile ? 36 : 52,
              fontWeight: 400, color: C.onSurface,
              margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.1,
            }}>
              Discovery Feed
            </h2>
            <p style={{
              fontFamily: FH, fontSize: 16, fontStyle: "italic",
              color: "#78716c", lineHeight: 1.6, margin: 0, opacity: 0.8,
            }}>
              팔로잉한 사람들의 기록과 수집.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: FL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.primary, display: "block", marginBottom: 4 }}>
              Live Updates
            </span>
            <span style={{ fontFamily: FH, fontStyle: "italic", fontSize: 12, color: "#78716c" }}>
              {new Date().toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>

        {/* 피드 목록 */}
        {loading ? (
          <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 16, color: "#a8a29e", textAlign: "center", padding: "60px 0" }}>불러오는 중...</p>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 20, color: "#a8a29e", margin: "0 0 12px" }}>
              아직 활동이 없어요
            </p>
            <p style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e" }}>팔로우를 시작해보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
            {activities.map((a, idx) => (
              <article key={idx} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
                {/* 아바타 */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: mobile ? 44 : 56, height: mobile ? 44 : 56,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, #655d54, #877a6f)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FH, fontStyle: "italic",
                    fontSize: mobile ? 18 : 22, color: "#fff6ef", fontWeight: 700,
                  }}>
                    {a.owner_nickname?.[0]?.toUpperCase()}
                  </div>
                </div>

                {/* 내용 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FL, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.primary }}>
                      {a.owner_nickname}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#a8a29e" }} />
                    <span style={{ fontFamily: FL, fontSize: 10, color: "#a8a29e" }}>
                      {formatTime(a.created_at)}
                    </span>
                  </div>

                  <h3 style={{
                    fontFamily: FH, fontSize: mobile ? 18 : 22,
                    fontWeight: 400, color: C.onSurface,
                    margin: "0 0 20px", lineHeight: 1.4,
                  }}>
                    <span style={{ fontStyle: "italic", color: "#595149" }}>{a.place_name}</span>을(를){" "}
                    {STATUS_EMOJI[a.place_status]}{" "}
                    <span style={{ color: "#595149" }}>{STATUS_LABEL[a.place_status]}</span>에 추가했어요
                  </h3>

                  {/* 카드 */}
                  <div
                    onClick={() => onPlaceClick && onPlaceClick(a)}
                    style={{
                      background: C.containerLowest,
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: onPlaceClick ? "pointer" : "default",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => { if (onPlaceClick) e.currentTarget.style.background = C.bg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.containerLowest; }}
                  >
                    <div style={{ padding: mobile ? "16px" : "28px" }}>
                      {a.place_address && (
                        <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 11, color: "#a8a29e", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                          {a.place_address}
                        </p>
                      )}
                      <p style={{
                        margin: 0, fontFamily: FH, fontStyle: "italic",
                        fontSize: 14, color: C.variant, lineHeight: 1.7,
                      }}>
                        {a.memo || `${STATUS_EMOJI[a.place_status]} ${STATUS_LABEL[a.place_status]}`}
                      </p>

                      <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
                        <button style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "none", border: "none", cursor: "pointer",
                          fontFamily: FL, fontSize: 10, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.15em",
                          color: "#78716c",
                          transition: "color 0.15s",
                          padding: 0,
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#78716c"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                          지도에서 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 하단 */}
        {!loading && activities.length > 0 && (
          <div style={{ marginTop: 80, paddingTop: 32, borderTop: `1px solid ${C.container}`, textAlign: "center" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#a8a29e" }}>
              End of recent archive
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
