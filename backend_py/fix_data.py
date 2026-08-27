from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class VitalReadingORM(Base):
    __tablename__ = "vital_readings"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patientId: Mapped[str] = mapped_column(index=True)
    timestamp: Mapped[int] = mapped_column(index=True)
    heartRate: Mapped[float]
    spo2: Mapped[float]
    temperature: Mapped[float]
    risk: Mapped[str]

engine = create_engine("sqlite:///smarthealth.db")
SessionLocal = sessionmaker(bind=engine)

def calculate_risk(hr, spo2, temp):
    # Logic from app.py fallback
    if spo2 < 92 or temp >= 38.5:
        return "HIGH"
    if hr > 120 or temp >= 37.8:
        return "MEDIUM"
    return "LOW"

def fix_data():
    with SessionLocal() as session:
        # Find records with None risk (or maybe "None" string if SQLite coerced it, but usually None)
        # In SQLAlchemy check for None or empty
        to_fix = session.query(VitalReadingORM).filter(
            (VitalReadingORM.risk == None) | (VitalReadingORM.risk == "")
        ).all()
        
        print(f"Found {len(to_fix)} records to fix.")
        
        count = 0
        for r in to_fix:
            new_risk = calculate_risk(r.heartRate, r.spo2, r.temperature)
            r.risk = new_risk
            count += 1
            if count % 1000 == 0:
                print(f"Fixed {count}...")
        
        session.commit()
        print(f"✅ Successfully fixed {count} records!")

if __name__ == "__main__":
    fix_data()
