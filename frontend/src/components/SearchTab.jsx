// src/components/SearchTab.jsx
// 디자인: desktopsearch.html (Discovery/Search) 기반
import { useState } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

const FH = "'Noto Serif', Georgia, serif";
const FL = "'Manrope', -apple-system, sans-serif";
const C = {
  primary:    "#655d54",
  primaryDim: "#595149",
  primaryContainer: "#ede0d5",
  bg:         "#faf9f6",
  container:  "#edeeea",
  containerLow: "#f4f4f0",
  containerLowest: "#ffffff",
  onSurface:  "#2f3430",
  outlineVariant: "#afb3ae",
};

const isMobile = () => window.innerWidth <= 768;

const SUGGESTIONS = ["조용한 카페", "이자카야", "브런치", "빵집", "스시"];

export default function SearchTab({ onPlaceAdded }) {
  const { user } = useUser();
  const mobile = isMobile();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pendingPlace, setPendingPlace] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setError(""); setResult(null);
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/search-place/`, { params: { name: q.trim() } });
      if (res.data) setResult(res.data);
      else setError("공간을 찾을 수 없어요");
    } catch (e) {
      setError("검색 실패. 다시 시도해주세요");
    } finally { setSearching(false); }
  };

  const handleSave = async (place) => {
    const payload = {
      name: place.name, address: place.address, lat: place.lat, lng: place.lng,
      category: place.category, naver_place_id: place.naver_place_id,
      naver_place_url: place.naver_place_url,
      folder_id: place.folder_id || null, status: place.status || "want_to_go",
      rating: place.rating || null, memo: place.memo || null,
      instagram_post_url: place.instagram_post_url || null,
    };
    const url = user
      ? `${API_BASE}/personal-places/?user_id=${user.user_id}`
      : `${API_BASE}/personal-places/`;
    const res = await axios.post(url, payload);
    if (onPlaceAdded) onPlaceAdded(res.data);
    setSavedMsg(`'${place.name}' 기록됐어요!`);
    setResult(null); setQuery("");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div style={{
      flex: 1, minHeight: "100vh", background: C.bg, overflowY: "auto",
      paddingBottom: mobile ? 80 : 48,
    }}>
      {/* 상단 헤더 (PC) */}
      {!mobile && (
        <header style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(250,249,246,0.85)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.container}`,
          padding: "14px 40px",
        }}>
          <h1 style={{ fontFamily: FH, fontStyle: "italic", fontSize: 22, color: C.primary, margin: 0 }}>My Space</h1>
        </header>
      )}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "20px 16px" : "48px 40px" }}>

        {/* 에디토리얼 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 48, flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ maxWidth: 480 }}>
            <h2 style={{
              fontFamily: FH, fontSize: mobile ? 36 : 52,
              fontWeight: 400, color: C.onSurface,
              margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.1,
            }}>Discovery</h2>
            <p style={{
              fontFamily: FH, fontStyle: "italic", fontSize: 15,
              color: "#78716c", lineHeight: 1.6, margin: 0, opacity: 0.8,
            }}>
              나만의 공간 컬렉션에 새로운 기록을 추가하세요.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8a29e", margin: 0 }}>Last Indexed</p>
            <p style={{ fontFamily: FL, fontSize: 12, color: "#78716c", margin: 0 }}>{new Date().toLocaleDateString("ko-KR")}</p>
          </div>
        </div>

        {/* 검색창 */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: searching ? C.primary : "#a8a29e", transition: "color 0.2s" }}>search</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="공간, 위치, 분위기로 검색..."
              autoFocus={!mobile}
              style={{
                width: "100%", padding: "20px 20px 20px 54px",
                background: C.containerLow, border: "none",
                borderRadius: 12, outline: "none",
                fontFamily: FL, fontSize: 17, color: C.onSurface,
                boxSizing: "border-box", transition: "background 0.2s",
              }}
              onFocus={(e) => e.target.style.background = C.container}
              onBlur={(e) => e.target.style.background = C.containerLow}
            />
            <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }}>
              {searching ? (
                <span style={{ fontFamily: FL, fontSize: 12, color: "#a8a29e" }}>검색 중...</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#c7c4bf", cursor: "pointer" }}
                  onClick={() => handleSearch()}>tune</span>
              )}
            </div>
          </div>

          {/* 추천 태그 */}
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", marginRight: 4 }}>
              Suggested:
            </span>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { setQuery(s); handleSearch(s); }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999, border: "none",
                  background: C.containerLow,
                  fontFamily: FL, fontSize: 10, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "#78716c", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryContainer; e.currentTarget.style.color = C.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.containerLow; e.currentTarget.style.color = "#78716c"; }}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* 저장 성공 메시지 */}
        {savedMsg && (
          <div style={{
            padding: "14px 20px", background: C.containerLowest,
            borderLeft: `4px solid ${C.primary}`,
            borderRadius: 8, marginBottom: 24,
            fontFamily: FH, fontStyle: "italic", fontSize: 14, color: C.onSurface,
          }}>
            ✓ {savedMsg}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div style={{
            padding: "14px 20px", background: "#fef0ec",
            borderLeft: "4px solid #9e422c",
            borderRadius: 8, marginBottom: 24,
            fontFamily: FH, fontStyle: "italic", fontSize: 14, color: "#9e422c",
          }}>
            {error}
          </div>
        )}

        {/* 검색 결과 — desktopsearch.html의 asymmetric bento grid 스타일 */}
        {result && (
          <section>
            {/* Featured 결과 카드 */}
            <div style={{
              background: C.containerLowest, borderRadius: 16,
              overflow: "hidden", transition: "background 0.3s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
              onMouseLeave={(e) => e.currentTarget.style.background = C.containerLowest}
            >
              {/* 상단 태그 */}
              <div style={{ padding: "24px 32px 0" }}>
                <span style={{
                  fontFamily: FL, fontSize: 9, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.2em",
                  color: C.primary,
                }}>
                  발견된 공간
                </span>
              </div>

              <div style={{ padding: mobile ? "20px" : "24px 32px 32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    {result.category && (
                      <p style={{ margin: "0 0 8px", fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e" }}>
                        {result.category}
                      </p>
                    )}
                    <h3 style={{
                      margin: "0 0 6px", fontFamily: FH,
                      fontSize: mobile ? 24 : 36, fontWeight: 400,
                      color: C.onSurface, letterSpacing: "-0.01em",
                    }}>
                      {result.name}
                    </h3>
                    {result.address && (
                      <p style={{
                        margin: "0 0 16px", fontFamily: FH, fontStyle: "italic",
                        fontSize: 14, color: "#78716c",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                        {result.address}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {result.naver_place_url && (
                        <a href={result.naver_place_url} target="_blank" rel="noreferrer" style={{
                          padding: "6px 14px", background: C.container,
                          borderRadius: 4, fontFamily: FL, fontSize: 9,
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                          color: "#78716c", textDecoration: "none",
                        }}>
                          Naver Map
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 저장 버튼 — HTML의 "Add to My Space" 버튼 */}
                  <button
                    onClick={() => setPendingPlace(result)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: mobile ? "14px 24px" : "14px 28px",
                      background: C.primary, color: "#fff6ef",
                      border: "none", borderRadius: 6,
                      fontFamily: FL, fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      cursor: "pointer", transition: "background 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDim}
                    onMouseLeave={(e) => e.currentTarget.style.background = C.primary}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Add to My Space
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 초기 상태 — 빈 화면 */}
        {!result && !error && !savedMsg && !searching && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#d6d3d1", display: "block", marginBottom: 20 }}>
              search
            </span>
            <p style={{ fontFamily: FH, fontStyle: "italic", fontSize: 18, color: "#a8a29e", margin: "0 0 8px" }}>
              가게 이름으로 검색해보세요
            </p>
            <p style={{ fontFamily: FL, fontSize: 11, color: "#a8a29e", letterSpacing: "0.1em" }}>
              예: 을지면옥, 스타벅스 강남점
            </p>
          </div>
        )}

        {/* 하단 Load More 스타일 */}
        {!result && !error && !savedMsg && (
          <div style={{ marginTop: 80, textAlign: "center" }}>
            <p style={{ fontFamily: FL, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4em", color: "#a8a29e" }}>
              Explore New Records
            </p>
          </div>
        )}
      </main>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={handleSave} onClose={() => setPendingPlace(null)} />
      )}
    </div>
  );
}
