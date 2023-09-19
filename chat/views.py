from django.shortcuts import render
from django.http import HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.db import IntegrityError
from django.db.models import Q, Max, Subquery, OuterRef
from django.contrib.auth.models import User
from django.views.decorators.cache import cache_control

from .models import Message

def index(request):
    if request.user.is_authenticated:
        user = request.user

        # Get the contacts based on messages
        # Fetch users who have sent or received messages to/from the logged-in user
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

        if request.method == "POST":
            search_query = request.POST["search_query"]
            users = []
            if search_query:
                users = User.objects.filter(username__icontains=search_query)
            return render(request, "index.html", {'search_query': search_query, 'users': users, 'contacts': contacts, 'user': user})
        else:
            return render(request, "index.html", {'contacts': contacts, 'user': user})
    else:
        return HttpResponseRedirect(reverse("login"))


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

            contact_dict = {
                'username': other_user.username,
                'last_message': message['last_message'].strftime('%Y-%m-%d %H:%M:%S') if message['last_message'] else None,
                'has_unread_messages': has_unread_messages,  # Add a flag for unread messages
            }
            contacts.append(contact_dict)

        # Convert the QuerySet to a list of dictionaries
        contacts_data = []
        for contact in contacts:
            contacts_data.append(contact)

        return JsonResponse({'contacts': contacts_data})

    return JsonResponse({'error': 'Invalid request.'})
    
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

def fetch_messages(request):
    if request.method == 'GET':
        username = request.GET.get('username', None)
        if username:
            # Get the logged-in user
            logged_in_user = request.user

            # Fetch messages between the logged-in user and the selected contact, ordered by timestamp
            messages = Message.objects.filter(
                (Q(sender=logged_in_user, receiver__username=username) | Q(sender__username=username, receiver=logged_in_user))
            ).order_by('timestamp')

            # Serialize messages
            messages_data = [{'content': message.content, 'timestamp': message.timestamp, 'sender': message.sender.username, 'read': message.read} for message in messages]

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
        message = Message(sender=sender_user, receiver=receiver_user, content=message_content)
        message.save()

        # Serialize the message data including the timestamp
        message_data = {
            "content": message.content,
            "timestamp": message.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }

        return JsonResponse({"success": True, "message": message_data})
    else:
        return JsonResponse({"success": False, "error": "Invalid request method"})

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
            # Replace 'desired_username' and 'desired_password' with the actual username and password you want to use.

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
