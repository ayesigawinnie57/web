import bleach
from html import escape

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count
from rest_framework import generics, filters, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Product, ProductImage, FlashSale, ProductReview, ReviewImage
from .serializers import (
    CategorySerializer, ProductSerializer, ProductImageSerializer,
    FlashSaleSerializer,
    ProductReviewSerializer, RatingSummarySerializer,
)
from .permissions import IsAdminOrReadOnly
from orders.models import OrderItem


class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (IsAdminOrReadOnly,)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (IsAdminOrReadOnly,)


class ProductListView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name', 'category__name')
    ordering_fields = ('price', 'rating', 'created_at')

    def get_queryset(self):
        qs = Product.objects.all().select_related('category').prefetch_related('images')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        return qs

    def perform_create(self, serializer):
        cover = self.request.FILES.get('image')
        product = serializer.save(**(({'image': cover}) if cover else {}))
        for i, img in enumerate(self.request.FILES.getlist('images')):
            ProductImage.objects.create(product=product, image=img, order=i)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all().select_related('category').prefetch_related('images')
    serializer_class = ProductSerializer
    permission_classes = (IsAdminOrReadOnly,)

    def perform_update(self, serializer):
        cover = self.request.FILES.get('image')
        product = serializer.save(**(({'image': cover}) if cover else {}))
        files = self.request.FILES.getlist('images')
        if files:
            start = product.images.count()
            for i, img in enumerate(files):
                ProductImage.objects.create(product=product, image=img, order=start + i)


class ProductImageDeleteView(APIView):
    """DELETE /api/products/<pk>/images/<img_pk>/"""
    permission_classes = (permissions.IsAdminUser,)

    def delete(self, request, pk, img_pk):
        img = get_object_or_404(ProductImage, pk=img_pk, product_id=pk)
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductSlugDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all().select_related('category')
    serializer_class = ProductSerializer
    permission_classes = (IsAdminOrReadOnly,)
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'


# ── Flash Sales ─────────────────────────────────────────────────────────────

class FlashSaleListCreateView(generics.ListCreateAPIView):
    serializer_class = FlashSaleSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        from django.utils import timezone
        qs = FlashSale.objects.select_related('product__category').prefetch_related('product__images')
        if self.request.query_params.get('active') == '1':
            qs = qs.filter(is_active=True, ends_at__gt=timezone.now())
        return qs


class FlashSaleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FlashSale.objects.select_related('product__category').prefetch_related('product__images')
    serializer_class = FlashSaleSerializer
    permission_classes = (permissions.IsAdminUser,)


# ── Product Reviews ──────────────────────────────────────────────────────────

