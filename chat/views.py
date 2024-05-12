import base64
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.db import IntegrityError
from django.db.models import Q, Max, Subquery, OuterRef
from django.contrib.auth.models import User
from django.views.decorators.cache import cache_control
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys
from cryptography.fernet import Fernet


from .models import Message, Profile
@login_required
def index(request):
    if request.user.is_authenticated:
        user = request.user

        # Retrieve profile picture if it exists
        profile_picture = None
        try:
            profile = Profile.objects.get(user=request.user)
            if profile.profile_picture:
                profile_picture = profile.profile_picture
        except Profile.DoesNotExist:
            pass

        # Get the contacts based on messages
        contact_users = User.objects.filter(
            Q(sent_messages__receiver=user) | Q(received_messages__sender=user)
        ).distinct()

        # Subquery to get the most recent timestamp for messages with each contact
        most_recent_messages = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values('receiver').annotate(last_message=Max('timestamp'))

        # Get the contacts and order them by the most recent message timestamp
        contacts = (
            contact_users
            .annotate(last_message=Subquery(most_recent_messages.filter(receiver=OuterRef('pk')).values('last_message')))
            .order_by('-last_message')
        )

        # If profile picture exists, encode it to base64
        profile_picture_data = None
        if profile_picture:
            try:
                with profile_picture.open("rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")
                    profile_picture_data = image_data
            except Exception as e:
                # Handle encoding errors gracefully
                print("Error encoding profile picture:", e)
                pass

        # Pass profile picture data to the template if it exists
        context = {'contacts': contacts, 'user': user}
        if profile_picture_data:
            context['profile_picture'] = profile_picture_data

        return render(request, "index.html", context)
    else:
        return HttpResponseRedirect(reverse("login"))

def search_users(request):
    if request.method == "POST":
        user = request.user
        search_query = request.POST.get("search_query")
        users = []

        if search_query:
            users_queryset = User.objects.filter(username__icontains=search_query)

            # Iterate over the queryset to construct user data including profile picture if available
            for user_obj in users_queryset:
                user_data = {'id': user_obj.id,'username': user_obj.username}
                try:
                    profile = Profile.objects.get(user=user_obj)
                    if profile.profile_picture:
                        # Encode the profile picture data to base64
                        user_data['profile_picture'] = base64.b64encode(profile.profile_picture.read()).decode('utf-8')
                except Profile.DoesNotExist:
                    pass
                users.append(user_data)

        return JsonResponse({"search_query": search_query, "users": users})
    else:
        return JsonResponse({"error": "Invalid request method."})

@login_required
@cache_control(no_cache=True, must_revalidate=True, no_store=True)
def fetch_contacts(request):
    if request.method == 'GET':
        current_user = request.user

        # Get the latest message for each user (sender or receiver) involving the current user,
        # ordered by timestamp in descending order
        latest_messages = Message.objects.filter(
            Q(sender=current_user) | Q(receiver=current_user)
        ).values('sender', 'receiver').annotate(last_message=Max('timestamp')).order_by('-last_message')

        # Remove duplicate messages where the sender of one message is the receiver of another and vice versa,
        # keeping only the one with the newest date
        unique_messages = {}
        for message in latest_messages:
            sender_id = message['sender']
            receiver_id = message['receiver']
            other_user_id = sender_id if receiver_id == current_user.id else receiver_id

            if other_user_id not in unique_messages:
                unique_messages[other_user_id] = message
            else:
                existing_message = unique_messages[other_user_id]
                if message['last_message'] > existing_message['last_message']:
                    unique_messages[other_user_id] = message

        # Initialize lists to store contacts
        contacts = []

        # Determine whether the current user is the sender or receiver and compile the contact lists
        for other_user_id, message in unique_messages.items():
            other_user = User.objects.get(id=other_user_id)

            # Check for unread messages from this contact
            has_unread_messages = Message.objects.filter(
                sender=other_user, receiver=current_user, read=False
            ).exists()

            # Check if the contact has a profile picture
            profile_picture_data = None
            try:
                profile = Profile.objects.get(user=other_user)
                if profile.profile_picture:
                    with profile.profile_picture.open("rb") as f:
                        profile_picture_data = base64.b64encode(f.read()).decode("utf-8")
            except Profile.DoesNotExist:
                pass

              # Get the latest message content between the current user and the other user
            latest_message_content = Message.objects.filter(
                (Q(sender=current_user) & Q(receiver=other_user)) |
                (Q(sender=other_user) & Q(receiver=current_user))
            ).order_by('-timestamp').first().content


            contact_dict = {
                'id': other_user_id,
                'username': other_user.username,
                'last_message': decrypt_message(latest_message_content) if latest_message_content else None,
                'has_unread_messages': has_unread_messages,  # Add a flag for unread messages
            }

            # Only include profile picture data if it exists
            if profile_picture_data:
                contact_dict['profile_picture'] = profile_picture_data

            contacts.append(contact_dict)

        # Convert the QuerySet to a list of dictionaries
        contacts_data = []
        for contact in contacts:
            contacts_data.append(contact)

        return JsonResponse({'contacts': contacts_data})

    return JsonResponse({'error': 'Invalid request.'})


