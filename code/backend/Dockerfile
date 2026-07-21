FROM python:3.11-slim

# Create a non-root user
RUN addgroup --system appuser && adduser --system --group appuser

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY code/backend /app/code/backend

# Ensure Python finds the modules
ENV PYTHONPATH=/app

# Switch to non-root user
USER appuser

# Run the processor
CMD ["python", "code/backend/processor_engine/processor.py"]
