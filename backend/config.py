
import os
import ssl
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Backend directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

# Supabase SSL certificate
SSL_CERT_PATH = BASE_DIR / "supabase-ca.crt"

class Config:
    # Supabase PostgreSQL database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT authentication
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    # React frontend
    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173"
    )

    # PostgreSQL SSL configuration
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {
            "ssl_context": ssl.create_default_context(
                cafile=str(SSL_CERT_PATH)
            )
        },
        "pool_pre_ping": True
    }
