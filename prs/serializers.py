# Serializers for prs app models

from rest_framework import serializers
from .models import (
    Individual, CriticalItem, Merchant, MerchantStock, Purchase,
    GovernmentOfficial, VaccinationRecord, AccessLog, UserProfile
)

# Serializer for Individual model
class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = ['prs_id', 'national_identifier', 'date_of_birth', 'created_at']
        read_only_fields = ['prs_id', 'created_at']

# Serializer for UserProfile model
class UserProfileSerializer(serializers.ModelSerializer):
    prs_id = serializers.CharField(source='prs_id.prs_id', read_only=True, allow_null=True)
    merchant_id = serializers.CharField(source='merchant_id.merchant_id', read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['prs_id', 'merchant_id']

# Serializer for CriticalItem model
class CriticalItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriticalItem
        fields = ['item_id', 'name', 'purchase_limit', 'limit_period', 'allowed_purchase_day']
        read_only_fields = ['item_id']

# Serializer for Merchant model
class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = ['merchant_id', 'business_license', 'name', 'address', 'created_at']
        read_only_fields = ['merchant_id', 'created_at']

# Serializer for MerchantStock model
class MerchantStockSerializer(serializers.ModelSerializer):
    merchant = serializers.PrimaryKeyRelatedField(
        queryset=Merchant.objects.all(),
        error_messages={
            'does_not_exist': 'Merchant with ID {pk_value} does not exist.',
            'invalid': 'Merchant ID must be a valid integer.'
        }
    )
    item = serializers.PrimaryKeyRelatedField(
        queryset=CriticalItem.objects.all(),
        error_messages={
            'does_not_exist': 'Critical Item with ID {pk_value} does not exist.',
            'invalid': 'Item ID must be a valid integer.'
        }
    )

    class Meta:
        model = MerchantStock
        fields = ['stock_id', 'merchant', 'item', 'stock_level', 'last_updated']
        read_only_fields = ['stock_id', 'last_updated']

# Serializer for Purchase model
class PurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchase
        fields = ['purchase_id', 'prs_id', 'merchant', 'item', 'quantity', 'purchase_date']
        read_only_fields = ['purchase_id', 'purchase_date']

# Serializer for VaccinationRecord model
class VaccinationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinationRecord
        fields = ['record_id', 'prs_id', 'vaccine_type', 'manufacturer', 'dose_number', 'batch_number', 'vaccination_date', 'administered_by', 'status']
        read_only_fields = ['record_id']

# Serializer for GovernmentOfficial model
class GovernmentOfficialSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    password_hash = serializers.CharField(source='user.password', read_only=True) #insecure

    class Meta:
        model = GovernmentOfficial
        fields = ['official_id', 'username', 'password_hash', 'role', 'created_at']
        read_only_fields = ['official_id', 'created_at']

# Serializer for AccessLog model
class AccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessLog
        fields = ['log_id', 'official', 'action', 'timestamp']
        read_only_fields = ['log_id', 'timestamp']