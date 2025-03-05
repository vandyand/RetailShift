(ns retailshift.inventory.db.mongodb
  (:require [clojure.tools.logging :as log]
            [monger.core :as mg]
            [monger.collection :as mc]
            [monger.operators :refer :all]
            [monger.conversion :refer [from-db-object]]
            [monger.query :as mq]
            [retailshift.inventory.config.core :as config]
            [mount.core :refer [defstate]]
            [clojure.string :as str]
            [retailshift.inventory.models.product :as product]))

;; Collection names
(def products-coll "products")
(def locations-coll "inventory_locations")
(def inventory-records-coll "inventory_records")
(def purchase-orders-coll "purchase_orders")

;; Connection management
(defn connect-to-db
  "Establish a connection to MongoDB"
  []
  (try
    (log/info "Connecting to MongoDB...")
    (let [conn-str (config/get-config [:mongodb :uri])
          {:keys [conn db]} (mg/connect-via-uri conn-str)]
      (log/info "Successfully connected to MongoDB")
      {:conn conn :db db})
    (catch Exception e
      (log/error e "Failed to connect to MongoDB")
      (throw e))))

(defn disconnect
  "Close the MongoDB connection"
  [conn]
  (when conn
    (try
      (log/info "Disconnecting from MongoDB")
      (mg/disconnect conn)
      (log/info "Successfully disconnected from MongoDB")
      (catch Exception e
        (log/error e "Error disconnecting from MongoDB")))))

;; Database state management with mount
(defstate db-connection
  :start (connect-to-db)
  :stop (disconnect (:conn db-connection)))

;; Helper functions
(defn db []
  "Get the database from the current connection"
  (:db db-connection))

(defn conn []
  "Get the current connection"
  (:conn db-connection))

;; Create indexes to ensure performance
(defn ensure-indexes []
  (try
    (log/info "Ensuring MongoDB indexes...")
    ;; Product indexes
    (mc/ensure-index (db) products-coll (array-map :sku 1) {:unique true})
    (mc/ensure-index (db) products-coll (array-map :category 1) {})
    (mc/ensure-index (db) products-coll (array-map :supplier-id 1) {})
    (mc/ensure-index (db) products-coll (array-map :status 1) {})

    ;; Location indexes
    (mc/ensure-index (db) locations-coll (array-map :name 1) {:unique true})
    (mc/ensure-index (db) locations-coll (array-map :type 1) {})

    ;; Inventory record indexes
    (mc/ensure-index (db) inventory-records-coll
                     (array-map :product-id 1 :location-id 1) {:unique true})
    (mc/ensure-index (db) inventory-records-coll (array-map :status 1) {})

    ;; Purchase order indexes
    (mc/ensure-index (db) purchase-orders-coll (array-map :supplier-id 1) {})
    (mc/ensure-index (db) purchase-orders-coll (array-map :status 1) {})
    (mc/ensure-index (db) purchase-orders-coll (array-map :order-date 1) {})

    (log/info "MongoDB indexes created successfully")
    (catch Exception e
      (log/error e "Failed to create MongoDB indexes"))))

;; Product CRUD operations
(defn find-product-by-id
  "Find a product by its ID"
  [id]
  (when-let [product (mc/find-one-as-map (db) products-coll {:id id})]
    product))

(defn find-product-by-sku
  "Find a product by its SKU"
  [sku]
  (when-let [product (mc/find-one-as-map (db) products-coll {:sku sku})]
    product))

(defn list-products
  "List products with optional filtering and pagination"
  ([] (list-products {} nil nil))
  ([filter-map] (list-products filter-map nil nil))
  ([filter-map sort-map] (list-products filter-map sort-map nil))
  ([filter-map sort-map pagination]
   (let [sort-map (or sort-map (array-map :name 1))
         limit (get pagination :limit 100)
         skip (get pagination :skip 0)]
     (mq/with-collection (db) products-coll
       (mq/find filter-map)
       (mq/sort sort-map)
       (mq/limit limit)
       (mq/skip skip)))))

(defn create-product
  "Create a new product in the database"
  [product-data]
  (let [validated-product (product/create-product product-data)]
    (if (product/valid-product? validated-product)
      (try
        (mc/insert-and-return (db) products-coll validated-product)
        (catch Exception e
          (log/error e "Failed to create product")
          (if (str/includes? (.getMessage e) "duplicate key")
            {:error "Product with this SKU already exists"}
            {:error "Database error occurred"})))
      {:error "Invalid product data"
       :validation-errors (product/explain-product product-data)})))

(defn update-product
  "Update an existing product"
  [id product-data]
  (let [existing (find-product-by-id id)]
    (if existing
      (let [updated-data (merge existing
                                (dissoc product-data :id)
                                {:updated-at (java.util.Date.)})
            validated (product/valid-product? updated-data)]
        (if validated
          (try
            (mc/update-by-id (db) products-coll id {$set updated-data})
            (find-product-by-id id)
            (catch Exception e
              (log/error e "Failed to update product")
              {:error "Database error occurred"}))
          {:error "Invalid product data"
           :validation-errors (product/explain-product updated-data)}))
      {:error "Product not found"})))

(defn delete-product
  "Delete a product by ID"
  [id]
  (if (find-product-by-id id)
    (try
      (mc/remove-by-id (db) products-coll id)
      {:success true}
      (catch Exception e
        (log/error e "Failed to delete product")
        {:error "Database error occurred"}))
    {:error "Product not found"}))

;; Inventory Location CRUD operations
(defn find-location-by-id
  "Find a location by its ID"
  [id]
  (when-let [location (mc/find-one-as-map (db) locations-coll {:id id})]
    location))

(defn list-locations
  "List all inventory locations with optional filtering"
  ([] (list-locations {}))
  ([filter-map]
   (mc/find-maps (db) locations-coll filter-map)))

