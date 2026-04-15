FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--threads", "8", "--timeout", "120", "--access-logfile", "-", "app:app"]
