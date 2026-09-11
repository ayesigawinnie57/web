from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.core.cache import cache
from django.db import transaction
from .models import Order, ServiceRating, Payment
from .serializers import OrderSerializer, ServiceRatingSerializer, PaymentSerializer
import requests as http_requests
import logging

logger = logging.getLogger(__name__)

PAYMENT_RATE_LIMIT = 5
PAYMENT_RATE_WINDOW = 60


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items__product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'code'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items__product')


class OrderCancelView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response(
                {'detail': 'Only pending orders can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order).data)


class ServiceRatingView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'delivered':
            return Response({'detail': 'Only delivered orders can be rated.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(order, 'service_rating'):
            return Response({'detail': 'You have already rated this order.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ServiceRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(order=order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Admin views ──────────────────────────────────────────────────────────────

class AdminOrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAdminUser,)
    lookup_field = 'code'

    def get_queryset(self):
        return Order.objects.prefetch_related('items__product')


class AdminOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAdminUser,)

    def get_queryset(self):
        qs = Order.objects.prefetch_related('items__product').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminOrderConfirmView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response({'detail': 'Only pending orders can be confirmed.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'processing'
        order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order).data)


class AdminOrderCancelView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status == 'delivered':
            return Response({'detail': 'Delivered orders cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status == 'cancelled':
            return Response({'detail': 'Order is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'A cancellation reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'cancelled'
        order.cancel_reason = reason
        order.save(update_fields=['status', 'cancel_reason', 'updated_at'])
        return Response(OrderSerializer(order).data)


class AdminOrderShipView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'processing':
            return Response({'detail': 'Only confirmed orders can be marked as shipped.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'shipped'
        order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order).data)


class AdminOrderDeliverView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, code):
        try:
            order = Order.objects.get(code=code)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'shipped':
            return Response({'detail': 'Only shipped orders can be marked as delivered.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'delivered'
        order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order).data)



# ── Pesapal Payment views ─────────────────────────────────────────────────────

def _pesapal_token():
    """Get a Pesapal OAuth token."""
    resp = http_requests.post(
        f"{settings.PESAPAL_BASE_URL}/api/Auth/RequestToken",
        json={'consumer_key': settings.PESAPAL_CONSUMER_KEY, 'consumer_secret': settings.PESAPAL_CONSUMER_SECRET},
        headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['token']


def _register_ipn(token):
    """Register IPN URL with Pesapal (idempotent — returns existing if already registered)."""
    resp = http_requests.post(
        f"{settings.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN",
        json={'url': settings.PESAPAL_IPN_URL, 'ipn_notification_type': 'GET'},
        headers={'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['ipn_id']


class InitiatePaymentView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @method_decorator(never_cache)
    def post(self, request, code):
        # Rate limit: max 5 payment attempts per user per minute
        rate_key = f'pay_attempt_{request.user.id}'
        attempts = cache.get(rate_key, 0)
        if attempts >= PAYMENT_RATE_LIMIT:
            logger.warning('Rate limit hit for payment: user=%s', request.user.email)
            return Response({'detail': 'Too many payment attempts. Please wait a minute.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        cache.set(rate_key, attempts + 1, PAYMENT_RATE_WINDOW)

        # Lock the order row to prevent duplicate concurrent payment sessions
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().select_related('payment').get(code=code, user=request.user)
            except Order.DoesNotExist:
                return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Prevent re-paying a completed order
            if hasattr(order, 'payment') and order.payment.status == 'completed':
                return Response({'detail': 'Order already paid.'}, status=status.HTTP_400_BAD_REQUEST)

            # Only allow payment for pending/processing orders
            if order.status not in ('pending', 'processing'):
                return Response({'detail': 'This order cannot be paid.'}, status=status.HTTP_400_BAD_REQUEST)

            # Mark that a payment session is being created so concurrent requests are blocked
            # We create the Payment record with status=pending BEFORE calling Pesapal
            # so a second concurrent request hits the unique constraint and fails cleanly
            existing_payment = getattr(order, 'payment', None)
            if existing_payment and existing_payment.status == 'pending':
                # Already has a pending session — reuse the existing redirect rather than creating a duplicate
                logger.info('Reusing existing pending payment session for order=%s user=%s', order.code, request.user.email)
                # Fall through to call Pesapal again to get a fresh redirect_url for this session

        try:
            token = _pesapal_token()
            ipn_id = _register_ipn(token)

            # Amount always comes from the DB — never from the request body
            payload = {
                'id': order.code,
                'currency': 'UGX',
                'amount': float(order.total),
                'description': f'Payment for order {order.code}',
                'callback_url': settings.PESAPAL_CALLBACK_URL,
                'notification_id': ipn_id,
                'billing_address': {
                    'email_address': request.user.email,
                    'phone_number': order.phone or request.user.phone,
                    'first_name': request.user.name.split()[0],
                    'last_name': ' '.join(request.user.name.split()[1:]) or request.user.name,
                },
            }
            resp = http_requests.post(
                f"{settings.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest",
                json=payload,
                headers={'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            with transaction.atomic():
                Payment.objects.update_or_create(
                    pesapal_order_tracking_id=data['order_tracking_id'],
                    defaults={
                        'order': order,
                        'merchant_reference': data.get('merchant_reference', order.code),
                        'amount': order.total,  # always store server-side amount
                        'status': 'pending',
                    },
                )
            logger.info('Payment initiated: order=%s tracking=%s user=%s', order.code, data['order_tracking_id'], request.user.email)
            return Response({'redirect_url': data['redirect_url'], 'order_tracking_id': data['order_tracking_id']})
        except http_requests.HTTPError as e:
            logger.error('Pesapal HTTP error initiating payment for order %s: %s', code, e)
            return Response({'detail': 'Payment gateway error. Please try again.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception:
            logger.exception('Unexpected error initiating payment for order %s', code)
            return Response({'detail': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PesapalIPNView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        tracking_id = request.query_params.get('OrderTrackingId', '').strip()
        merchant_ref = request.query_params.get('OrderMerchantReference', '').strip()

        if not tracking_id:
            return Response({'detail': 'Missing OrderTrackingId'}, status=status.HTTP_400_BAD_REQUEST)

        # Only process tracking IDs we actually created — reject unknown ones
        try:
            payment = Payment.objects.select_related('order').get(pesapal_order_tracking_id=tracking_id)
        except Payment.DoesNotExist:
            logger.warning('IPN received for unknown tracking_id=%s', tracking_id)
            return Response({'detail': 'Unknown transaction'}, status=status.HTTP_404_NOT_FOUND)

        # Verify merchant reference matches what we stored
        if merchant_ref and payment.merchant_reference and merchant_ref != payment.merchant_reference:
            logger.warning('IPN merchant_ref mismatch: expected=%s got=%s', payment.merchant_reference, merchant_ref)
            return Response({'detail': 'Reference mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        # Never downgrade a completed payment — prevents replay attacks
        if payment.status == 'completed':
            return Response({'orderNotificationType': 'IPNCHANGE', 'orderTrackingId': tracking_id, 'orderMerchantReference': merchant_ref, 'status': 200})

        try:
            token = _pesapal_token()
            resp = http_requests.get(
                f"{settings.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus",
                params={'orderTrackingId': tracking_id},
                headers={'Accept': 'application/json', 'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            # Verify the amount Pesapal reports matches what we stored
            pesapal_amount = float(data.get('amount', 0))
            if pesapal_amount and abs(pesapal_amount - float(payment.amount)) > 0.01:
                logger.error('IPN amount mismatch: expected=%s pesapal=%s tracking=%s', payment.amount, pesapal_amount, tracking_id)
                return Response({'detail': 'Amount mismatch'}, status=status.HTTP_400_BAD_REQUEST)

            payment_status_desc = data.get('payment_status_description', '').lower()
            mapped = {'completed': 'completed', 'failed': 'failed', 'invalid': 'invalid', 'cancelled': 'cancelled'}.get(payment_status_desc, 'pending')

            payment.status = mapped
            payment.payment_method = data.get('payment_method', '')
            payment.save(update_fields=['status', 'payment_method', 'updated_at'])

            logger.info('IPN processed: tracking=%s status=%s', tracking_id, mapped)
            return Response({'orderNotificationType': 'IPNCHANGE', 'orderTrackingId': tracking_id, 'orderMerchantReference': merchant_ref, 'status': 200})
        except http_requests.HTTPError as e:
            logger.error('Pesapal HTTP error on IPN for tracking=%s: %s', tracking_id, e)
            return Response({'detail': 'Gateway error'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception:
            logger.exception('Unexpected error on IPN for tracking=%s', tracking_id)
            return Response({'detail': 'Internal error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminPaymentsView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = (permissions.IsAdminUser,)

    def get_queryset(self):
        qs = Payment.objects.select_related('order').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
