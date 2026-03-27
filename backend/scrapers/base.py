"""
scrapers/base.py
모든 스크래퍼가 공유하는 데이터 구조 및 추상 인터페이스.
"""

from dataclasses import dataclass, field
from datetime import datetime
from abc import ABC, abstractmethod
from enum import Enum


class SourceType(str, Enum):
    NAVER_BLOG = "naver_blog"
    INSTAGRAM = "instagram"


@dataclass
class PostData:
    """
    소스(블로그/인스타)에 무관하게 통일된 게시물 구조.
    extractor.py와 DB 저장 로직은 이 구조만 바라봄.
    """
    source: SourceType
    post_id: str              # 소스 내 고유 ID
    post_url: str             # 원본 게시물 URL
    title: str                # 블로그 제목 or 인스타 첫 줄
    content: str              # 본문 전체 텍스트 (상호명 추출용)
    author_id: str            # 블로거 ID or 인스타 username
    author_name: str          # 블로거 닉네임 or 인스타 display name
    published_at: datetime | None
    location_hint: str | None = None  # 위치 태그 등 힌트 (있으면 추출 정확도 향상)
    extra: dict = field(default_factory=dict)  # 소스별 부가 정보


class BaseScraper(ABC):
    """모든 스크래퍼가 구현해야 하는 인터페이스."""

    @abstractmethod
    def get_posts_by_author(self, author_id: str, max_posts: int) -> list[PostData]:
        """특정 작성자의 최근 게시물 수집."""
        ...

    @abstractmethod
    def get_posts_by_keyword(self, keyword: str, max_posts: int) -> list[PostData]:
        """키워드 검색으로 게시물 수집."""
        ...
