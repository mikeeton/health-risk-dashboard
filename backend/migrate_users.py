from sqlalchemy import text
from database import engine

with engine.connect() as connection:
    try:
        connection.execute(text("ALTER TABLE users ADD COLUMN public_id VARCHAR UNIQUE"))
        print("Added public_id")
    except Exception as error:
        print("public_id already exists or failed:", error)

    try:
        connection.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active'"))
        print("Added status")
    except Exception as error:
        print("status already exists or failed:", error)

    connection.commit()

print("User migration complete.")