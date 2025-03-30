(ns retailshift.legacy-adapter.db.legacy-client
  (:require [clojure.tools.logging :as log]
            [mount.core :refer [defstate]]))

;; Configuration could be loaded from environment or config
(def ^:private legacy-config
  {:host (or (System/getenv "LEGACY_HOST") "legacy-system")
   :port (or (System/getenv "LEGACY_PORT") 8080)
   :timeout 5000})

(defn check-connection
  "Check connection to legacy system"
  []
  (try
    ;; In a real implementation, this would actually try to connect
    ;; For now, we'll just return true to simulate connection success
    (log/info "Checking connection to legacy system")
    true
    (catch Exception e
      (log/error e "Failed to connect to legacy system")
      false)))

;; Define the connection state using mount
(defstate connection
  :start (do
           (log/info "Initializing legacy system client")
           (check-connection)
           legacy-config)
  :stop (log/info "Shutting down legacy system client"))

(defn fetch-data
  "Fetch data from legacy system"
  [endpoint params]
  (try
    ;; In a real implementation, this would make an HTTP request to the legacy system
    ;; For now, we'll return a mock response
    (log/info "Fetching data from legacy system:" endpoint)
    {:status "success"
     :data (case endpoint
             "inventory" [{:item_id "123" :name "Test Item" :quantity 10}]
             "customers" [{:customer_id "456" :name "Test Customer"}]
             "transactions" [{:transaction_id "789" :amount 99.99 :date "2023-05-01"}]
             [])}
    (catch Exception e
      (log/error e "Failed to fetch data from legacy system:" endpoint)
      {:status "error"
       :error (.getMessage e)}))) 