from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.db import IntegrityError
# from django.contrib.auth.models import User

from .models import CustomUser


# Create your views here.
def index(request):
    if request.user.is_authenticated:
        user = request.user
        contacts = user.contacts.all()
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
