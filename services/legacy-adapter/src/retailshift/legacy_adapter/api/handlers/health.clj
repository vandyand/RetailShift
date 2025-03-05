(ns retailshift.legacy-adapter.api.handlers.health
  (:require [retailshift.legacy-adapter.db.mongodb :as mongodb]
            [retailshift.legacy-adapter.db.legacy-client :as legacy-client]
            [retailshift.legacy-adapter.kafka.producer :as kafka]
            [clojure.tools.logging :as log]
            [ring.util.response :as response]))

(defn- system-status
  "Check the status of all dependent systems"
  []
  (try
    (let [mongo-status (mongodb/check-connection)
          legacy-status (legacy-client/check-connection)
          kafka-status (kafka/check-connection)]
      {:mongodb {:status (if mongo-status "UP" "DOWN")}
       :legacy-system {:status (if legacy-status "UP" "DOWN")}
       :kafka {:status (if kafka-status "UP" "DOWN")}
       :status (if (and mongo-status legacy-status kafka-status) "UP" "DOWN")})
    (catch Exception e
      (log/error e "Error checking system status")
      {:status "DOWN"
       :error (.getMessage e)})))

(defn check
  "Basic health check endpoint"
  []
  (response/response {:status "UP"
                      :service "legacy-adapter"
                      :timestamp (System/currentTimeMillis)}))

(defn readiness
  "Readiness probe - checks if the service is ready to handle requests"
  []
  (let [status (system-status)]
    (-> (response/response status)
        (response/status (if (= (:status status) "UP") 200 503)))))

(defn liveness
  "Liveness probe - checks if the service is running properly"
  []
  (try
    ;; A simple check that the service is running and not deadlocked
    (response/response {:status "UP"
                        :timestamp (System/currentTimeMillis)})
    (catch Exception e
      (log/error e "Liveness check failed")
      (-> (response/response {:status "DOWN"
                              :error (.getMessage e)})
          (response/status 500))))) 