def get_user_name(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        user_name = user.username
        return JsonResponse({'user_name': user_name})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    
def mark_messages_as_read(request, contact_username):
    if request.method == 'POST':
        # Use the contact_username parameter instead of POST data
        # Mark messages as read for the clicked contact
        current_user = request.user
        messages_to_mark_as_read = Message.objects.filter(
            sender__username=contact_username,  # Use the contact_username parameter
            receiver=current_user,
            read=False
        )
        messages_to_mark_as_read.update(read=True)

        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Invalid request method.'})


# Generate a key for encryption and decryption
key = Fernet.generate_key()
cipher_suite = Fernet(key)


def encrypt_message(message):
    # Encrypt the message
    cipher_text = cipher_suite.encrypt(message.encode())
    return base64.b64encode(cipher_text).decode()


def decrypt_message(encrypted_message):
    # Decrypt the message
    decrypted_text = cipher_suite.decrypt(base64.b64decode(encrypted_message)).decode()
    return decrypted_text

@login_required
def fetch_messages(request):
    if request.method == 'GET':
        username = request.GET.get('username')
        limit = int(request.GET.get('limit')) 
        offset = int(request.GET.get('offset'))

        if username:
            # Get the logged-in user
            logged_in_user = request.user

                        # Calculate the adjusted offset for descending order
            total_messages_count = Message.objects.filter(
                (Q(sender=logged_in_user, receiver__username=username) | Q(sender__username=username, receiver=logged_in_user))
            ).count()

            # Fetch messages between the logged-in user and the selected contact, ordered by timestamp
            messages = Message.objects.filter(
                (Q(sender=logged_in_user, receiver__username=username) | Q(sender__username=username, receiver=logged_in_user))
            ).order_by('timestamp')[max(total_messages_count-(offset+limit),0):total_messages_count]


            # Serialize messages
            messages_data = [{'content': decrypt_message(message.content), 'timestamp': message.timestamp, 'sender': message.sender.username, 'read': message.read} for message in messages]
            return JsonResponse({'messages': messages_data})

    return JsonResponse({'error': 'Invalid request.'})

def send_message(request):
    if request.method == "POST":
        sender_user = request.user
        receiver_username = request.POST.get("receiver")
        message_content = request.POST.get("message")

        # Fetch the receiver user
        receiver_user = User.objects.get(username=receiver_username)

        # Create and save the message with sender and receiver
        message = Message(sender=sender_user, receiver=receiver_user, content=encrypt_message(message_content))
        message.save()

        # Serialize the message data including the timestamp
        message_data = {
            "content": encrypt_message(message_content),
            "decrypted_content": message_content,
            "timestamp": message.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }

        return JsonResponse({"success": True, "message": message_data})
    else:
        return JsonResponse({"success": False, "error": "Invalid request method"})

def update_profile(request):
    if request.method == 'POST':
        new_username = request.POST.get('new_username')
        profile_picture = request.FILES.get('profile_picture')

        # Check if new username is provided
        if new_username:
            # Check if the new username already exists
            if User.objects.filter(username=new_username).exclude(pk=request.user.pk).exists():
                return JsonResponse({"success": False, "message": "Username already exists"})

            # Update username
            request.user.username = new_username
            request.user.save()

            # Check if there's an associated profile and update its username
            try:
                profile = Profile.objects.get(user=request.user)
                profile.user.username = new_username
                profile.user.save()
            except Profile.DoesNotExist:
                pass

        # Initialize profile picture data
        profile_picture_data = None

        # Update profile picture
        if profile_picture:
            # Process the uploaded image
            img = Image.open(profile_picture)

            # Convert image to RGB mode if it's RGBA
            if img.mode == 'RGBA':
                img = img.convert('RGB')

            # Resize the image to maximum dimensions of 300x300
            img.thumbnail((300, 300))

            # Create a BytesIO object to hold the image data
            output_buffer = BytesIO()

            # Save the resized image to the BytesIO buffer with reduced quality
            img.save(output_buffer, format='JPEG', quality=30)

            # Move the pointer to the beginning of the buffer
            output_buffer.seek(0)

            # Save the image from the buffer to a new InMemoryUploadedFile object
            profile_picture = InMemoryUploadedFile(
                output_buffer,
                'ImageField',  # Field name
                "%s.jpg" % profile_picture.name.split('.')[0],  # File name
                'image/jpeg',  # Content type
                sys.getsizeof(output_buffer),  # File size
                None
            )

            # Update or create the profile with the new information
            try:
                profile = Profile.objects.get(user=request.user)
                profile.profile_picture = profile_picture
                profile.save()
            except Profile.DoesNotExist:
                profile = Profile.objects.create(user=request.user, profile_picture=profile_picture)

            # Encode the updated profile picture to base64 for response
            with profile_picture.open("rb") as f:
                profile_picture_data = base64.b64encode(f.read()).decode("utf-8")

        else:
            # Check if the user already has a profile picture
            try:
                profile = Profile.objects.get(user=request.user)
                if profile.profile_picture:
                    # Encode the existing profile picture to base64 for response
                    with profile.profile_picture.open("rb") as f:
                        profile_picture_data = base64.b64encode(f.read()).decode("utf-8")
            except Profile.DoesNotExist:
                pass

        # Prepare JSON response
        response_data = {"success": True, "username": request.user.username}

        # If profile picture data exists, include it in the response
        if profile_picture_data:
            response_data["profile_picture"] = profile_picture_data

        return JsonResponse(response_data)

    else:
        return JsonResponse({'error': 'Invalid request method'})

def remove_profile_picture(request):
    if request.method == 'POST':
        username = request.POST.get('username')

        try:
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)

            # Delete the profile picture from the database
            profile.profile_picture.delete()

            # Update the profile picture field in the Profile model
            profile.profile_picture = None
            profile.save()

            return JsonResponse({'success': True})
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
        except Profile.DoesNotExist:
            return JsonResponse({'error': 'Profile not found.'}, status=404)
    else:
        return JsonResponse({'error': 'Invalid request.'}, status=400)


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "register.html", {
                "message": "Confirmation passwords does not match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, username, password)
            user.save()
        except IntegrityError as e:
            print(e)
            return render(request, "register.html", {
                "message": "Username already exists."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "register.html")
