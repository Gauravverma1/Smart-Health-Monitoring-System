"""
Delete a specific user by username
Run: python delete_user.py <username>
Example: python delete_user.py rayees1
"""
import sqlite3
import sys
from pathlib import Path

# Database path
db_path = Path(__file__).parent / "backend_py" / "smarthealth.db"

if len(sys.argv) < 2:
    print("Usage: python delete_user.py <username>")
    print("Example: python delete_user.py rayees1")
    exit(1)

username = sys.argv[1]

if not db_path.exists():
    print(f"❌ Database not found at: {db_path}")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if users table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
if not cursor.fetchone():
    print("⚠️  Users table doesn't exist.")
    conn.close()
    exit(0)

# Find the user
cursor.execute("SELECT id, username, role, patientId, fullName FROM users WHERE username = ?", (username,))
user = cursor.fetchone()

if not user:
    print(f"❌ User '{username}' not found in database.")
    conn.close()
    exit(0)

user_id, username, role, patient_id, full_name = user
print(f"\n✅ Found user:")
print(f"   Username: {username}")
print(f"   Role: {role}")
if patient_id:
    print(f"   Patient ID: {patient_id}")
if full_name:
    print(f"   Full Name: {full_name}")

confirm = input(f"\nType 'YES' to delete user '{username}': ")

if confirm != "YES":
    print("❌ Deletion cancelled.")
    conn.close()
    exit(0)

# Delete the user
cursor.execute("DELETE FROM users WHERE username = ?", (username,))
conn.commit()

print(f"\n✅ Successfully deleted user '{username}' from database.")

conn.close()
