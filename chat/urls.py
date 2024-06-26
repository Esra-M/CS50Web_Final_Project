from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path('search_users/', views.search_users, name='search_users'),
    path('fetch_messages/', views.fetch_messages, name='fetch_messages'),
    path('fetch_contacts/', views.fetch_contacts, name='fetch_contacts'),
    path('send_message/', views.send_message, name='send_message'),
    path('mark_messages_as_read/<str:contact_username>/', views.mark_messages_as_read, name='mark_messages_as_read'),
    path('update_profile/', views.update_profile, name='update_profile'),
    path('remove_profile_picture/', views.remove_profile_picture, name='remove_profile_picture'),
    path('get_user_name/<int:user_id>/', views.get_user_name, name='get_user_name'),
]