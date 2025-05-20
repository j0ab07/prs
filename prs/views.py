# Views for prs app API endpoints

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import transaction
from .models import (
    Individual, CriticalItem, Merchant, MerchantStock, Purchase,
    GovernmentOfficial, VaccinationRecord, AccessLog, UserProfile
)
from .serializers import (
    IndividualSerializer, CriticalItemSerializer, MerchantSerializer,
    MerchantStockSerializer, PurchaseSerializer, VaccinationRecordSerializer,
    GovernmentOfficialSerializer, AccessLogSerializer, UserProfileSerializer
)
from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.db.models import Sum
import pytz

# Custom permission class for role-based access
class RoleBasedPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'
            if hasattr(request.user, 'profile') and hasattr(request.user.profile, 'merchant_id') and request.user.profile.merchant_id:
                role = 'merchant'

        if view.basename == 'government-officials':
            # Allow Government and Merchant to view their own role
            return role in ['government', 'merchant']
        elif view.basename == 'critical-items':
            if request.method in ['GET']:
                return role in ['public', 'merchant', 'government']
            return role == 'government'
        elif view.basename == 'individuals':
            if role == 'public':
                return view.action in ['list', 'retrieve', 'create', 'partial_update']
            return role == 'government'
        elif view.basename == 'merchants':
            if request.method in ['GET']:
                return role in ['public', 'merchant', 'government']
            if role == 'merchant':
                return view.action in ['create', 'partial_update']
            return role == 'government'
        elif view.basename == 'merchant-stock':
            if request.method in ['GET']:
                return role in ['public', 'merchant', 'government']
            if role == 'merchant':
                if view.action in ['create', 'partial_update']:
                    if view.action == 'create':
                        merchant_id = request.data.get('merchant')
                        if not merchant_id:
                            return False
                        try:
                            user_profile = request.user.profile
                        except User.profile.RelatedObjectDoesNotExist:
                            return False
                        if not user_profile.merchant_id:
                            return False
                        if str(merchant_id) != str(user_profile.merchant_id.merchant_id):
                            return False
                        return True
                    return True
                return False
            return role == 'government'
        elif view.basename == 'purchases':
            if role == 'public':
                if view.action in ['list', 'retrieve']:
                    return True
                if view.action == 'create':
                    merchant_id = request.data.get('merchant')
                    if not merchant_id:
                        return False
                    return True
                return False
            if role == 'merchant':
                if view.action in ['list', 'retrieve', 'create', 'partial_update']:
                    if view.action == 'create':
                        merchant_id = request.data.get('merchant')
                        if not merchant_id:
                            return False
                        try:
                            user_profile = request.user.profile
                        except User.profile.RelatedObjectDoesNotExist:
                            return False
                        if not user_profile.merchant_id:
                            return False
                        if str(merchant_id) != str(user_profile.merchant_id.merchant_id):
                            return False
                        return True
                    return True
                return False
            return role == 'government'
        elif view.basename == 'vaccination-records':
            if role == 'public':
                if view.action in ['list', 'retrieve']:
                    return True
                if view.action in ['upload', 'upload_record']:
                    try:
                        user_profile = request.user.profile
                    except User.profile.RelatedObjectDoesNotExist:
                        return False
                    if not user_profile.prs_id:
                        return False
                    prs_id = request.data.get('prs_id')
                    if not prs_id:
                        return False
                    if str(prs_id) != str(user_profile.prs_id.prs_id):
                        return False
                    return True
                return False
            return role == 'government'
        elif view.basename == 'access-logs':
            return role == 'government'
        return False

