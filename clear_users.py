"""
Clear all users from the database
Run this to delete all patient and doctor accounts
"""
import sqlite3
from pathlib import Path

# Database path
db_path = Path(__file__).parent / "backend_py" / "smarthealth.db"

if not db_path.exists():
    print(f"❌ Database not found at: {db_path}")
    print("No users to delete.")
    exit(0)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if users table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
if not cursor.fetchone():
    print("⚠️  Users table doesn't exist. Nothing to delete.")
    conn.close()
    exit(0)

# Count current users
cursor.execute("SELECT COUNT(*) FROM users")
count = cursor.fetchone()[0]

if count == 0:
    print("✅ No users in database. Nothing to delete.")
    conn.close()
    exit(0)

print(f"⚠️  Found {count} user(s) in database.")
print("\nThis will DELETE ALL users (patients and doctors).")
confirm = input("Type 'YES' to confirm deletion: ")

if confirm != "YES":
    print("❌ Deletion cancelled.")
    conn.close()
    exit(0)

# Delete all users
cursor.execute("DELETE FROM users")
conn.commit()

print(f"\n✅ Successfully deleted {count} user(s) from database.")
print("\nAll patient and doctor accounts have been removed.")
print("You can now create fresh accounts through the signup page.")

conn.close()
