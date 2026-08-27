#!/usr/bin/env python3
"""Migrate users from user_data.txt to SQLite database"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# Define the User model
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    password: Mapped[str]
    role: Mapped[str]
    patientId: Mapped[str] = mapped_column(default="")
    fullName: Mapped[str] = mapped_column(default="")
    email: Mapped[str] = mapped_column(default="")
    age: Mapped[int] = mapped_column(default=0)
    gender: Mapped[str] = mapped_column(default="")

# Setup database
engine = create_engine("sqlite:///smarthealth.db", future=True)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

# Read and parse user_data.txt
file_path = Path(__file__).parent / "user_data.txt"
users_to_add = []

if file_path.exists():
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Split by account entries
    entries = content.split("================================================================================")
    
    for entry in entries:
        lines = [line.strip() for line in entry.split('\n') if line.strip() and ':' in line]
        
        if not lines:
            continue
            
        user_data = {}
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                user_data[key.strip()] = value.strip()
        
        if 'Username' in user_data and 'Password' in user_data:
            users_to_add.append({
                'username': user_data.get('Username', ''),
                'password': user_data.get('Password', ''),
                'role': user_data.get('Role', 'patient').lower(),
                'patientId': user_data.get('Patient ID', ''),
                'fullName': user_data.get('Full Name', ''),
                'email': user_data.get('Email', ''),
                'age': int(user_data.get('Age', 0)) if user_data.get('Age', '0').isdigit() else 0,
                'gender': user_data.get('Gender', ''),
            })

# Add users to database
with SessionLocal() as session:
    for user_data in users_to_add:
        # Check if user already exists
        existing = session.query(User).filter_by(username=user_data['username']).first()
        if not existing:
            user = User(**user_data)
            session.add(user)
            print(f"✓ Added user: {user_data['username']}")
        else:
            print(f"⊘ User already exists: {user_data['username']}")
    
    session.commit()

print("\n✅ Migration complete!")
print(f"Total users in database:")
with SessionLocal() as session:
    count = session.query(User).count()
    print(f"  {count} users")
    for user in session.query(User).all():
        print(f"  - {user.username} ({user.role})")