# User registration endpoint
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    role = request.data.get('role', 'public')

    if not username or not password:
        return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if role not in ['public', 'government', 'merchant']:
        return Response({"error": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            user_profile = UserProfile.objects.create(user=user)

            if role in ['government', 'merchant']:
                # Ensure no duplicate GovernmentOfficial exists
                if GovernmentOfficial.objects.filter(user=user).exists():
                    return Response({"error": "User already has a government or merchant role"}, status=status.HTTP_400_BAD_REQUEST)
                GovernmentOfficial.objects.create(user=user, role=role)
                # If merchant, create a Merchant record and link to UserProfile
                if role == 'merchant':
                    merchant_data = {
                        'business_license': f'BL-{username}',  # Placeholder, adjust as needed
                        'name': username,
                        'address': 'Default Address'  # Placeholder, adjust as needed
                    }
                    merchant_serializer = MerchantSerializer(data=merchant_data)
                    merchant_serializer.is_valid(raise_exception=True)
                    merchant = merchant_serializer.save()
                    user_profile.merchant_id = merchant
                    user_profile.save()

        return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": f"Failed to register user: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Viewset for Individual model
class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def create(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'public':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                user_profile = UserProfile.objects.create(user=request.user)

            if user_profile.prs_id:
                return Response(
                    {"error": "You have already created an individual record. You cannot create another."},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        if role == 'public':
            user_profile.prs_id = Individual.objects.get(prs_id=serializer.data['prs_id'])
            user_profile.save()

        if role == 'government':
            AccessLog.objects.create(
                official=official,
                action=f'Created Individual {serializer.data["prs_id"]}'
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        instance = self.get_object()

        if role == 'public':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                user_profile = UserProfile.objects.create(user=request.user)

            if not user_profile.prs_id or user_profile.prs_id.prs_id != instance.prs_id:
                return Response(
                    {"error": "You can only update your own individual record"},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif role != 'government':
            return Response(
                {"error": "Only government officials or the individual themselves can update records"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Updated Individual {instance.prs_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can delete individuals"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can delete individuals"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        self.perform_destroy(instance)

        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Deleted Individual {instance.prs_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)

# View for user profile
class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            serializer = UserProfileSerializer(user_profile)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response({"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)

# Viewset for CriticalItem model
class CriticalItemViewSet(viewsets.ModelViewSet):
    queryset = CriticalItem.objects.all()
    serializer_class = CriticalItemSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get_queryset(self):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                return CriticalItem.objects.all()
        except GovernmentOfficial.DoesNotExist:
            pass
        return CriticalItem.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can add critical items"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can add critical items"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can delete critical items"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can delete critical items"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        return super().destroy(request, *args, **kwargs)

# Viewset for Merchant model
class MerchantViewSet(viewsets.ModelViewSet):
    queryset = Merchant.objects.all()
    serializer_class = MerchantSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get_queryset(self):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'merchant':
            try:
                user_profile = self.request.user.profile
                if user_profile.merchant_id:
                    return Merchant.objects.filter(merchant_id=user_profile.merchant_id.merchant_id)
                else:
                    return Merchant.objects.none()
            except UserProfile.DoesNotExist:
                return Merchant.objects.none()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'merchant':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                user_profile = UserProfile.objects.create(user=request.user)

            if user_profile.merchant_id:
                return Response(
                    {"error": "You have already created a merchant record. You cannot create another."},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            try:
                user_profile.merchant_id = Merchant.objects.get(merchant_id=serializer.data['merchant_id'])
                user_profile.save()
            except Merchant.DoesNotExist:
                return Response(
                    {"error": "Failed to associate merchant record with user profile"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            if role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Created Merchant {serializer.data["merchant_id"]}'
                )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        instance = self.get_object()

        if role == 'merchant':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                return Response(
                    {"error": "User profile not found"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not user_profile.merchant_id or user_profile.merchant_id.merchant_id != instance.merchant_id:
                return Response(
                    {"error": "You can only update your own merchant record"},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif role != 'government':
            return Response(
                {"error": "Only government officials or the merchant themselves can update records"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if role == 'government':
            AccessLog.objects.create(
                official=official,
                action=f'Updated Merchant {instance.merchant_id}'
            )

        return Response(serializer.data)

# Viewset for MerchantStock model
class MerchantStockViewSet(viewsets.ModelViewSet):
    queryset = MerchantStock.objects.all()
    serializer_class = MerchantStockSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get_queryset(self):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'merchant':
            try:
                user_profile = self.request.user.profile
                if user_profile.merchant_id:
                    return MerchantStock.objects.filter(merchant=user_profile.merchant_id)
                else:
                    return MerchantStock.objects.none()
            except UserProfile.DoesNotExist:
                return MerchantStock.objects.none()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'merchant':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                return Response(
                    {"error": "User profile not found"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not user_profile.merchant_id:
                return Response(
                    {"error": "You must create a merchant record first"},
                    status=status.HTTP_403_FORBIDDEN
                )

            merchant_id = serializer.validated_data['merchant'].merchant_id
            if merchant_id != user_profile.merchant_id.merchant_id:
                return Response(
                    {"error": "You can only create stock records for your own merchant"},
                    status=status.HTTP_403_FORBIDDEN
                )

        self.perform_create(serializer)

        if role == 'government':
            AccessLog.objects.create(
                official=official,
                action=f'Created Merchant Stock {serializer.data["stock_id"]}'
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        instance = self.get_object()

        if role == 'merchant':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                return Response(
                    {"error": "User profile not found"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not user_profile.merchant_id:
                return Response(
                    {"error": "You must create a merchant record first"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if instance.merchant.merchant_id != user_profile.merchant_id.merchant_id:
                return Response(
                    {"error": "You can only update your own merchant stock"},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Updated Merchant Stock {instance.stock_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can delete merchant stock"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can delete merchant stock"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        self.perform_destroy(instance)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Deleted Merchant Stock {instance.stock_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)

# Viewset for Purchase model
class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [RoleBasedPermission]

    def get_queryset(self):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        if role == 'public':
            try:
                user_profile = self.request.user.profile
                if user_profile.prs_id:
                    return Purchase.objects.filter(prs_id=user_profile.prs_id)
                return Purchase.objects.none()
            except UserProfile.DoesNotExist:
                return Purchase.objects.none()
        if role == 'merchant':
            try:
                user_profile = self.request.user.profile
                if user_profile.merchant_id:
                    return Purchase.objects.filter(merchant=user_profile.merchant_id)
                return Purchase.objects.none()
            except UserProfile.DoesNotExist:
                return Purchase.objects.none()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = serializer.validated_data['item']
        prs_id = serializer.validated_data['prs_id']
        quantity = serializer.validated_data['quantity']

        restriction = CriticalItem.objects.get(item_id=item.item_id)

        if restriction.limit_period == 'weekly':
            start_date = datetime.now(pytz.UTC) - timedelta(days=7)
            total_purchased = Purchase.objects.filter(
                prs_id=prs_id,
                item=item,
                purchase_date__gte=start_date
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0

            if total_purchased + quantity > restriction.purchase_limit:
                return Response(
                    {"error": f"Purchase limit exceeded: {restriction.purchase_limit} {item.name} per week"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif restriction.limit_period == 'daily':
            start_date = datetime.now(pytz.UTC).replace(hour=0, minute=0, second=0, microsecond=0)
            total_purchased = Purchase.objects.filter(
                prs_id=prs_id,
                item=item,
                purchase_date__gte=start_date
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0

            if total_purchased + quantity > restriction.purchase_limit:
                return Response(
                    {"error": f"Purchase limit exceeded: {restriction.purchase_limit} {item.name} per day"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if restriction.allowed_purchase_day:
            current_day = datetime.now(pytz.UTC).strftime('%A').lower()
            if current_day != restriction.allowed_purchase_day.lower():
                return Response(
                    {"error": f"Purchases for {item.name} only allowed on {restriction.allowed_purchase_day}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        self.perform_create(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Created Purchase {serializer.data["purchase_id"]}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response({
            "purchase_id": serializer.data["purchase_id"],
            "message": "Purchase recorded successfully"
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            role = official.role
        except GovernmentOfficial.DoesNotExist:
            role = 'public'

        instance = self.get_object()

        if role == 'merchant':
            try:
                user_profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist:
                return Response(
                    {"error": "User profile not found"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not user_profile.merchant_id:
                return Response(
                    {"error": "You must have a merchant record to update purchases"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if instance.merchant.merchant_id != user_profile.merchant_id.merchant_id:
                return Response(
                    {"error": "You can only update your own purchases"},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif role != 'government':
            return Response(
                {"error": "Only government officials or the merchant themselves can update purchases"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Updated Purchase {instance.purchase_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can delete purchases"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can delete purchases"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        self.perform_destroy(instance)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Deleted Purchase {instance.purchase_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)

# Viewset for VaccinationRecord model
class VaccinationRecordViewSet(viewsets.ModelViewSet):
    queryset = VaccinationRecord.objects.all()
    serializer_class = VaccinationRecordSerializer
    permission_classes = [RoleBasedPermission]

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_record(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        self.perform_create(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Uploaded VaccinationRecord {serializer.data["record_id"]}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response({
            "record_id": serializer.data["record_id"],
            "message": "Vaccination record uploaded successfully"
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can update vaccination records"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can update vaccination records"},
                    status=status.HTTP_403_FORBIDDEN
                )

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Updated VaccinationRecord {serializer.data["record_id"]}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role != 'government':
                return Response(
                    {"error": "Only government officials can delete vaccination records"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except GovernmentOfficial.DoesNotExist:
            return Response(
                {"error": "Only government officials can delete vaccination records"},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        self.perform_destroy(instance)

        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                AccessLog.objects.create(
                    official=official,
                    action=f'Deleted VaccinationRecord {instance.record_id}'
                )
        except GovernmentOfficial.DoesNotExist:
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)

# Viewset for GovernmentOfficial model
class GovernmentOfficialViewSet(viewsets.ModelViewSet):
    serializer_class = GovernmentOfficialSerializer
    permission_classes = [RoleBasedPermission]

    def get_queryset(self):
        try:
            official = GovernmentOfficial.objects.get(user=self.request.user)
            if official.role == 'government':
                return GovernmentOfficial.objects.all()
            return GovernmentOfficial.objects.none() 
        except GovernmentOfficial.DoesNotExist:
            return GovernmentOfficial.objects.none()

# Viewset for AccessLog model
class AccessLogViewSet(viewsets.ModelViewSet):
    queryset = AccessLog.objects.all()
    serializer_class = AccessLogSerializer
    permission_classes = [RoleBasedPermission]