# artisans/management/commands/populate_data.py
from django.core.management.base import BaseCommand
from artisans.models import Region, CraftType

class Command(BaseCommand):
    help = 'Populates initial regions and craft types'

    def handle(self, *args, **kwargs):
        regions = [
            {'name': 'Afrique de l\'Ouest', 'slug': 'west'},
            {'name': 'Afrique du Nord', 'slug': 'north'},
            {'name': 'Afrique de l\'Est', 'slug': 'east'},
            {'name': 'Afrique Centrale', 'slug': 'central'},
            {'name': 'Afrique Australe', 'slug': 'south'},
        ]
        craft_types = [
            {'name': 'Textile', 'slug': 'textile'},
            {'name': 'Poterie', 'slug': 'pottery'},
            {'name': 'Bijouterie', 'slug': 'jewelry'},
            {'name': 'Sculpture sur bois', 'slug': 'woodwork'},
            {'name': 'Travail du cuir', 'slug': 'leather'},
            {'name': 'Vannerie', 'slug': 'basket'},
        ]

        for region in regions:
            Region.objects.get_or_create(**region)
            self.stdout.write(self.style.SUCCESS(f"Created region: {region['name']}"))

        for craft in craft_types:
            CraftType.objects.get_or_create(**craft)
            self.stdout.write(self.style.SUCCESS(f"Created craft type: {craft['name']}"))