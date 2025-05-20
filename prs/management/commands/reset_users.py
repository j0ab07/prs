from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from prs.models import GovernmentOfficial, UserProfile, Individual, Merchant, MerchantStock, Purchase, VaccinationRecord, AccessLog

class Command(BaseCommand):
    help = 'Resets all Government Officials, Merchants, and Public users, along with their associated data.'

    def handle(self, *args, **kwargs):
        try:
            self.stdout.write("Starting user reset process...")

            # Step 1: Delete related records to avoid foreign key constraints
            self.stdout.write("Deleting related records...")
            AccessLog.objects.all().delete()  # Delete access logs first
            MerchantStock.objects.all().delete()  # Delete merchant stock
            Purchase.objects.all().delete()  # Delete purchases
            VaccinationRecord.objects.all().delete()  # Delete vaccination records

            # Step 2: Delete core records
            self.stdout.write("Deleting core records...")
            GovernmentOfficial.objects.all().delete()  # Delete government officials
            UserProfile.objects.all().delete()  # Delete user profiles
            Individual.objects.all().delete()  # Delete individuals
            Merchant.objects.all().delete()  # Delete merchants

            # Step 3: Delete all users except superusers (to preserve admin access)
            self.stdout.write("Deleting users (preserving superusers)...")
            users = User.objects.filter(is_superuser=False)
            user_count = users.count()
            users.delete()

            # Step 4: Log the result
            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {user_count} users and their associated data."))

            # Optional: Create a default admin user if no superusers exist
            if not User.objects.filter(is_superuser=True).exists():
                self.stdout.write("No superusers found. Creating a default admin user...")
                User.objects.create_superuser(
                    username='admin',
                    password='admin123',
                    email='admin@example.com'
                )
                self.stdout.write(self.style.SUCCESS("Created default admin user: username='admin', password='admin123'"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during reset: {str(e)}"))