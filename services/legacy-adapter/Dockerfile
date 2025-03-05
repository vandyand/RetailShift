# Multi-stage build for Clojure service
FROM clojure:temurin-17-lein AS builder

# Set working directory
WORKDIR /build

# Copy project files
COPY project.clj /build/
# Download dependencies separately for better caching
RUN lein deps

# Copy source code
COPY . /build/

# Build uberjar
RUN lein uberjar

# Production stage - using ARM64 compatible image
FROM amazoncorretto:17-alpine

# Set environment variables
ENV APP_ENV=production

# Create a non-root user to run the application
RUN addgroup -S app && adduser -S app -G app

# Set working directory
WORKDIR /app

# Copy the uberjar from the builder stage
COPY --from=builder /build/target/uberjar/*-standalone.jar /app/app.jar
COPY --from=builder /build/resources /app/resources

# Install curl for health check
RUN apk add --no-cache curl

# Ensure proper ownership
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 8080

# Set health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["java", "-Xms256m", "-Xmx512m", "-jar", "/app/app.jar"] 