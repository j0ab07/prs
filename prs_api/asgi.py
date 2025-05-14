# ASGI config for prs_api project, enabling deployment on ASGI-compatible servers

import os
from django.core.asgi import get_asgi_application

# Set the Django settings module for the ASGI application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prs_api.settings')

# Create the ASGI application callable
application = get_asgi_application()