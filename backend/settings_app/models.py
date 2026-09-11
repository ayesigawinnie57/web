from django.db import models


class PlatformSettings(models.Model):
    """Singleton — always use PlatformSettings.get()"""
    ui_active = models.BooleanField(default=False)
    allow_selling = models.BooleanField(default=False)
    initial_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    withdrawal_minimum = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    withdrawal_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    free_delivery_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Platform Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class DeliverySettings(models.Model):
    """Singleton — always use DeliverySettings.get()"""
    global_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Delivery Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class District(models.Model):
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    region = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        ordering = ['region', 'name']

    def __str__(self):
        return self.name
