from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CartItem, WishlistItem

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'name', 'phone', 'password', 'country', 'region', 'district', 'village')

    def create(self, validated_data):
        validated_data.pop('is_staff', None)
        validated_data.pop('is_superuser', None)
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'phone', 'avatar', 'is_staff', 'is_superuser', 'created_at', 'country', 'region', 'district', 'village')
        read_only_fields = ('id', 'email', 'is_staff', 'is_superuser', 'created_at')


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ('id', 'product_id', 'product_name', 'product_price', 'product_image', 'product_slug', 'product_category', 'product_rating', 'quantity', 'added_at')
        read_only_fields = ('id', 'added_at')


class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = ('id', 'product_id', 'product_name', 'product_price', 'product_image', 'product_slug', 'product_category', 'product_rating', 'added_at')
        read_only_fields = ('id', 'added_at')
