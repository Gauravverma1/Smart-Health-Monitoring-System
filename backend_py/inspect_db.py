from sqlalchemy import create_engine, select
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

def inspect_data():
    with SessionLocal() as session:
        readings = session.query(VitalReadingORM).order_by(VitalReadingORM.id.desc()).limit(20).all()
        print(f"Inspecting last {len(readings)} readings:")
        print(f"{'ID':<5} | {'Risk':<10} | {'HR':<5} | {'SpO2':<5}")
        print("-" * 40)
        for r in readings:
            # Check if risk is None or empty string or unexpected value
            risk_display = repr(r.risk)
            print(f"{r.id:<5} | {risk_display:<10} | {r.heartRate:<5} | {r.spo2:<5}")

        # specific check for distinct values
        distinct_risks = session.query(VitalReadingORM.risk).distinct().all()
        print("\nDistinct risk values in DB:", [r[0] for r in distinct_risks])

if __name__ == "__main__":
    inspect_data()
