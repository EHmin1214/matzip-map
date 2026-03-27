"""
ad_checker.py
블로그 글에서 광고 여부를 텍스트 패턴으로 판별하는 모듈.

광고 키워드 기반으로 빠르게 분류.
애매한 경우 "불확실"로 처리.
"""

import re
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────
# 광고 판별 키워드
# ──────────────────────────────────────────

AD_KEYWORDS = [
    # 명시적 광고 표시
    "소정의 원고료", "소정의 고료", "원고료를 받고", "원고료를 제공",
    "유료광고", "유료 광고", "광고비", "광고 포함",
    "협찬", "협찬을 받", "협찬받", "업체로부터",
    "제공받아", "제공받았", "무료로 제공", "무상으로 제공",
    "초대받아", "초대를 받", "방문 초대",
    "서포터즈", "서포터즈 활동", "홍보단", "체험단",
    "이 포스팅은", "본 포스팅은",
    "파트너십", "partnership",
    "광고성 정보", "광고임을",
    "#ad", "#sponsored", "#광고", "#협찬", "#제공",
    "소정의 혜택", "소정의 보상",
]

# 광고가 아닌 것처럼 보이지만 실제론 광고인 패턴
SUSPICIOUS_KEYWORDS = [
    "방문해보았습니다", "방문하게 되었습니다",  # 자연스럽게 포장
    "기회가 되어", "기회를 얻어",
    "운이 좋게도", "운좋게",
]

# 순수 방문 후기 신호 (이게 많으면 광고 아닐 가능성 높음)
GENUINE_KEYWORDS = [
    "돈주고", "직접 결제", "내돈내산", "내 돈 내산",
    "자비로", "사비로", "개인적으로 방문",
    "아무 관계 없", "관계없이", "관련 없이",
]


# ──────────────────────────────────────────
# 데이터 구조
# ──────────────────────────────────────────

@dataclass
class PostAdResult:
    """게시물 하나의 광고 판별 결과."""
    post_url: str
    post_title: str
    author_id: str
    author_name: str
    is_ad: bool
    is_suspicious: bool   # 애매한 경우
    matched_keywords: list[str]  # 매칭된 키워드 목록
    content_preview: str  # 본문 앞 200자


@dataclass
class AdCheckResult:
    """가게 하나에 대한 광고 분석 전체 결과."""
    restaurant_name: str
    total_posts: int
    ad_count: int
    suspicious_count: int
    genuine_count: int
    ad_ratio: float         # 광고 비율 (0.0 ~ 1.0)
    verdict: str            # "clean" | "suspicious" | "heavy_ad"
    posts: list[PostAdResult]


# ──────────────────────────────────────────
# 광고 판별기
# ──────────────────────────────────────────

class AdChecker:

    def check_post(self, content: str, post_url: str, title: str,
                   author_id: str, author_name: str) -> PostAdResult:
        """게시물 하나의 광고 여부 판별."""
        text = content.lower()

        # 광고 키워드 매칭
        matched_ad = [kw for kw in AD_KEYWORDS if kw.lower() in text]
        matched_suspicious = [kw for kw in SUSPICIOUS_KEYWORDS if kw.lower() in text]
        matched_genuine = [kw for kw in GENUINE_KEYWORDS if kw.lower() in text]

        is_ad = len(matched_ad) > 0
        # 순수 방문 신호가 있으면 광고 아님
        if matched_genuine:
            is_ad = False
            matched_ad = []

        # 광고 키워드는 없지만 의심스러운 경우
        is_suspicious = not is_ad and len(matched_suspicious) > 0

        all_matched = matched_ad + matched_suspicious

        return PostAdResult(
            post_url=post_url,
            post_title=title,
            author_id=author_id,
            author_name=author_name,
            is_ad=is_ad,
            is_suspicious=is_suspicious,
            matched_keywords=all_matched[:5],  # 최대 5개만
            content_preview=content[:200],
        )

    def analyze(
        self,
        restaurant_name: str,
        posts: list[dict],  # {"content", "url", "title", "author_id", "author_name"}
    ) -> AdCheckResult:
        """수집된 게시물 목록 전체 분석."""
        results = []
        for p in posts:
            result = self.check_post(
                content=p.get("content", ""),
                post_url=p.get("url", ""),
                title=p.get("title", ""),
                author_id=p.get("author_id", ""),
                author_name=p.get("author_name", ""),
            )
            results.append(result)

        total = len(results)
        ad_count = sum(1 for r in results if r.is_ad)
        suspicious_count = sum(1 for r in results if r.is_suspicious)
        genuine_count = total - ad_count - suspicious_count
        ad_ratio = ad_count / total if total > 0 else 0.0

        # 종합 판정
        if ad_ratio >= 0.5:
            verdict = "heavy_ad"   # 광고 50% 이상
        elif ad_ratio >= 0.2 or suspicious_count >= 3:
            verdict = "suspicious" # 광고 20% 이상 or 의심 3개 이상
        else:
            verdict = "clean"      # 비교적 순수

        logger.info(
            f"광고 분석 완료: '{restaurant_name}' "
            f"총 {total}개 중 광고 {ad_count}개 ({ad_ratio:.0%})"
        )

        return AdCheckResult(
            restaurant_name=restaurant_name,
            total_posts=total,
            ad_count=ad_count,
            suspicious_count=suspicious_count,
            genuine_count=genuine_count,
            ad_ratio=ad_ratio,
            verdict=verdict,
            posts=results,
        )
