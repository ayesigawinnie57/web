from rest_framework import serializers
from .models import PlatformSettings, DeliverySettings, District


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = (
            'ui_active', 'allow_selling',
            'initial_charge', 'commission',
            'withdrawal_minimum', 'withdrawal_fee',
            'vat', 'free_delivery_threshold',
        )


class DeliverySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverySettings
        fields = ('global_fee',)


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ('id', 'name', 'price', 'region')