(defn create-location
  "Create a new inventory location"
  [location-data]
  (let [validated-location (product/create-inventory-location location-data)]
    (if (product/valid-inventory-location? validated-location)
      (try
        (mc/insert-and-return (db) locations-coll validated-location)
        (catch Exception e
          (log/error e "Failed to create inventory location")
          (if (str/includes? (.getMessage e) "duplicate key")
            {:error "Location with this name already exists"}
            {:error "Database error occurred"})))
      {:error "Invalid location data"
       :validation-errors (product/explain-inventory-location location-data)})))

(defn update-location
  "Update an existing inventory location"
  [id location-data]
  (let [existing (find-location-by-id id)]
    (if existing
      (let [updated-data (merge existing
                                (dissoc location-data :id)
                                {:updated-at (java.util.Date.)})
            validated (product/valid-inventory-location? updated-data)]
        (if validated
          (try
            (mc/update-by-id (db) locations-coll id {$set updated-data})
            (find-location-by-id id)
            (catch Exception e
              (log/error e "Failed to update inventory location")
              {:error "Database error occurred"}))
          {:error "Invalid location data"
           :validation-errors (product/explain-inventory-location updated-data)}))
      {:error "Inventory location not found"})))

;; Inventory Record operations
(defn find-inventory-record
  "Find inventory record by product and location IDs"
  [product-id location-id]
  (mc/find-one-as-map (db) inventory-records-coll
                      {:product-id product-id :location-id location-id}))

(defn get-inventory-records-by-product
  "Get all inventory records for a specific product"
  [product-id]
  (mc/find-maps (db) inventory-records-coll {:product-id product-id}))

(defn get-inventory-records-by-location
  "Get all inventory records for a specific location"
  [location-id]
  (mc/find-maps (db) inventory-records-coll {:location-id location-id}))

(defn create-or-update-inventory-record
  "Create or update an inventory record"
  [record-data]
  (let [validated-record (product/create-inventory-record record-data)]
    (if (product/valid-inventory-record? validated-record)
      (let [{:keys [product-id location-id]} validated-record
            existing (find-inventory-record product-id location-id)]
        (try
          (if existing
            ;; Update existing record
            (let [updated-data (merge existing
                                      (dissoc validated-record :id)
                                      {:updated-at (java.util.Date.)})
                  id (:id existing)]
              (mc/update-by-id (db) inventory-records-coll id {$set updated-data})
              (find-inventory-record product-id location-id))
            ;; Create new record
            (mc/insert-and-return (db) inventory-records-coll validated-record))
          (catch Exception e
            (log/error e "Failed to create/update inventory record")
            {:error "Database error occurred"})))
      {:error "Invalid inventory record data"
       :validation-errors (product/explain-inventory-record record-data)})))

(defn update-inventory-quantity
  "Update inventory quantity for a product at a location"
  [product-id location-id quantity-change]
  (let [record (find-inventory-record product-id location-id)]
    (if record
      (try
        (let [current-qty (:quantity record)
              new-qty (+ current-qty quantity-change)
              status (product/calculate-inventory-status new-qty
                                                         (:minimum-quantity record)
                                                         (:maximum-quantity record))
              updated-data {:quantity new-qty
                            :status status
                            :updated-at (java.util.Date.)}]
          (mc/update-by-id (db) inventory-records-coll (:id record)
                           {$set updated-data})
          (find-inventory-record product-id location-id))
        (catch Exception e
          (log/error e "Failed to update inventory quantity")
          {:error "Database error occurred"}))
      {:error "Inventory record not found"})))

;; Purchase Order operations
(defn find-purchase-order-by-id
  "Find a purchase order by its ID"
  [id]
  (when-let [order (mc/find-one-as-map (db) purchase-orders-coll {:id id})]
    order))

(defn list-purchase-orders
  "List purchase orders with optional filtering"
  ([] (list-purchase-orders {}))
  ([filter-map]
   (mc/find-maps (db) purchase-orders-coll filter-map)))

(defn create-purchase-order
  "Create a new purchase order"
  [order-data]
  (let [validated-order (product/create-purchase-order order-data)]
    (if (product/valid-purchase-order? validated-order)
      (try
        (mc/insert-and-return (db) purchase-orders-coll validated-order)
        (catch Exception e
          (log/error e "Failed to create purchase order")
          {:error "Database error occurred"}))
      {:error "Invalid purchase order data"
       :validation-errors (product/explain-purchase-order order-data)})))

(defn update-purchase-order-status
  "Update the status of a purchase order"
  [id new-status]
  (let [order (find-purchase-order-by-id id)
        valid-statuses #{"pending" "approved" "shipped" "received" "cancelled"}]
    (cond
      (not order)
      {:error "Purchase order not found"}

      (not (contains? valid-statuses new-status))
      {:error "Invalid status. Must be one of: pending, approved, shipped, received, cancelled"}

      :else
      (try
        (mc/update-by-id (db) purchase-orders-coll id
                         {$set {:status new-status
                                :updated-at (java.util.Date.)}})
        (let [updated-order (find-purchase-order-by-id id)]
          ;; If status is "received", update inventory quantities
          (when (= new-status "received")
            (doseq [item (:items updated-order)]
              (let [{:keys [product-id quantity location-id]} item]
                (when location-id
                  (update-inventory-quantity product-id location-id quantity)))))
          updated-order)
        (catch Exception e
          (log/error e "Failed to update purchase order status")
          {:error "Database error occurred"})))))

;; Initial setup
(defn init-db!
  "Initialize the database with necessary collections and indexes"
  []
  (log/info "Initializing MongoDB for the inventory service")
  (ensure-indexes)
  (log/info "MongoDB initialization complete")) 