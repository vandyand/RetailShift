(ns retailshift.legacy-adapter.api.handlers.migration
  (:require [clojure.tools.logging :as log]
            [ring.util.response :as response]
            [retailshift.legacy-adapter.db.mongodb :as db]
            [retailshift.legacy-adapter.kafka.producer :as kafka]))

(def migration-collection "migration_status")

;; In-memory migration status (in a real application, this would be persisted)
(def migration-state (atom {:status "idle" :progress 0 :total 0 :error nil}))

(defn start
  "Start a data migration process"
  [{:keys [body]}]
  (try
    (let [migration-id (str (java.util.UUID/randomUUID))
          migration-config (merge {:id migration-id
                                   :start-time (java.util.Date.)
                                   :status "running"}
                                  body)]

      ;; Store migration status in database
      (db/insert migration-collection migration-config)

      ;; Update in-memory state
      (reset! migration-state {:status "running"
                               :progress 0
                               :total (or (:total-items body) 100)
                               :id migration-id})

      ;; Send migration started event to Kafka
      (kafka/send-message "migration-events" "migration-started" migration-config)

      ;; In a real app, we would start an async migration process here
      ;; For demo purposes, we're just returning a response
      (log/info "Started migration with ID:" migration-id)
      (-> (response/response {:data {:id migration-id
                                     :status "running"
                                     :message "Migration started successfully"}})
          (response/status 202)))
    (catch Exception e
      (log/error e "Failed to start migration")
      (-> (response/response {:error "Failed to start migration"})
          (response/status 500)))))

(defn status
  "Get current migration status"
  []
  (try
    (log/info "Retrieved migration status:" (:status @migration-state))
    (response/response {:data @migration-state})
    (catch Exception e
      (log/error e "Failed to retrieve migration status")
      (-> (response/response {:error "Failed to retrieve migration status"})
          (response/status 500)))))

(defn abort
  "Abort an ongoing migration"
  []
  (try
    (if (= "running" (:status @migration-state))
      (let [migration-id (:id @migration-state)
            updated-state (assoc @migration-state :status "aborted")]

        ;; Update status in database
        (when migration-id
          (db/update-by-id migration-collection migration-id {:status "aborted"}))

        ;; Update in-memory state
        (reset! migration-state updated-state)

        ;; Send migration aborted event to Kafka
        (kafka/send-message "migration-events" "migration-aborted" updated-state)

        (log/info "Aborted migration with ID:" migration-id)
        (response/response {:data updated-state}))

      (do
        (log/warn "No active migration to abort")
        (-> (response/response {:error "No active migration to abort"})
            (response/status 400))))
    (catch Exception e
      (log/error e "Failed to abort migration")
      (-> (response/response {:error "Failed to abort migration"})
          (response/status 500))))) 