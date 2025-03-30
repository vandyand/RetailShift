(ns retailshift.legacy-adapter.api.handlers.transactions
  (:require [clojure.tools.logging :as log]
            [ring.util.response :as response]
            [retailshift.legacy-adapter.db.mongodb :as db]
            [retailshift.legacy-adapter.kafka.producer :as kafka]))

(def collection "transactions")

(defn get-all
  "Retrieve all transactions"
  []
  (try
    (let [items (db/find-all collection)]
      (log/info "Retrieved" (count items) "transactions")
      (response/response {:data items}))
    (catch Exception e
      (log/error e "Failed to retrieve transactions")
      (-> (response/response {:error "Failed to retrieve transactions"})
          (response/status 500)))))

(defn get-by-id
  "Retrieve transaction by ID"
  [id]
  (try
    (if-let [item (db/find-one collection id)]
      (do
        (log/info "Retrieved transaction with ID:" id)
        (response/response {:data item}))
      (do
        (log/warn "Transaction not found with ID:" id)
        (-> (response/response {:error (str "Transaction not found with ID: " id)})
            (response/status 404))))
    (catch Exception e
      (log/error e "Failed to retrieve transaction with ID:" id)
      (-> (response/response {:error (str "Failed to retrieve transaction with ID: " id)})
          (response/status 500)))))

(defn create
  "Create a new transaction"
  [{:keys [body]}]
  (try
    (let [result (db/insert collection body)]
      (log/info "Created new transaction with ID:" (:id result))
      (kafka/send-message "transaction-events" "transaction-created" result)
      (-> (response/response {:data result})
          (response/status 201)
          (response/header "Location" (str "/api/v1/transactions/" (:id result)))))
    (catch Exception e
      (log/error e "Failed to create transaction")
      (-> (response/response {:error "Failed to create transaction"})
          (response/status 500))))) 