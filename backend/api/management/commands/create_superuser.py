from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile

class Command(BaseCommand):
    help = 'Create a superuser for Django admin'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username for superuser')
        parser.add_argument('--email', type=str, help='Email for superuser')
        parser.add_argument('--password', type=str, help='Password for superuser')

    def handle(self, *args, **options):
        username = options.get('username') or input("Enter username: ")
        email = options.get('email') or input("Enter email: ")
        password = options.get('password') or input("Enter password: ")

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User {username} already exists'))
            return

        user = User.objects.create_superuser(username, email, password)
        UserProfile.objects.get_or_create(user=user)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser {username}')
        )
