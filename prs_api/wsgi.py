# WSGI config for prs_api project, enabling deployment on WSGI-compatible servers

import os
from django.core.wsgi import get_wsgi_application

# Set the Django settings module for the WSGI application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prs_api.settings')

# Create the WSGI application callable
application = get_wsgi_application()