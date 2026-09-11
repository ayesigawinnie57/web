from django.urls import path
from .views import (
    PlatformSettingsView, DeliverySettingsView,
    DistrictListView, DistrictDetailView,
    AdminUserDetailView, AdminUserCreateView,
)

urlpatterns = [
    path('platform/', PlatformSettingsView.as_view(), name='platform-settings'),
    path('delivery/', DeliverySettingsView.as_view(), name='delivery-settings'),
    path('districts/', DistrictListView.as_view(), name='district-list'),
    path('districts/<int:pk>/', DistrictDetailView.as_view(), name='district-detail'),
]
