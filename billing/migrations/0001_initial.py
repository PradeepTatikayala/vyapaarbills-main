from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Shop",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("shop_type", models.CharField(choices=[("general", "General Store"), ("readymade", "Readymade Shop")], max_length=20)),
                ("address", models.TextField()),
                ("gst_number", models.CharField(max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="Item",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("shop_type", models.CharField(choices=[("general", "General Store"), ("readymade", "Readymade Shop")], max_length=20)),
                ("name", models.CharField(max_length=180)),
                ("mrp", models.DecimalField(decimal_places=2, max_digits=12)),
                ("gst_percent", models.DecimalField(decimal_places=2, max_digits=5)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="GenerationRun",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month", models.DateField()),
                ("target_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("generated_amount", models.DecimalField(decimal_places=2, default="0.00", max_digits=14)),
                ("remaining_amount", models.DecimalField(decimal_places=2, default="0.00", max_digits=14)),
                ("bills_per_day", models.PositiveIntegerField(default=6)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generation_runs", to="billing.shop")),
            ],
        ),
        migrations.CreateModel(
            name="Bill",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bill_no", models.CharField(max_length=32, unique=True)),
                ("customer_name", models.CharField(max_length=120)),
                ("bill_date", models.DateField()),
                ("taxable_value", models.DecimalField(decimal_places=2, max_digits=14)),
                ("cgst_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("sgst_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("total_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("generation_run", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bills", to="billing.generationrun")),
            ],
            options={"ordering": ["bill_date", "bill_no"]},
        ),
        migrations.CreateModel(
            name="BillLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_name", models.CharField(max_length=180)),
                ("quantity", models.PositiveIntegerField()),
                ("unit_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("gst_percent", models.DecimalField(decimal_places=2, max_digits=5)),
                ("taxable_value", models.DecimalField(decimal_places=2, max_digits=14)),
                ("cgst_rate", models.DecimalField(decimal_places=2, max_digits=5)),
                ("cgst_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("sgst_rate", models.DecimalField(decimal_places=2, max_digits=5)),
                ("sgst_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("total_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("bill", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="billing.bill")),
            ],
        ),
    ]
