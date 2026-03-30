"""
migrate_photo_urls.py
personal_places 테이블에 photo_url, photo_urls 컬럼 추가.

배포 후 한 번만 실행:
  python migrate_photo_urls.py
"""

from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE personal_places
                ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
            """))
            conn.commit()
            print("photo_url column added")
        except Exception as e:
            print(f"photo_url: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE personal_places
                ADD COLUMN IF NOT EXISTS photo_urls TEXT;
            """))
            conn.commit()
            print("photo_urls column added")
        except Exception as e:
            print(f"photo_urls: {e}")

        print("migration done")

if __name__ == "__main__":
    run()
