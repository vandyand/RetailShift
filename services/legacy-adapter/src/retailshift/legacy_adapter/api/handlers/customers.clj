(ns retailshift.legacy-adapter.api.handlers.customers
  (:require [clojure.tools.logging :as log]
            [ring.util.response :as response]
            [retailshift.legacy-adapter.db.mongodb :as db]
            [retailshift.legacy-adapter.kafka.producer :as kafka]))

(def collection "customers")

(defn get-all
  "Retrieve all customers"
  []
  (try
    (let [items (db/find-all collection)]
      (log/info "Retrieved" (count items) "customers")
      (response/response {:data items}))
    (catch Exception e
      (log/error e "Failed to retrieve customers")
      (-> (response/response {:error "Failed to retrieve customers"})
          (response/status 500)))))

(defn get-by-id
  "Retrieve customer by ID"
  [id]
  (try
    (if-let [item (db/find-one collection id)]
      (do
        (log/info "Retrieved customer with ID:" id)
        (response/response {:data item}))
      (do
        (log/warn "Customer not found with ID:" id)
        (-> (response/response {:error (str "Customer not found with ID: " id)})
            (response/status 404))))
    (catch Exception e
      (log/error e "Failed to retrieve customer with ID:" id)
      (-> (response/response {:error (str "Failed to retrieve customer with ID: " id)})
          (response/status 500)))))

(defn create
  "Create a new customer"
  [{:keys [body]}]
  (try
    (let [result (db/insert collection body)]
      (log/info "Created new customer with ID:" (:id result))
      (kafka/send-message "customer-events" "customer-created" result)
      (-> (response/response {:data result})
          (response/status 201)
          (response/header "Location" (str "/api/v1/customers/" (:id result)))))
    (catch Exception e
      (log/error e "Failed to create customer")
      (-> (response/response {:error "Failed to create customer"})
          (response/status 500)))))

(defn update
  "Update an existing customer"
  [id {:keys [body]}]
  (try
    (if-let [result (db/update-by-id collection id body)]
      (do
        (log/info "Updated customer with ID:" id)
        (kafka/send-message "customer-events" "customer-updated" result)
        (response/response {:data result}))
      (do
        (log/warn "Customer not found for update with ID:" id)
        (-> (response/response {:error (str "Customer not found with ID: " id)})
            (response/status 404))))
    (catch Exception e
      (log/error e "Failed to update customer with ID:" id)
      (-> (response/response {:error (str "Failed to update customer with ID: " id)})
          (response/status 500))))) 