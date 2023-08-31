from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class CustomUser(AbstractUser):
    contacts = models.ManyToManyField('self', blank=True)

    groups = None
    user_permissions = None

    class Meta:
        db_table = 'custom_user'

class Message(models.Model):
    sender = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

@receiver(post_save, sender=Message)
def update_contacts(sender, instance, **kwargs):
    sender = instance.sender
    receiver = instance.receiver

    # Add sender to receiver's contacts and vice versa
    receiver.contacts.add(sender)
    sender.contacts.add(receiver)

# Connect the signal handler function to the post_save signal for the Message model
post_save.connect(update_contacts, sender=Message)
