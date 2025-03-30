(ns retailshift.legacy-adapter.api.handlers.metrics
  (:require [clojure.tools.logging :as log]
            [ring.util.response :as response]))

;; Simple metrics endpoint that returns basic service info
;; Real metrics implementation will be added later
(defn collect
  "Return basic service metrics"
  []
  (try
    (let [metrics {:service "legacy-adapter"
                   :status "healthy"
                   :uptime (/ (- (System/currentTimeMillis)
                                 (.getStartTime (java.lang.management.ManagementFactory/getRuntimeMXBean)))
                              1000)}]
      (log/debug "Collected basic metrics")
      (response/response {:data metrics}))
    (catch Exception e
      (log/error e "Failed to collect metrics")
      (-> (response/response {:error "Failed to collect metrics"})
          (response/status 500))))) 