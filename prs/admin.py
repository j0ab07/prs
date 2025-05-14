# Admin configuration for prs app

from django.contrib import admin
from .models import (Individual, GovernmentOfficial, Merchant, CriticalItem,
                     MerchantStock, Purchase, VaccinationRecord, AccessLog)

# Register models with Django admin interface
admin.site.register(Individual)
admin.site.register(GovernmentOfficial)
admin.site.register(Merchant)
admin.site.register(CriticalItem)
admin.site.register(MerchantStock)
admin.site.register(Purchase)
admin.site.register(VaccinationRecord)
admin.site.register(AccessLog)