from config import normalize_database_url


def test_aiven_postgres_alias_is_normalized_for_sqlalchemy():
    source = "postgres://avnadmin:secret@example.aivencloud.com:19114/defaultdb?sslmode=require"
    result = normalize_database_url(source)
    assert result == "postgresql://avnadmin:secret@example.aivencloud.com:19114/defaultdb?sslmode=require"
    assert result.endswith("sslmode=require")


def test_postgresql_driver_url_is_not_changed():
    source = "postgresql+psycopg2://user:secret@localhost/database"
    assert normalize_database_url(source) == source
