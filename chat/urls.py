from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path('fetch_messages/', views.fetch_messages, name='fetch_messages'),
    path('fetch_contacts/', views.fetch_contacts, name='fetch_contacts'),
    path('send_message/', views.send_message, name='send_message'),
]