(ns retailshift.legacy-adapter.api.handlers.inventory
  (:require [clojure.tools.logging :as log]
            [ring.util.response :as response]
            [retailshift.legacy-adapter.db.mongodb :as db]
            [retailshift.legacy-adapter.kafka.producer :as kafka]))

(def collection "inventory")

(defn get-all
  "Retrieve all inventory items"
  []
  (try
    (let [items (db/find-all collection)]
      (log/info "Retrieved" (count items) "inventory items")
      (response/response {:data items}))
    (catch Exception e
      (log/error e "Failed to retrieve inventory items")
      (-> (response/response {:error "Failed to retrieve inventory items"})
          (response/status 500)))))

(defn get-by-id
  "Retrieve inventory item by ID"
  [id]
  (try
    (if-let [item (db/find-one collection id)]
      (do
        (log/info "Retrieved inventory item with ID:" id)
        (response/response {:data item}))
      (do
        (log/warn "Inventory item not found with ID:" id)
        (-> (response/response {:error (str "Inventory item not found with ID: " id)})
            (response/status 404))))
    (catch Exception e
      (log/error e "Failed to retrieve inventory item with ID:" id)
      (-> (response/response {:error (str "Failed to retrieve inventory item with ID: " id)})
          (response/status 500)))))

(defn create
  "Create a new inventory item"
  [{:keys [body]}]
  (try
    (let [result (db/insert collection body)]
      (log/info "Created new inventory item with ID:" (:id result))
      (kafka/send-message "inventory-events" "inventory-created" result)
      (-> (response/response {:data result})
          (response/status 201)
          (response/header "Location" (str "/api/v1/inventory/" (:id result)))))
    (catch Exception e
      (log/error e "Failed to create inventory item")
      (-> (response/response {:error "Failed to create inventory item"})
          (response/status 500)))))

(defn update
  "Update an existing inventory item"
  [id {:keys [body]}]
  (try
    (if-let [result (db/update-by-id collection id body)]
      (do
        (log/info "Updated inventory item with ID:" id)
        (kafka/send-message "inventory-events" "inventory-updated" result)
        (response/response {:data result}))
      (do
        (log/warn "Inventory item not found for update with ID:" id)
        (-> (response/response {:error (str "Inventory item not found with ID: " id)})
            (response/status 404))))
    (catch Exception e
      (log/error e "Failed to update inventory item with ID:" id)
      (-> (response/response {:error (str "Failed to update inventory item with ID: " id)})
          (response/status 500))))) 