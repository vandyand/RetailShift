(ns retailshift.inventory.service.core
  (:require [clojure.tools.logging :as log]
            [retailshift.inventory.db.mongodb :as db]
            [retailshift.inventory.kafka.producer :as producer]
            [retailshift.inventory.models.product :as product]
            [retailshift.inventory.config.core :as config]))

;; Product services
(defn create-product
  "Create a product and publish event"
  [product-data]
  (let [result (db/create-product product-data)]
    (when (and result (not (:error result)))
      (producer/publish-product-created! result))
    result))

(defn update-product
  "Update a product and publish event"
  [id product-data]
  (let [result (db/update-product id product-data)]
    (when (and result (not (:error result)))
      (producer/publish-product-updated! result))
    result))

(defn delete-product
  "Delete a product and publish event"
  [id]
  (let [product (db/find-product-by-id id)
        result (db/delete-product id)]
    (when (and product (not (:error result)))
      (producer/publish-product-deleted! id))
    result))

;; Inventory location services
(defn create-location
  "Create a new inventory location"
  [location-data]
  (db/create-location location-data))

(defn update-location
  "Update an inventory location"
  [id location-data]
  (db/update-location id location-data))

;; Inventory record services
(defn create-inventory-record
  "Create or update an inventory record"
  [record-data]
  (let [result (db/create-or-update-inventory-record record-data)]
    (when (and result (not (:error result)))
      (let [{:keys [product-id location-id quantity minimum-quantity]} result]
        ;; Check for low stock alert
        (when (and minimum-quantity (< quantity minimum-quantity))
          (let [product (db/find-product-by-id product-id)]
            (producer/publish-low-stock-alert!
             product-id
             location-id
             quantity
             (:reorder-level product))))))
    result))

(defn update-inventory-quantity
  "Update inventory quantity and publish events"
  [product-id location-id quantity-change]
  (let [result (db/update-inventory-quantity product-id location-id quantity-change)]
    (when (and result (not (:error result)))
      (let [{:keys [quantity minimum-quantity status]} result
            product (db/find-product-by-id product-id)]
        ;; Publish inventory update
        (producer/publish-inventory-update!
         {:product-id product-id
          :location-id location-id
          :quantity quantity
          :status status})

        ;; Check for low stock alert
        (when (and minimum-quantity (< quantity minimum-quantity))
          (producer/publish-low-stock-alert!
           product-id
           location-id
           quantity
           (:reorder-level product)))))
    result))

;; Purchase order services
(defn create-purchase-order
  "Create a new purchase order"
  [order-data]
  (let [result (db/create-purchase-order order-data)]
    (when (and result (not (:error result)))
      (producer/publish-purchase-order-status-changed! result))
    result))

(defn update-purchase-order-status
  "Update purchase order status and publish event"
  [id new-status]
  (let [result (db/update-purchase-order-status id new-status)]
    (when (and result (not (:error result)))
      (producer/publish-purchase-order-status-changed! result))
    result))

;; Bulk operations with error handling
(defn bulk-import-products
  "Import multiple products from a collection"
  [products]
  (try
    (log/info "Starting bulk import of" (count products) "products")
    (let [results (map create-product products)
          success-count (count (filter #(not (:error %)) results))
          error-count (count (filter :error results))]
      (log/info "Bulk import completed. Successes:" success-count "Errors:" error-count)
      {:success true
       :total (count products)
       :success-count success-count
       :error-count error-count
       :errors (filter :error results)})
    (catch Exception e
      (log/error e "Failed during bulk import of products")
      {:success false
       :error (.getMessage e)})))

;; Stock level analysis
(defn analyze-inventory-levels
  "Analyze inventory levels across all products and locations"
  []
  (try
    (log/info "Starting inventory level analysis")
    (let [all-products (db/list-products)
          inventory-status-counts (atom {:in-stock 0
                                         :low-stock 0
                                         :out-of-stock 0
                                         :over-stock 0})
          product-analyses (doall
                            (for [product all-products]
                              (let [records (db/get-inventory-records-by-product (:id product))
                                    total-quantity (reduce + (map :quantity records))
                                    avg-status (if (empty? records)
                                                 "unknown"
                                                 (let [statuses (frequencies (map :status records))
                                                       most-common (key (apply max-key val statuses))]
                                                   (swap! inventory-status-counts update (keyword most-common) inc)
                                                   most-common))]
                                {:product-id (:id product)
                                 :product-name (:name product)
                                 :total-quantity total-quantity
                                 :location-count (count records)
                                 :predominant-status avg-status})))]
      (log/info "Inventory analysis completed for" (count product-analyses) "products")
      {:success true
       :analysis-date (java.util.Date.)
       :product-count (count all-products)
       :inventory-status-summary @inventory-status-counts
       :product-analyses product-analyses})
    (catch Exception e
      (log/error e "Failed during inventory level analysis")
      {:success false
       :error (.getMessage e)})))

;; Data export service
(defn export-inventory-data
  "Export inventory data in the specified format"
  [format]
  (try
    (log/info "Exporting inventory data in format:" format)
    (let [products (db/list-products)
          inventory-records (mapcat
                             #(db/get-inventory-records-by-product (:id %))
                             products)
          data {:products products
                :inventory-records inventory-records
                :export-date (java.util.Date.)
                :version "1.0"}
          export-result (case format
                          "json" {:data (cheshire.core/generate-string data)
                                  :content-type "application/json"}
                          "edn" {:data (pr-str data)
                                 :content-type "application/edn"}
                          "csv" {:data (str "id,name,sku,category,price,quantity\n"
                                            (clojure.string/join "\n"
                                                                 (for [p products]
                                                                   (str (:id p) ","
                                                                        (:name p) ","
                                                                        (:sku p) ","
                                                                        (:category p) ","
                                                                        (:price p) ","
                                                                        (:stock-quantity p)))))
                                 :content-type "text/csv"}
                          {:error (str "Unsupported format: " format)})]
      (if (:error export-result)
        export-result
        (do
          (log/info "Successfully exported" (count products) "products in" format "format")
          export-result)))
    (catch Exception e
      (log/error e "Failed to export inventory data")
      {:error (.getMessage e)}))) 