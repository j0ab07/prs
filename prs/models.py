# Models for prs app

from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
import uuid

# Utility function to generate UUID
def generate_uuid():
    return str(uuid.uuid4())

# Individual model for user records
class Individual(models.Model):
    prs_id = models.CharField(
        max_length=50,
        primary_key=True,
        unique=True
    )
    national_identifier = models.CharField(max_length=255, null=False)  # Note: Hashed, not encrypted
    date_of_birth = models.DateField(null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.prs_id:
            self.prs_id = generate_uuid()  # Use utility function for consistency
        if self.national_identifier and not self.national_identifier.startswith('pbkdf2_'):
            self.national_identifier = make_password(self.national_identifier)
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'individuals'

# User profile linking to Individual and Merchant
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    prs_id = models.ForeignKey(Individual, on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profiles')
    merchant_id = models.ForeignKey('Merchant', on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profiles')
    
    class Meta:
        db_table = 'user_profiles'

# Government official model
class GovernmentOfficial(models.Model):
    official_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=False)
    role = models.CharField(max_length=50, null=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'government_officials'

# Merchant model for business entities
class Merchant(models.Model):
    merchant_id = models.AutoField(primary_key=True)
    business_license = models.CharField(max_length=255, unique=True, null=False)  # Note: Hashed, not encrypted
    name = models.CharField(max_length=100, null=False)
    address = models.CharField(max_length=255, null=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.business_license and not self.business_license.startswith('pbkdf2_'):
            self.business_license = make_password(self.business_license)
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'merchants'

# Critical item model for restricted goods
class CriticalItem(models.Model):
    item_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, null=False)
    purchase_limit = models.IntegerField(null=False)
    limit_period = models.CharField(max_length=20, null=False)
    allowed_purchase_day = models.CharField(max_length=20, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'critical_items'

# Merchant stock model for inventory
class MerchantStock(models.Model):
    stock_id = models.AutoField(primary_key=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='stocks')
    item = models.ForeignKey(CriticalItem, on_delete=models.CASCADE, related_name='stocks')
    stock_level = models.IntegerField(null=False)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'merchant_stock'

# Purchase model for transactions
class Purchase(models.Model):
    purchase_id = models.AutoField(primary_key=True)
    prs_id = models.ForeignKey(Individual, on_delete=models.CASCADE, related_name='purchases')
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='purchases')
    item = models.ForeignKey(CriticalItem, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.IntegerField(null=False)
    purchase_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, null=True)

    class Meta:
        db_table = 'purchases'

# Vaccination record model
class VaccinationRecord(models.Model):
    record_id = models.AutoField(primary_key=True)
    prs_id = models.ForeignKey(Individual, on_delete=models.CASCADE, related_name='vaccination_records')
    vaccine_type = models.CharField(max_length=100, null=False)
    manufacturer = models.CharField(max_length=100, null=True)
    dose_number = models.IntegerField(null=False)
    batch_number = models.CharField(max_length=50, null=True)
    vaccination_date = models.DateField(null=False)
    administered_by = models.CharField(max_length=100, null=True)
    status = models.CharField(max_length=20, null=False, default='Completed')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vaccination_records'

# Access log model for government actions
class AccessLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    official = models.ForeignKey(GovernmentOfficial, on_delete=models.CASCADE, related_name='access_logs')
    action = models.CharField(max_length=100, null=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'access_logs'