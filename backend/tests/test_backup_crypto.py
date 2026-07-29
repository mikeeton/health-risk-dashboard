from cryptography.fernet import Fernet

from scripts.backup_crypto import decrypt_file, encrypt_file


def test_backup_encryption_round_trip_is_authenticated_and_streaming(tmp_path):
    source = tmp_path / "database.dump"
    encrypted = tmp_path / "database.dump.enc"
    restored = tmp_path / "database.restored"
    source.write_bytes((b"synthetic-postgres-backup-" * 100_000) + b"end")
    key = Fernet.generate_key().decode()

    encrypt_file(source, encrypted, key)
    assert encrypted.read_bytes()[:5] == b"HRDB1"
    assert source.read_bytes() not in encrypted.read_bytes()

    decrypt_file(encrypted, restored, key)
    assert restored.read_bytes() == source.read_bytes()

    tampered = bytearray(encrypted.read_bytes())
    tampered[len(tampered) // 2] ^= 1
    encrypted.write_bytes(tampered)

    try:
        decrypt_file(encrypted, restored, key)
    except Exception:
        pass
    else:
        raise AssertionError("Tampered encrypted backup must not decrypt")
