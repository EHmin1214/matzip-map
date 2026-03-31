# 디자인 인수인계서 — #7 피드 탭 개선

---

## 수정 1: 빈 상태(empty state)에 액션 버튼 추가

**파일:** `frontend/src/components/FeedTab.jsx` — 104-118행 (combinedFeed.length === 0 분기)

**현재 상태:**
```jsx
<p>아직 피드가 비어있어요</p>
<p>장소를 추가하거나 팔로우를 시작해보세요</p>
```
텍스트만 있고 실제 액션으로 이어지는 버튼이 없음.

**변경 사항:**

기존 안내 텍스트 아래에 **텍스트 링크 버튼** 추가:

```jsx
<button onClick={() => /* 검색탭으로 이동 */} style={{
  background: "none", border: "none", cursor: "pointer",
  fontFamily: FL, fontSize: 13, fontWeight: 700,
  color: C.primary,
  textDecoration: "underline",
  textUnderlineOffset: 3,
  marginTop: 16,
  padding: 0,
}}>
  첫 장소를 검색해보세요
</button>
```

- 스타일: 밑줄 텍스트, primary 컬러(`#655d54`), bold
- solid 버튼이 아닌 텍스트 링크 — 서비스의 여유로운 톤 유지
- 클릭 시 검색탭(`activeTab: "search"`)으로 전환
- FeedTab 컴포넌트에 `onNavigate` 같은 prop을 추가하여 App.js의 `setActiveTab("search")`를 호출하는 방식으로 구현

---

## 수정 2: 모바일 카드 간격 확보

**파일:** `frontend/src/components/FeedTab.jsx` — 131행

**현재:**
```jsx
<div style={{ display: "flex", flexDirection: "column", gap: mobile ? 2 : 12 }}>
```

**변경:**
```jsx
<div style={{ display: "flex", flexDirection: "column", gap: mobile ? 16 : 12 }}>
```

- 모바일 `gap`: `2px` → **`16px`**
- 데스크톱 `gap`: `12px` → 유지 (또는 `16px`로 통일해도 좋음)

현재 2px은 사실상 카드가 붙어있는 상태로, 인스타그램 피드 느낌. 16px로 늘리면 각 카드가 독립된 기록으로 인식되어 "나의 아카이브" 톤에 맞음.

추가로 모바일 카드의 `borderRadius`도 조정 고려:

**현재 (252-257행):**
```jsx
borderRadius: mobile ? 0 : 10,
boxShadow: mobile ? "none" : "0 1px 8px rgba(47,52,48,0.06)",
```

**변경:**
```jsx
borderRadius: mobile ? 12 : 10,
boxShadow: mobile ? "0 1px 6px rgba(47,52,48,0.04)" : "0 1px 8px rgba(47,52,48,0.06)",
```

- 모바일에서도 `borderRadius: 12` + 미세한 shadow 적용
- gap 16px + 라운드 카드로 각 항목이 독립된 카드로 보임
- 이 경우 카드 리스트에 좌우 패딩도 필요: `padding: "12px 12px"` (현재 `"12px 0"`)

---

## 수정하지 않는 것

- 피드 카드 내부 레이아웃 (헤더, 사진, 액션바, 댓글) 유지
- 더블탭 좋아요 애니메이션 유지
- Pull-to-refresh 로직 유지
- "End of recent archive" 하단 텍스트 유지
- 상대 시간 포맷 유지
- 빈 상태 기존 텍스트 유지 (버튼만 추가)
