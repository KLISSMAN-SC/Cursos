FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt requirements.lock ./
RUN python -m pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 comunidad
COPY --chown=comunidad:comunidad app ./app
COPY --chown=comunidad:comunidad migrations ./migrations
COPY --chown=comunidad:comunidad alembic.ini ./alembic.ini
USER comunidad
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
