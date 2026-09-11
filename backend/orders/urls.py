from django.urls import path
from .views import (
    OrderListCreateView, OrderDetailView, OrderCancelView, ServiceRatingView,
    AdminOrderListView, AdminOrderDetailView, AdminOrderConfirmView, AdminOrderCancelView,
    AdminOrderShipView, AdminOrderDeliverView,
    InitiatePaymentView, PesapalIPNView, AdminPaymentsView,
)

urlpatterns = [
    path('', OrderListCreateView.as_view(), name='order-list'),
    path('admin/', AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/payments/', AdminPaymentsView.as_view(), name='admin-payments'),
    path('admin/<str:code>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('admin/<str:code>/confirm/', AdminOrderConfirmView.as_view(), name='admin-order-confirm'),
    path('admin/<str:code>/cancel/', AdminOrderCancelView.as_view(), name='admin-order-cancel'),
    path('admin/<str:code>/ship/', AdminOrderShipView.as_view(), name='admin-order-ship'),
    path('admin/<str:code>/deliver/', AdminOrderDeliverView.as_view(), name='admin-order-deliver'),
    path('pesapal/ipn/', PesapalIPNView.as_view(), name='pesapal-ipn'),
    path('<str:code>/', OrderDetailView.as_view(), name='order-detail'),
    path('<str:code>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<str:code>/pay/', InitiatePaymentView.as_view(), name='order-pay'),
    path('<str:code>/rate/', ServiceRatingView.as_view(), name='order-rate'),
]
