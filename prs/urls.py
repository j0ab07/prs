# URL configuration for prs app

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IndividualViewSet, CriticalItemViewSet, MerchantViewSet,
    MerchantStockViewSet, PurchaseViewSet, VaccinationRecordViewSet,
    GovernmentOfficialViewSet, AccessLogViewSet, register_user, UserProfileView
)

# Initialize DRF router
router = DefaultRouter()
# Register viewsets with router
router.register(r'individuals', IndividualViewSet, basename='individuals')
router.register(r'critical-items', CriticalItemViewSet, basename='critical-items')
router.register(r'merchants', MerchantViewSet, basename='merchants')
router.register(r'merchant-stock', MerchantStockViewSet, basename='merchant-stock')
router.register(r'purchases', PurchaseViewSet, basename='purchases')
router.register(r'vaccination-records', VaccinationRecordViewSet, basename='vaccination-records')
router.register(r'government-officials', GovernmentOfficialViewSet, basename='government-officials')
router.register(r'access-logs', AccessLogViewSet, basename='access-logs')

# Define URL patterns
urlpatterns = [
    path('', include(router.urls)),  # Include router-generated URLs
    path('register/', register_user, name='register_user'),  # User registration endpoint
    path('user-profile/', UserProfileView.as_view(), name='user-profile'),  # User profile endpoint
]