# URL configuration for prs_api project

from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# URL patterns for the project
urlpatterns = [
    path('admin/', admin.site.urls),  # Django admin interface
    path('api/v1/', include('prs.urls')),  # API routes from prs app
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # JWT token generation
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # JWT token refresh
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),  # API schema endpoint
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),  # Swagger UI for API docs
    path('', TemplateView.as_view(template_name='index.html'), name='home'),  # Frontend index page
]