from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.db import IntegrityError
from django.db.models import Q, Max, Subquery, OuterRef


from .models import CustomUser, Message

def index(request):
    if request.user.is_authenticated:
        user = request.user

        # Subquery to get the most recent timestamp for messages with each contact
        most_recent_messages = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values('receiver').annotate(last_message=Max('timestamp'))

        # Get the contacts and order them by the most recent message timestamp
        contacts = (
            user.contacts.all()
            .annotate(last_message=Subquery(most_recent_messages.filter(receiver=OuterRef('pk')).values('last_message')))
            .order_by('-last_message')
        )

        if request.method == "POST":
            search_query = request.POST["search_query"]
            users = []
            if search_query:
                users = CustomUser.objects.filter(username__icontains=search_query)
            return render(request, "index.html", {'search_query': search_query, 'users': users, 'contacts': contacts, 'user': user})
        else:
            return render(request, "index.html", {'contacts': contacts, 'user': user})
    else:
        return HttpResponseRedirect(reverse("login"))

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
            messages_data = [{'content': message.content, 'timestamp': message.timestamp} for message in messages]

            return JsonResponse({'messages': messages_data})

    return JsonResponse({'error': 'Invalid request.'})

def send_message(request):
    if request.method == "POST":
        sender_user = request.user
        receiver_username = request.POST.get("receiver")
        message_content = request.POST.get("message")

        # Fetch the receiver user
        receiver_user = CustomUser.objects.get(username=receiver_username)

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
            user = CustomUser.objects.create_user(username, username, password)
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
