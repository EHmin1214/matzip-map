# 디자인 인수인계서 — #10 파비콘 교체

---

## 디자인 방향

"나의 취향을 큐레이션하여 공유한다"는 의미를 담은 겹친 카드 심볼. 두 카드가 겹치며 색이 섞이는 표현으로 취향이 모이고 공유되는 느낌을 전달합니다.

---

## 수정: 파비콘 교체

**SVG 원본:** `matzip-map/favicon-option-a.svg` (확정본)

**적용 대상:**
- `frontend/public/favicon.ico` — ICO 형식으로 변환하여 교체
- `frontend/public/logo192.png` — 192x192 PNG로 변환하여 교체
- `frontend/public/logo512.png` — 512x512 PNG로 변환하여 교체
- `frontend/public/manifest.json` — 아이콘 경로 확인 (기존 파일명 그대로면 변경 불필요)

**변환 방법:**

SVG를 각 크기로 변환합니다. 투명 배경을 유지하세요.

1. `favicon.ico`: 16x16, 32x32, 48x48 멀티사이즈 ICO
2. `logo192.png`: 192x192 PNG (투명 배경)
3. `logo512.png`: 512x512 PNG (투명 배경)

온라인 변환 도구 (예: realfavicongenerator.net) 또는 CLI 도구 (ImageMagick 등)를 사용하면 됩니다.

**SVG 스펙 (참고):**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- 뒤쪽 카드 -->
  <rect x="20" y="14" width="28" height="34" rx="2" ry="2" fill="#a89a8e"/>
  <!-- 앞쪽 카드 -->
  <rect x="14" y="18" width="28" height="34" rx="2" ry="2" fill="#a89a8e"/>
  <!-- 겹치는 영역 -->
  <clipPath id="backCard">
    <rect x="20" y="14" width="28" height="34" rx="2" ry="2"/>
  </clipPath>
  <rect x="14" y="18" width="28" height="34" rx="2" ry="2" fill="#867a6e" clip-path="url(#backCard)"/>
</svg>
```

- 카드 색상: `#a89a8e` (연한 웜브라운)
- 겹침 영역: `#867a6e` (혼합, 살짝 진한 브라운)
- 모서리: `rx="2"` (미니멀하게 거의 직각)
- 배경: 투명

---

## 추가: index.html 타이틀 확인

**파일:** `frontend/public/index.html`

현재 `<title>`이 "React App" 등 기본값이라면 서비스명으로 변경:

```html
<title>나의 공간</title>
```

---

## 정리

기존 React 로고 파일을 삭제하고, 위 아이콘으로 교체합니다. 불필요한 `favicon-option-b.svg` 파일은 삭제해도 됩니다.
