"""Create an encrypted PostgreSQL backup and upload it to S3-compatible storage."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import subprocess
import tempfile

import boto3
from backup_crypto import encrypt_file


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required for automated backups")
    return value


def main() -> None:
    database_url = required("DATABASE_URL")
    bucket = required("BACKUP_S3_BUCKET")
    encryption_key = required("BACKUP_ENCRYPTION_KEY")
    prefix = os.getenv("BACKUP_S3_PREFIX", "health-risk-dashboard").strip("/")
    retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    object_key = f"{prefix}/postgres-{timestamp}.dump.enc"

    with tempfile.TemporaryDirectory(prefix="health-backup-") as temporary:
        dump_path = Path(temporary) / "database.dump"
        encrypted_path = Path(temporary) / "database.dump.enc"
        subprocess.run(
            [
                "pg_dump",
                "--dbname",
                database_url,
                "--format=custom",
                "--compress=9",
                "--no-owner",
                "--no-acl",
                "--file",
                str(dump_path),
            ],
            check=True,
        )
        encrypt_file(dump_path, encrypted_path, encryption_key)
        dump_path.unlink()

        client = boto3.client(
            "s3",
            endpoint_url=os.getenv("BACKUP_S3_ENDPOINT") or None,
            region_name=os.getenv("AWS_DEFAULT_REGION") or None,
        )
        client.upload_file(
            str(encrypted_path),
            bucket,
            object_key,
            ExtraArgs={
                "ServerSideEncryption": "AES256",
                "ContentType": "application/octet-stream",
                "Metadata": {"created-at": timestamp, "format": "pg_dump-custom-fernet"},
            },
        )

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    paginator = client.get_paginator("list_objects_v2")
    expired: list[dict[str, str]] = []
    for page in paginator.paginate(Bucket=bucket, Prefix=f"{prefix}/"):
        for item in page.get("Contents", []):
            if item["LastModified"] < cutoff:
                expired.append({"Key": item["Key"]})
    for index in range(0, len(expired), 1000):
        client.delete_objects(
            Bucket=bucket,
            Delete={"Objects": expired[index : index + 1000], "Quiet": True},
        )

    print(f"Encrypted backup uploaded: s3://{bucket}/{object_key}")


if __name__ == "__main__":
    main()
