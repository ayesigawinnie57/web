from django.contrib import admin
from .models import PlatformSettings, DeliverySettings, District


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('name', 'region', 'price')
    list_filter = ('region',)
    search_fields = ('name',)
    ordering = ('region', 'name')


admin.site.register(PlatformSettings)
admin.site.register(DeliverySettings)
