from django.contrib import admin
from .models import Message, CustomUser


# Register your models here.
admin.site.register(CustomUser)
admin.site.register(Message)