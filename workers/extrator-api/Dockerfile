FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-por \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY container/server.py /app/server.py
COPY container/scripts /app/scripts

EXPOSE 8080
CMD ["python3", "/app/server.py"]
