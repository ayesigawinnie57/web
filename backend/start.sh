#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating superadmin..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(email='majogadgets@admin.com').exists():
    U.objects.create_superuser(email='majogadgets@admin.com', name='Majo Gadgets', password='Majogadgets@2026!')
    print('Superadmin created')
else:
    print('Superadmin already exists')
"

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
