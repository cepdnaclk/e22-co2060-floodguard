import psycopg2
import boto3

import os
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(project_root, ".env"))

password = os.getenv("DB_PASSWORD")
database = os.getenv("DB_NAME")
user = os.getenv("DB_USER")

conn = None
try:
    conn = psycopg2.connect(
        host='floodmanagement.czk28osu0tg7.ap-southeast-2.rds.amazonaws.com',
        port=5432,
        database=database,
        user=user,
        password=password,
        sslmode='verify-full',
        sslrootcert=os.path.join(project_root, "global-bundle.pem")
    )
    cur = conn.cursor()
    cur.execute('SELECT version();')
    print(cur.fetchone()[0])
    cur.close()
except Exception as e:
    print(f"Database error: {e}")
    raise
finally:
    if conn:
        conn.close()