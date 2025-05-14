# App configuration for prs app

from django.apps import AppConfig

# Define the prs app configuration
class PrsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'  # Default primary key type
    name = 'prs'  # App name