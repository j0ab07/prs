from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('prs', '0004_alter_individual_options_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='individual',
            options={'ordering': ['prs_id']},
        ),
    ]