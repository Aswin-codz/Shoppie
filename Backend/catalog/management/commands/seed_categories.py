import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from catalog.models import Category


class Command(BaseCommand):
    help = 'Seeds categories from a JSON file. Expected format: [{"name": "Electronics", "description": "...", "children": [{"name": "Phones", ...}]}]'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file containing categories')

    def handle(self, *args, **kwargs):
        json_file = kwargs['json_file']

        if not os.path.exists(json_file):
            raise CommandError(f'File "{json_file}" does not exist.')

        with open(json_file, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                raise CommandError(f'Invalid JSON file: {e}')

        if not isinstance(data, list):
            raise CommandError('Root of JSON must be a list of categories.')

        with transaction.atomic():
            self._process_categories(data, parent=None)

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded categories from {json_file}'))

    def _process_categories(self, categories_data, parent):
        for cat_data in categories_data:
            name = cat_data.get('name')
            if not name:
                self.stderr.write(self.style.WARNING('Skipping category without a name.'))
                continue

            description = cat_data.get('description', '')
            
            # Use get_or_create to ensure idempotency.
            # Uniqueness is normally checked by slug, but here we search by name and parent.
            category, created = Category.objects.get_or_create(
                name=name,
                parent=parent,
                defaults={'description': description, 'is_active': True}
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {name}'))
            else:
                self.stdout.write(f'Category already exists: {name}')

            children = cat_data.get('children', [])
            if children:
                self._process_categories(children, parent=category)
