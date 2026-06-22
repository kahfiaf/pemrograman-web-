# Stage 1: Build dependency
FROM python:3.11-slim AS builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 2: Final Runtime
FROM python:3.11-slim
WORKDIR /app

# Buat user non-root demi keamanan
RUN addgroup --system django && adduser --system --group django

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache /wheels/* \
    && rm -rf /wheels \
    && apt-get update && apt-get install --no-install-recommends -y libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy source code dan ubah kepemilikan ke user django
COPY . .
RUN chown -R django:django /app

USER django

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-", "insight_core.wsgi:application"]