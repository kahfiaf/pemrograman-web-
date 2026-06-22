from django.db import models
from django.utils import timezone

class Dataset(models.Model):
    ACTIVITY_CHOICES = [
        ('todo', 'To Do'),
        ('in-progress', 'In Progress'),
        ('in-review', 'In Review'),
        ('done', 'Done'),
    ]

    name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    pdf_file = models.FileField(upload_to='datasets/', null=True, blank=True)
    activity = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='todo')
    version = models.CharField(max_length=50, default='1.0')
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    quality_score = models.FloatField(default=0.0)
    source_type = models.CharField(max_length=20, choices=[('api', 'API'), ('manual', 'Manual')], default='manual')
    user_email = models.EmailField(max_length=255, blank=True, default='')  # owner identifier
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.version})"

class PerformanceMetric(models.Model):
    dataset = models.ForeignKey(Dataset, related_name='metrics', on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    completeness = models.FloatField(default=0.0)
    accuracy = models.FloatField(default=0.0)
    validity = models.FloatField(default=0.0)
    consistency = models.FloatField(default=0.0)
    timeliness = models.FloatField(default=0.0)
    latency = models.IntegerField(default=0)  # in ms
    throughput = models.FloatField(default=0.0) # in req/s
    error_rate = models.FloatField(default=0.0)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Metrics for {self.dataset.name} on {self.date}"

class Alert(models.Model):
    CRITICALITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    dataset = models.ForeignKey(Dataset, related_name='alerts', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    message = models.TextField()
    criticality = models.CharField(max_length=20, choices=CRITICALITY_CHOICES, default='medium')
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.criticality.upper()}] {self.title} - {self.dataset.name}"

class ImplementationActivity(models.Model):
    version = models.CharField(max_length=50)
    activity_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, default='Success')
    created_at = models.DateTimeField(auto_now_add=True)

class ModelTransaction(models.Model):
    model_name = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='Active')
    accuracy = models.CharField(max_length=20, default='0.0%')
    model_type = models.CharField(max_length=100)
    version = models.CharField(max_length=50, default='v1.0.0')
    input_count = models.IntegerField(default=0)
    output_count = models.IntegerField(default=0)
    total_predictions = models.CharField(max_length=50, default='0')
    top_features = models.TextField(blank=True) # comma separated
    source_type = models.CharField(max_length=20, choices=[('api', 'API'), ('manual', 'Manual')], default='manual')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.model_name} ({self.version})"

class EnvironmentStat(models.Model):
    server_name = models.CharField(max_length=100)
    cpu_usage = models.FloatField()
    memory_usage = models.FloatField()
    disk_usage = models.FloatField()
    os_version = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

class MaintainerNote(models.Model):
    author = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class MaintenanceIssue(models.Model):
    ISSUE_TYPE_CHOICES = [
        ('quality',      'Low Quality Score'),
        ('pipeline',     'Pipeline Error'),
        ('missing_data', 'Missing / Incomplete Data'),
        ('schema_error', 'Schema Error'),
        ('drift',        'Data Drift Detected'),
    ]
    SEVERITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]

    dataset_name  = models.CharField(max_length=255)
    issue_type    = models.CharField(max_length=30, choices=ISSUE_TYPE_CHOICES)
    severity      = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    description   = models.TextField()
    quality_score = models.FloatField(default=0.0)
    detected_at   = models.DateTimeField(auto_now_add=True)
    is_sent       = models.BooleanField(default=False)
    sent_at       = models.DateTimeField(null=True, blank=True)
    sent_by       = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.issue_type} — {self.dataset_name}"

class PdfDocument(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    category_color = models.CharField(max_length=50)
    size = models.CharField(max_length=50)
    file = models.FileField(upload_to='pdfs/')
    user_email = models.EmailField(blank=True, default='')
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.category})"
