# Custom encrypted field for Django models

from django.db import models
from django.conf import settings
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64

# Custom field for encrypting character data
class EncryptedCharField(models.CharField):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def to_python(self, value):
        if value is None:
            return value
        try:
            # Decode and decrypt the stored value
            decoded = base64.b64decode(value)
            nonce = decoded[:16]
            ciphertext = decoded[16:]
            cipher = AES.new(settings.ENCRYPTION_KEY.encode(), AES.MODE_EAX, nonce=nonce)
            return cipher.decrypt(ciphertext).decode()
        except Exception:
            return value

    def from_db_value(self, value, expression, connection):
        # Convert database value to Python
        return self.to_python(value)

    def get_prep_value(self, value):
        if value is None:
            return value
        # Encrypt and encode the value
        cipher = AES.new(settings.ENCRYPTION_KEY.encode(), AES.MODE_EAX)
        nonce = cipher.nonce
        ciphertext = cipher.encrypt(value.encode())
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode()