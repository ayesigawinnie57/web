from rest_framework import serializers
from .models import Order, OrderItem, ServiceRating, Payment
from products.models import Product
from products.serializers import ProductSerializer


class PaymentSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source='order.code', read_only=True, default=None)

    class Meta:
        model = Payment
        fields = ('id', 'order_code', 'pesapal_order_tracking_id', 'merchant_reference', 'amount', 'currency', 'status', 'payment_method', 'description', 'created_at', 'updated_at')


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source='product',
        write_only=True
    )
    # price is ignored on write — always taken from the product in the DB
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_id', 'quantity', 'price')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    has_service_rating = serializers.SerializerMethodField()

    def get_has_service_rating(self, obj):
        return hasattr(obj, 'service_rating')

    class Meta:
        model = Order
        fields = ('id', 'code', 'status', 'subtotal', 'delivery_fee', 'total', 'items', 'delivery_address', 'phone', 'note', 'cancel_reason', 'has_service_rating', 'created_at', 'updated_at')
        read_only_fields = ('id', 'code', 'subtotal', 'delivery_fee', 'total', 'status', 'cancel_reason', 'created_at', 'updated_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        # Prices always come from the DB — never trust client-supplied values
        subtotal = sum(item['product'].price * item['quantity'] for item in items_data)
        delivery_fee = validated_data.pop('delivery_fee', 5000)
        total = subtotal + delivery_fee
        order = Order.objects.create(subtotal=subtotal, delivery_fee=delivery_fee, total=total, **validated_data)
        for item in items_data:
            item['price'] = item['product'].price
            OrderItem.objects.create(order=order, **item)
        return order


class ServiceRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRating
        fields = ('id', 'overall', 'areas', 'area_ratings', 'comment', 'created_at')
        read_only_fields = ('id', 'created_at')
