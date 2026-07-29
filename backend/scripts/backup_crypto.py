"""Streaming authenticated encryption for database backup files."""

import base64
from pathlib import Path
import os

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

MAGIC = b"HRDB1"
NONCE_SIZE = 12
TAG_SIZE = 16
CHUNK_SIZE = 1024 * 1024


def decode_key(encoded_key: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(encoded_key.encode())
    except Exception as error:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY is not valid URL-safe base64") from error
    if len(key) != 32:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes")
    return key


def encrypt_file(source: Path, destination: Path, encoded_key: str) -> None:
    nonce = os.urandom(NONCE_SIZE)
    encryptor = Cipher(
        algorithms.AES(decode_key(encoded_key)),
        modes.GCM(nonce),
    ).encryptor()
    encryptor.authenticate_additional_data(MAGIC)
    with source.open("rb") as input_file, destination.open("wb") as output_file:
        output_file.write(MAGIC)
        output_file.write(nonce)
        while chunk := input_file.read(CHUNK_SIZE):
            output_file.write(encryptor.update(chunk))
        output_file.write(encryptor.finalize())
        output_file.write(encryptor.tag)


def decrypt_file(source: Path, destination: Path, encoded_key: str) -> None:
    file_size = source.stat().st_size
    minimum_size = len(MAGIC) + NONCE_SIZE + TAG_SIZE
    if file_size <= minimum_size:
        raise RuntimeError("Encrypted backup is truncated")
    with source.open("rb") as input_file:
        if input_file.read(len(MAGIC)) != MAGIC:
            raise RuntimeError("Encrypted backup format is not recognized")
        nonce = input_file.read(NONCE_SIZE)
        input_file.seek(-TAG_SIZE, 2)
        tag = input_file.read(TAG_SIZE)
        ciphertext_end = file_size - TAG_SIZE
        input_file.seek(len(MAGIC) + NONCE_SIZE)
        decryptor = Cipher(
            algorithms.AES(decode_key(encoded_key)),
            modes.GCM(nonce, tag),
        ).decryptor()
        decryptor.authenticate_additional_data(MAGIC)
        with destination.open("wb") as output_file:
            remaining = ciphertext_end - input_file.tell()
            while remaining:
                chunk = input_file.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    raise RuntimeError("Encrypted backup ended unexpectedly")
                remaining -= len(chunk)
                output_file.write(decryptor.update(chunk))
            output_file.write(decryptor.finalize())
