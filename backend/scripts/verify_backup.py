"""Download, decrypt, and structurally verify the newest database backup."""

from pathlib import Path
import os
import subprocess
import tempfile

import boto3
from cryptography.fernet import Fernet


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required for backup verification")
    return value


def main() -> None:
    bucket = required("BACKUP_S3_BUCKET")
    prefix = os.getenv("BACKUP_S3_PREFIX", "health-risk-dashboard").strip("/")
    client = boto3.client(
        "s3",
        endpoint_url=os.getenv("BACKUP_S3_ENDPOINT") or None,
        region_name=os.getenv("AWS_DEFAULT_REGION") or None,
    )
    objects = client.list_objects_v2(Bucket=bucket, Prefix=f"{prefix}/").get(
        "Contents", []
    )
    if not objects:
        raise RuntimeError("No database backups were found")
    newest = max(objects, key=lambda item: item["LastModified"])

    with tempfile.TemporaryDirectory(prefix="health-backup-verify-") as temporary:
        encrypted_path = Path(temporary) / "database.dump.enc"
        dump_path = Path(temporary) / "database.dump"
        client.download_file(bucket, newest["Key"], str(encrypted_path))
        dump_path.write_bytes(
            Fernet(required("BACKUP_ENCRYPTION_KEY").encode()).decrypt(
                encrypted_path.read_bytes()
            )
        )
        encrypted_path.unlink()
        result = subprocess.run(
            ["pg_restore", "--list", str(dump_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        if "TABLE" not in result.stdout:
            raise RuntimeError("Backup does not contain PostgreSQL table entries")

    print(f"Backup verified successfully: s3://{bucket}/{newest['Key']}")


if __name__ == "__main__":
    main()
