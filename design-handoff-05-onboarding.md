# 디자인 인수인계서 — #5 온보딩 디테일 개선

---

## 디자인 방향

현재 온보딩 모달의 구조(3단계 캐러셀)는 유지합니다. 서비스의 차분하고 개인적인 톤에 맞게 **전환 애니메이션**과 **마지막 스텝의 자연스러운 퇴장감**을 다듬습니다.

---

## 수정 1: 스텝 전환 시 fadeUp 애니메이션

**파일:** `frontend/src/components/OnboardingGuide.jsx`

**현재 문제:** 스텝 전환 시 아이콘/제목/설명이 즉시 교체되어 움직임이 없음

**변경 사항:**

- "다음" 버튼 클릭 시 상단 콘텐츠 영역(아이콘 + 제목 + 설명)에 **fadeUp 애니메이션** 적용
- 스타일:
  - `opacity: 0 → 1`
  - `translateY: 8px → 0`
  - `duration: 0.25s`, `ease-out`
- 구현 방법: step이 바뀔 때마다 콘텐츠 래퍼에 key={step}을 부여하면 React가 리마운트하면서 애니메이션 트리거됨
- index.css에 이미 정의된 `fadeUp` 키프레임이 있으면 그것을 활용

---

## 수정 2: 아이콘 굵기 조정

**파일:** `frontend/src/components/OnboardingGuide.jsx` — 53-56행 아이콘 영역

**현재:** `fontVariationSettings: "'FILL' 0, 'wght' 200"`

**변경:** `fontVariationSettings: "'FILL' 0, 'wght' 300"`

서비스 내 다른 아이콘들과 무게감 통일.

---

## 수정 3: 마지막 스텝 버튼 — 투명 스타일

**파일:** `frontend/src/components/OnboardingGuide.jsx` — 104-110행

**현재:**
```jsx
<button onClick={onStart} style={{
  width: "100%", padding: "14px", border: "none", borderRadius: 10,
  background: C.primary, fontFamily: FL, fontSize: 13,
  fontWeight: 700, color: "#fff6ef", cursor: "pointer",
}}>
  첫 장소 검색하러 가기
</button>
```

**변경:**
```jsx
<button onClick={handleStart} style={{
  width: "100%", padding: "14px", border: "none", borderRadius: 10,
  background: "transparent", fontFamily: FL, fontSize: 13,
  fontWeight: 600, color: C.primary, cursor: "pointer",
  letterSpacing: "0.01em",
}}>
  첫 장소 검색하러 가기
</button>
```

변경 포인트:
- `background`: solid primary → **transparent**
- `color`: 흰색 → **C.primary (#655d54)**
- `fontWeight`: 700 → **600** (약간 가볍게)
- 밑줄, 테두리 없음 — 텍스트만 존재

**의도:** 이전 스텝의 "다음" 버튼(solid)과 대비되어, 마지막 스텝은 "버튼을 누르는 것"이 아니라 "자연스럽게 넘어가는 것"으로 느껴짐

---

## 수정 4: 모달 퇴장 fade-out

**파일:** `frontend/src/components/OnboardingGuide.jsx`

**현재 문제:** 마지막 버튼 클릭 시 모달이 즉시 사라짐

**변경 사항:**

- 마지막 버튼 클릭 시 즉시 `onStart()`를 호출하지 않고, **fade-out 후** 호출
- 구현:
  1. `const [closing, setClosing] = useState(false)` 상태 추가
  2. 마지막 버튼 클릭 → `setClosing(true)`
  3. 모달 최외곽 div에 closing 상태 반영:
     - `opacity: closing ? 0 : 1`
     - `transition: "opacity 0.3s ease"`
  4. `useEffect`로 closing이 true가 되면 300ms 후 `onStart()` 호출
- "건너뛰기" 버튼은 기존대로 즉시 닫힘 (fade-out 없음, 빠른 동작이 자연스러움)

---

## 수정하지 않는 것

- 3단계 구조 및 텍스트 내용 유지
- 모달 레이아웃/크기 변경 없음
- 인디케이터(pill dot) 스타일 유지
- "건너뛰기" / "다음" 버튼 스타일 유지
