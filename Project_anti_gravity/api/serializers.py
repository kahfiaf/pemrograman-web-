from rest_framework import serializers
from .models import Dataset, PerformanceMetric, Alert

class PerformanceMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceMetric
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)

    class Meta:
        model = Alert
        fields = '__all__'

class DatasetSerializer(serializers.ModelSerializer):
    metrics = PerformanceMetricSerializer(many=True, read_only=True)
    alerts = AlertSerializer(many=True, read_only=True)
    
    class Meta:
        model = Dataset
        fields = '__all__'

from .models import ImplementationActivity, ModelTransaction, EnvironmentStat, MaintainerNote, MaintenanceIssue, PdfDocument

class ImplementationActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ImplementationActivity
        fields = '__all__'

class ModelTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelTransaction
        fields = '__all__'

class EnvironmentStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvironmentStat
        fields = '__all__'

class MaintainerNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintainerNote
        fields = '__all__'

class MaintenanceIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceIssue
        fields = '__all__'
        read_only_fields = ['detected_at', 'is_sent', 'sent_at']

class PdfDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PdfDocument
        fields = '__all__'

from .models import IntegrationLog
class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationLog
        fields = '__all__'
