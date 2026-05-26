import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url:
    raise RuntimeError("SUPABASE_URL is not set")

if not supabase_service_role_key:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not set")

supabase: Client = create_client(supabase_url, supabase_service_role_key)