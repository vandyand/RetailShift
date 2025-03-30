(ns retailshift.legacy-adapter.api.middleware
  (:require [clojure.tools.logging :as log]
            [retailshift.legacy-adapter.config :as config]
            [ring.util.response :as response]
            [clojure.string :as str])
  (:import [java.util UUID]))

(defn wrap-correlation-id
  "Add a correlation ID to each request for tracing"
  [handler]
  (fn [request]
    (let [correlation-id (or (get-in request [:headers "x-correlation-id"])
                             (str (UUID/randomUUID)))
          request-with-id (assoc request :correlation-id correlation-id)]
      (-> request-with-id
          handler
          (update-in [:headers] assoc "X-Correlation-ID" correlation-id)))))

(defn wrap-logging
  "Log request/response details"
  [handler]
  (fn [request]
    (let [{:keys [request-method uri]} request
          start-time (System/currentTimeMillis)]
      (log/info (str "Request: " (name request-method) " " uri " started"))
      (let [response (handler request)
            elapsed (- (System/currentTimeMillis) start-time)]
        (log/info (str "Request: " (name request-method) " " uri " completed "
                       "(" (:status response) ") in " elapsed "ms"))
        response))))

(defn wrap-exception-handler
  "Handle exceptions and return appropriate response"
  [handler]
  (fn [request]
    (try
      (handler request)
      (catch Exception e
        (log/error e "Unhandled exception")
        (let [correlation-id (:correlation-id request "unknown")]
          (-> (response/response {:error "Internal Server Error"
                                  :correlation-id correlation-id})
              (response/status 500)))))))

(defn- authenticate-api-key
  "Validate the API key"
  [api-key]
  ;; In a real implementation, this would check against a database or secret store
  ;; For demo purposes, we'll accept any non-nil key
  (boolean api-key))

(defn wrap-authentication
  "Authenticate requests using API key"
  [handler]
  (fn [request]
    (let [api-key-header (config/get-in [:security :api-key-header])
          api-key (get-in request [:headers (str/lower-case api-key-header)])
          auth-required? (not= (:uri request) "/health")]
      (if (and auth-required? (not (authenticate-api-key api-key)))
        (-> (response/response {:error "Unauthorized"})
            (response/status 401))
        (handler request)))))

(defn wrap-rate-limit
  "Apply rate limiting to requests"
  [handler]
  (let [enabled? (config/get-in [:rate-limit :enabled] false)
        max-rpm (config/get-in [:rate-limit :max-requests-per-minute] 1000)
        ;; In a real implementation, we'd use Redis or another distributed store for rate tracking
        request-counts (atom {})]
    (fn [request]
      (if-not enabled?
        (handler request)
        (let [ip-address (or (get-in request [:headers "x-forwarded-for"])
                             (:remote-addr request "unknown"))
              current-minute (quot (System/currentTimeMillis) 60000)
              key (str ip-address "-" current-minute)
              current-count (or (get @request-counts key) 0)]
          (if (>= current-count max-rpm)
            (-> (response/response {:error "Rate limit exceeded"})
                (response/status 429))
            (do
              (swap! request-counts update key (fnil inc 0))
              (handler request)))))))) 