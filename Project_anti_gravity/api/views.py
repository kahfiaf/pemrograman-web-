from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
import csv, io
from .models import Dataset, PerformanceMetric, Alert, ImplementationActivity, ModelTransaction, EnvironmentStat, MaintainerNote, MaintenanceIssue, PdfDocument
from .serializers import (
    DatasetSerializer, PerformanceMetricSerializer, AlertSerializer,
    ImplementationActivitySerializer, ModelTransactionSerializer,
    EnvironmentStatSerializer, MaintainerNoteSerializer, MaintenanceIssueSerializer, PdfDocumentSerializer
)

# ─── URL endpoint kelompok Intelligence Creation ────────────────────────────
# Ganti dengan URL asli saat sudah mendapat info dari kelompok IC:
IC_API_URL = "http://127.0.0.1:8001/api/receive-issue/"
# ────────────────────────────────────────────────────────────────────────────

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class DatasetViewSet(viewsets.ModelViewSet):
    serializer_class = DatasetSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        """Filter datasets by user_email query param if provided."""
        email = self.request.query_params.get('email', '').strip()
        if email:
            return Dataset.objects.filter(user_email=email)
        return Dataset.objects.all()

    def perform_create(self, serializer):
        """Auto-set user_email from request data when creating a dataset."""
        email = self.request.data.get('user_email', '')
        serializer.save(user_email=email)

    @action(detail=False, methods=['post'], url_path='reset-all')
    def reset_all(self, request):
        MaintenanceIssue.objects.all().delete()
        return Response({"status": "all issues reset"})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        datasets = self.get_queryset()
        total_sources = datasets.count()
        avg_score = sum(d.quality_score for d in datasets) / total_sources if total_sources > 0 else 0
        active_pipelines = datasets.filter(activity__in=['in-progress', 'in-review']).count()

        return Response({
            'total_sources': total_sources,
            'avg_quality_score': round(avg_score, 1),
            'active_pipelines': active_pipelines,
        })

class PerformanceMetricViewSet(viewsets.ModelViewSet):
    queryset = PerformanceMetric.objects.all()
    serializer_class = PerformanceMetricSerializer

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save()
        return Response({'status': 'alert resolved'})

class ImplementationActivityViewSet(viewsets.ModelViewSet):
    queryset = ImplementationActivity.objects.all()
    serializer_class = ImplementationActivitySerializer

class ModelTransactionViewSet(viewsets.ModelViewSet):
    queryset = ModelTransaction.objects.all()
    serializer_class = ModelTransactionSerializer

class EnvironmentStatViewSet(viewsets.ModelViewSet):
    queryset = EnvironmentStat.objects.all()
    serializer_class = EnvironmentStatSerializer

class MaintainerNoteViewSet(viewsets.ModelViewSet):
    queryset = MaintainerNote.objects.all()
    serializer_class = MaintainerNoteSerializer


class MaintenanceIssueViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk MaintenanceIssue.
    - LIST   : GET  /api/maintenance-issues/
    - CREATE : POST /api/maintenance-issues/
    - SEND   : POST /api/maintenance-issues/{id}/send_to_ic/
    - UNSENT : GET  /api/maintenance-issues/unsent/
    """
    queryset = MaintenanceIssue.objects.all()
    serializer_class = MaintenanceIssueSerializer

    @action(detail=False, methods=['get'])
    def unsent(self, request):
        """Kembalikan semua issue yang belum dikirim ke IC."""
        issues = self.get_queryset().filter(is_sent=False)
        serializer = self.get_serializer(issues, many=True)
        return Response(serializer.data)

class PdfDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = PdfDocumentSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        email = self.request.query_params.get('email', '').strip()
        if email:
            return PdfDocument.objects.filter(user_email=email)
        return PdfDocument.objects.all()

    def perform_create(self, serializer):
        email = self.request.data.get('user_email', '')
        serializer.save(user_email=email)

from .models import IntegrationLog
from .serializers import IntegrationLogSerializer

class IntegrationLogViewSet(viewsets.ModelViewSet):
    queryset = IntegrationLog.objects.all()
    serializer_class = IntegrationLogSerializer

    @action(detail=True, methods=['post'])
    def send_to_ic(self, request, pk=None):
        """
        Kirimkan data issue ke endpoint API kelompok Intelligence Creation.
        Menggunakan requests.post() ke IC_API_URL.
        """
        issue = self.get_object()
        sent_by = request.data.get('sent_by', 'unknown')

        if issue.is_sent:
            return Response(
                {'status': 'already_sent', 'sent_at': issue.sent_at},
                status=status.HTTP_200_OK
            )

        payload = {
            "source":        "insight-platform",
            "dataset_name":  issue.dataset_name,
            "issue_type":    issue.issue_type,
            "severity":      issue.severity,
            "description":   issue.description,
            "quality_score": issue.quality_score,
            "detected_at":   issue.detected_at.isoformat(),
            "sent_by":       sent_by,
        }

        try:
            import requests as req
            resp = req.post(IC_API_URL, json=payload, timeout=5)
            resp.raise_for_status()

            issue.is_sent  = True
            issue.sent_at  = timezone.now()
            issue.sent_by  = sent_by
            issue.save()

            return Response({
                'status':     'sent',
                'sent_at':    issue.sent_at.isoformat(),
                'ic_status':  resp.status_code,
                'ic_response': resp.text[:200],
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Simpan log kegagalan tapi jangan crash — IC mungkin belum online
            return Response({
                'status':  'failed',
                'error':   str(e),
                'payload': payload,
            }, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
def download_dataset_csv(request):
    """Generate and serve a CSV report for a dataset entry by index."""
    import json, math

    user_email = request.GET.get('email', '')
    idx = int(request.GET.get('idx', 0))
    name = request.GET.get('name', 'Dataset')
    file_name = request.GET.get('file_name', '-')
    version = request.GET.get('version', '1.0')
    activity = request.GET.get('activity', '-')
    date = request.GET.get('date', '-')
    description = request.GET.get('description', '-')
    notes = request.GET.get('notes', '-')
    quality_score = request.GET.get('quality_score', '0')

    try:
        quality_score = float(quality_score)
    except Exception:
        quality_score = 0

    # Generate criteria scores deterministically using seeded random
    def seeded_rand(seed, min_val, max_val):
        import math
        x = math.sin(seed * 9301 + 49297) * 233280
        r = x - math.floor(x)
        return min_val + r * (max_val - min_val)

    seed = idx + 1
    completeness = min(100, round(quality_score + seeded_rand(seed * 2, -2, 2)))
    accuracy     = min(100, round(quality_score + seeded_rand(seed * 5, -1, 2)))
    validity     = min(100, round(quality_score + seeded_rand(seed * 8, -4, 4)))
    consistency  = min(100, round(quality_score + seeded_rand(seed * 3, -3, 3)))
    timeliness   = min(100, round(quality_score + seeded_rand(seed * 6, -5, 5)))

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Laporan Data Quality - ' + name])
    writer.writerow([])
    writer.writerow(['Informasi Dataset'])
    writer.writerow(['Nama Dataset', name])
    writer.writerow(['File', file_name])
    writer.writerow(['Versi', version])
    writer.writerow(['Status', activity])
    writer.writerow(['Tanggal', date])
    writer.writerow(['Deskripsi', description])
    writer.writerow(['Catatan', notes])
    writer.writerow([])
    writer.writerow(['Skor Kualitas'])
    writer.writerow(['Overall Quality Score', str(round(quality_score)) + '%'])
    writer.writerow(['Completeness', str(completeness) + '%'])
    writer.writerow(['Accuracy', str(accuracy) + '%'])
    writer.writerow(['Validity', str(validity) + '%'])
    writer.writerow(['Consistency', str(consistency) + '%'])
    writer.writerow(['Timeliness', str(timeliness) + '%'])

    filename = 'Laporan_' + name.replace(' ', '_') + '.csv'
    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
