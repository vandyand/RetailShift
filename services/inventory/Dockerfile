# Use a more compatible ARM64-friendly base image
FROM amazoncorretto:17-alpine

# Set working directory
WORKDIR /app

# Install dependencies required for native extensions
RUN apk add --no-cache bash curl

# Create volume for logs
VOLUME /app/logs

# Copy application JAR and resources
COPY target/inventory-service-standalone.jar /app/app.jar
COPY resources /app/resources

# Set environment variables
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENV SERVICE_PORT=8080

# Expose application port
EXPOSE 8080

# Set health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health/liveness || exit 1

# Run the application with optimized JVM settings
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar --block"] 