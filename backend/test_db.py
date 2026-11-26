
import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL missing from .env")

# Require certificate and hostname verification
ssl_context = ssl.create_default_context()

# Trust the certificate downloaded from Supabase
ssl_context.load_verify_locations(
    cafile=str(BASE_DIR / "supabase-ca.crt")
)

engine = create_engine(
    database_url,
    connect_args={"ssl_context": ssl_context}
)

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), current_user")
        )
        print("Supabase connected successfully!")
        print("Database:", result.fetchone())

except Exception as error:
    print("Connection failed:", type(error).__name__)
    print("Details:", str(error))

finally:
    engine.dispose()