class ProductReviewListCreateView(APIView):
    """
    GET  /api/products/<slug>/reviews/   — list published reviews (public)
    POST /api/products/<slug>/reviews/   — submit a review (authenticated)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
        qs = ProductReview.objects.filter(
            product=product, status='published'
        ).prefetch_related('images').select_related('user').order_by('-created_at')

        star = request.query_params.get('star')
        if star and star.isdigit():
            qs = qs.filter(overall_rating=int(star))

        with_photos = request.query_params.get('with_photos')
        if with_photos == '1':
            qs = qs.filter(images__isnull=False).distinct()

        serializer = ProductReviewSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request, slug):
        if request.user.is_staff:
            return Response({'detail': 'Admins cannot submit reviews.'}, status=status.HTTP_403_FORBIDDEN)

        product = get_object_or_404(Product, slug=slug)

        delivered_item = OrderItem.objects.filter(
            product=product,
            order__user=request.user,
            order__status='delivered',
        ).select_related('order').first()

        if not delivered_item:
            return Response(
                {'detail': 'You can only review products from your delivered orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_id = request.data.get('order') or delivered_item.order_id
        order_item_id = request.data.get('order_item') or delivered_item.id

        if ProductReview.objects.filter(product=product, user=request.user, order_id=order_id).exists():
            return Response(
                {'detail': 'You have already reviewed this product for this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()

        # Sanitize review text
        raw_text = data.get('review_text', '')
        data['review_text'] = bleach.clean(raw_text, tags=[], strip=True)[:500]

        serializer = ProductReviewSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(
            product=product, user=request.user, verified_purchase=True,
            order_id=order_id, order_item_id=order_item_id,
        )

        # Save uploaded images from request.FILES
        for img_file in request.FILES.getlist('uploaded_images')[:5]:
            ReviewImage.objects.create(review=review, image=img_file)

        # Recalculate product average rating
        _update_product_rating(product)

        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ProductReviewDetailView(APIView):
    """
    DELETE /api/products/<slug>/reviews/<pk>/  — admin only
    """
    permission_classes = (permissions.IsAdminUser,)

    def delete(self, request, slug, pk):
        product = get_object_or_404(Product, slug=slug)
        review = get_object_or_404(ProductReview, pk=pk, product=product)
        review.delete()
        _update_product_rating(product)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductReviewEligibilityView(APIView):
    """GET /api/products/<slug>/reviews/eligibility/"""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)

        delivered_item = OrderItem.objects.filter(
            product=product,
            order__user=request.user,
            order__status='delivered',
        ).select_related('order').first()

        if not delivered_item:
            return Response({'eligible': False, 'reason': 'no_delivered_order'})

        existing = ProductReview.objects.filter(
            product=product, user=request.user, order=delivered_item.order
        ).first()

        if existing:
            return Response({'eligible': False, 'reason': 'already_reviewed', 'existing_review_id': existing.id})

        return Response({
            'eligible': True,
            'order_id': delivered_item.order_id,
            'order_item_id': delivered_item.id,
            'order_code': delivered_item.order.code,
            'existing_review_id': None,
        })


class ProductRatingSummaryView(APIView):
    """GET /api/products/<slug>/reviews/summary/"""

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
        qs = ProductReview.objects.filter(product=product, status='published')
        total = qs.count()
        breakdown = {}
        for star in range(1, 6):
            breakdown[str(star)] = qs.filter(overall_rating=star).count()
        avg = qs.aggregate(a=Avg('overall_rating'))['a'] or 0
        with_photos = qs.filter(images__isnull=False).distinct().count()
        return Response({
            'average': round(float(avg), 1),
            'total': total,
            'breakdown': breakdown,
            'with_photos': with_photos,
        })


class MyReviewsView(generics.ListAPIView):
    """GET /api/products/reviews/mine/"""
    serializer_class = ProductReviewSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ProductReview.objects.filter(
            user=self.request.user
        ).select_related('product').prefetch_related('images').order_by('-created_at')


# ── Helpers ──────────────────────────────────────────────────────────────────

def _update_product_rating(product):
    from django.db.models import Avg
    avg = ProductReview.objects.filter(
        product=product, status='published'
    ).aggregate(v=Avg('overall_rating'))['v'] or 0
    product.rating = round(float(avg), 1)
    product.save(update_fields=['rating'])


# ── Share view ───────────────────────────────────────────────────────────────

def ProductShareView(request, slug):
    product = get_object_or_404(Product.objects.select_related('category'), slug=slug)
    image_url = product.image.url if product.image else ''
    description = f'Buy {product.name} from Majo Gadgets for UGX {product.price:,.0f}. Quality gadgets, great value.'
    app_url = f'shopmajo://shop/{product.slug}'
    title = escape(f'{product.name} | Majo Gadgets')
    safe_description = escape(description)
    safe_image = escape(image_url, quote=True)
    safe_app_url = escape(app_url, quote=True)

    html = f'''<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta property="og:title" content="{title}">
        <meta property="og:description" content="{safe_description}">
        <meta property="og:type" content="product">
        <meta property="og:url" content="{request.build_absolute_uri()}">
        {f'<meta property="og:image" content="{safe_image}">' if safe_image else ''}
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{title}">
        <meta name="twitter:description" content="{safe_description}">
        {f'<meta name="twitter:image" content="{safe_image}">' if safe_image else ''}
        <meta http-equiv="refresh" content="0;url={safe_app_url}">
        <title>{title}</title>
    </head>
    <body>
        <p>Opening {escape(product.name)} in Majo Gadgets...</p>
        <p><a href="{safe_app_url}">Open product</a></p>
    </body>
</html>'''
    return HttpResponse(html)
