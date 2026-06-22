from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DatasetViewSet, PerformanceMetricViewSet, AlertViewSet,
    ImplementationActivityViewSet, ModelTransactionViewSet,
    EnvironmentStatViewSet, MaintainerNoteViewSet, MaintenanceIssueViewSet,
    PdfDocumentViewSet,
    download_dataset_csv
)

router = DefaultRouter()
router.register(r'datasets',             DatasetViewSet, basename='dataset')
router.register(r'metrics',              PerformanceMetricViewSet)
router.register(r'alerts',               AlertViewSet)
router.register(r'implementation',       ImplementationActivityViewSet)
router.register(r'transactions',         ModelTransactionViewSet)
router.register(r'environment',          EnvironmentStatViewSet)
router.register(r'notes',                MaintainerNoteViewSet)
router.register(r'maintenance-issues',   MaintenanceIssueViewSet)
router.register(r'pdfs',                 PdfDocumentViewSet, basename='pdfdocument')

from .auth_views import register_user, login_user, logout_user, change_password

urlpatterns = [
    path('', include(router.urls)),
    path('download-dataset/', download_dataset_csv, name='download_dataset_csv'),
    path('register/', register_user, name='register_user'),
    path('login/', login_user, name='login_user'),
    path('logout/', logout_user, name='logout_user'),
    path('change-password/', change_password, name='change_password'),
]
