// src/components/SearchTab.jsx
import { useState } from "react";
import axios from "axios";
import { useUser, API_BASE } from "../context/UserContext";
import SavePlaceModal from "./SavePlaceModal";

export default function SearchTab({ onPlaceAdded }) {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pendingPlace, setPendingPlace] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError(""); setResult(null);
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/search-place/`, { params: { name: query.trim() } });
      if (res.data) setResult(res.data);
      else setError("가게를 찾을 수 없어요");
    } catch (e) {
      setError("검색 실패. 다시 시도해주세요");
    } finally {
      setSearching(false);
    }
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
    const url = user ? `${API_BASE}/personal-places/?user_id=${user.user_id}` : `${API_BASE}/personal-places/`;
    const res = await axios.post(url, payload);
    if (onPlaceAdded) onPlaceAdded(res.data);
    setSavedMsg(`'${place.name}' 저장됐어요!`);
    setResult(null); setQuery("");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#f8f8f8",
      zIndex: 20, display: "flex", flexDirection: "column",
      paddingBottom: 60,
    }}>
      {/* 헤더 + 검색창 */}
      <div style={{ background: "white", padding: "16px 16px 14px", borderBottom: "1px solid #f0f0f0" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#222" }}>맛집 검색</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="가게명 검색 (예: 을지면옥)"
            autoFocus
            style={{
              flex: 1, padding: "13px 16px",
              border: "1.5px solid #eee", borderRadius: 14,
              fontSize: 15, outline: "none", WebkitAppearance: "none",
            }}
            onFocus={(e) => e.target.style.borderColor = "#E8593C"}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
          />
          <button onClick={handleSearch} disabled={searching || !query.trim()} style={{
            padding: "13px 18px", minHeight: 48,
            background: searching || !query.trim() ? "#eee" : "#E8593C",
            color: searching || !query.trim() ? "#aaa" : "white",
            border: "none", borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}>
            {searching ? "..." : "검색"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
        {savedMsg && (
          <div style={{
            background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 12,
            padding: "14px 16px", fontSize: 15, color: "#2e7d32", fontWeight: 600,
            marginBottom: 14, textAlign: "center",
          }}>
            ✓ {savedMsg}
          </div>
        )}

        {error && (
          <div style={{
            background: "#fff0ed", borderRadius: 12, padding: "14px 16px",
            fontSize: 15, color: "#E8593C", textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: "white", borderRadius: 18, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#E8593C", fontWeight: 600 }}>{result.category || "맛집"}</p>
            <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#1a1a1a" }}>{result.name}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#888" }}>📍 {result.address || "주소 정보 없음"}</p>

            {result.naver_place_url && (
              <a href={result.naver_place_url} target="_blank" rel="noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginBottom: 16, padding: "10px 16px",
                background: "#03C75A", color: "white", borderRadius: 10,
                fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}>
                🗺️ 네이버 지도에서 보기
              </a>
            )}

            <button onClick={() => setPendingPlace(result)} style={{
              width: "100%", padding: "16px",
              background: "#E8593C", color: "white",
              border: "none", borderRadius: 14,
              fontSize: 17, fontWeight: 800, cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}>
              + 내 맛집에 저장하기
            </button>
          </div>
        )}

        {!result && !error && !savedMsg && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔍</div>
            <p style={{ fontSize: 16 }}>가게 이름으로 검색해보세요</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>예: 을지면옥, 스타벅스 강남점</p>
          </div>
        )}
      </div>

      {pendingPlace && (
        <SavePlaceModal place={pendingPlace} onSave={handleSave} onClose={() => setPendingPlace(null)} />
      )}
    </div>
  );
}
