import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'insight_core.settings')
django.setup()

from api.models import ModelTransaction

ModelTransaction.objects.all().delete()

models = [
    {
        'model_name': "Customer Churn Prediction", 'status': "Deployed",
        'accuracy': "94.5%", 'model_type': "Binary Classification", 'version': "v1.1.0",
        'input_count': 8, 'output_count': 2, 'total_predictions': "125K",
        'top_features': "engagement_rate (28%), subscription_duration (22%), support_tickets (15%)",
        'source_type': "api"
    },
    {
        'model_name': "Sales Forecasting", 'status': "Active",
        'accuracy': "88.2%", 'model_type': "Time Series Regression", 'version': "v3.0.2",
        'input_count': 8, 'output_count': 2, 'total_predictions': "45K",
        'top_features': "historical_sales (35%), seasonality_index (25%), marketing_spend (20%)",
        'source_type': "manual"
    },
    {
        'model_name': "Product Recommendation", 'status': "Deployed",
        'accuracy': "91.8%", 'model_type': "Multi-class Classification", 'version': "v1.5.1",
        'input_count': 8, 'output_count': 4, 'total_predictions': "235K",
        'top_features': "purchase_history (32%), user_browsing_history (28%), brand_affinity (18%)",
        'source_type': "api"
    },
    {
        'model_name': "Fraud Detection", 'status': "Active",
        'accuracy': "96.3%", 'model_type': "Anomaly Detection", 'version': "v2.2.1",
        'input_count': 8, 'output_count': 2, 'total_predictions': "568K",
        'top_features': "velocity_check (30%), user_behavior_score (26%), device_fingerprint (22%)",
        'source_type': "api"
    },
    {
        'model_name': "Sentiment Analysis", 'status': "Training",
        'accuracy': "89.7%", 'model_type': "Text Classification", 'version': "v2.5.0",
        'input_count': 8, 'output_count': 4, 'total_predictions': "89K",
        'top_features': "word_sentiment_scores (40%), review_text (30%), emoji_sentiment (15%)",
        'source_type': "manual"
    }
]

for data in models:
    ModelTransaction.objects.create(**data)

print("Database seeded with 5 ModelTransaction objects.")
