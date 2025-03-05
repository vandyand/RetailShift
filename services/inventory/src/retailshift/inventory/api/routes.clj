(ns retailshift.inventory.api.routes
  (:require [compojure.api.sweet :refer :all]
            [compojure.route :as route]
            [ring.util.http-response :refer :all]
            [ring.middleware.json :refer [wrap-json-body wrap-json-response]]
            [ring.middleware.defaults :refer [wrap-defaults api-defaults]]
            [schema.core :as s]
            [clojure.tools.logging :as log]
            [retailshift.inventory.db.mongodb :as db]
            [muuntaja.middleware :as middleware]
            [retailshift.inventory.config.core :as config]
            [clojure.string :as str]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.params :refer [wrap-params]]))

;; Swagger documentation
(def swagger-config
  {:ui "/swagger"
   :spec "/swagger.json"
   :options {:ui {:validatorUrl nil}
             :data {:info {:title "Inventory Service API"
                           :description "API for managing inventory in RetailShift"
                           :version "1.0.0"}
                    :tags [{:name "products", :description "Product Operations"}
                           {:name "locations", :description "Inventory Location Operations"}
                           {:name "inventory", :description "Inventory Record Operations"}
                           {:name "purchase-orders", :description "Purchase Order Operations"}
                           {:name "health", :description "Health Check Operations"}]}}})

;; Schemas for request/response validation
(def Product
  {:id s/Str
   :sku s/Str
   :name s/Str
   :description (s/maybe s/Str)
   :category (s/maybe s/Str)
   :price (s/maybe s/Num)
   :cost (s/maybe s/Num)
   :tax-rate (s/maybe s/Num)
   :stock-quantity (s/maybe s/Int)
   :reorder-level (s/maybe s/Int)
   :supplier-id (s/maybe s/Str)
   :dimensions (s/maybe {:width (s/maybe s/Num)
                         :height (s/maybe s/Num)
                         :depth (s/maybe s/Num)
                         :weight (s/maybe s/Num)})
   :attributes (s/maybe {s/Keyword s/Any})
   :images (s/maybe [s/Str])
   :status (s/enum "active" "inactive" "discontinued")
   :tags (s/maybe [s/Str])
   :created-at java.util.Date
   :updated-at java.util.Date})

(def NewProduct
  (dissoc Product :id :created-at :updated-at))

(def ProductUpdate
  (-> Product
      (dissoc :id :created-at :updated-at)
      (s/optional-keys)))

(def Location
  {:id s/Str
   :name s/Str
   :type (s/enum "store" "warehouse" "distribution-center" "supplier")
   :address (s/maybe {:street s/Str
                      :city s/Str
                      :state (s/maybe s/Str)
                      :postal-code s/Str
                      :country s/Str})
   :contact (s/maybe {:name (s/maybe s/Str)
                      :email (s/maybe s/Str)
                      :phone (s/maybe s/Str)})
   :status (s/enum "active" "inactive" "closed")
   :created-at java.util.Date
   :updated-at java.util.Date})

(def NewLocation
  (dissoc Location :id :created-at :updated-at))

(def LocationUpdate
  (-> Location
      (dissoc :id :created-at :updated-at)
      (s/optional-keys)))

(def InventoryRecord
  {:id s/Str
   :product-id s/Str
   :location-id s/Str
   :quantity s/Int
   :minimum-quantity (s/maybe s/Int)
   :maximum-quantity (s/maybe s/Int)
   :last-count-date (s/maybe java.util.Date)
   :status (s/enum "in-stock" "low-stock" "out-of-stock" "over-stock")
   :created-at java.util.Date
   :updated-at java.util.Date})

(def NewInventoryRecord
  (-> (dissoc InventoryRecord :id :status :created-at :updated-at)
      (assoc (s/optional-key :status) (s/enum "in-stock" "low-stock" "out-of-stock" "over-stock"))))

(def InventoryUpdate
  {:quantity s/Int})

(def PurchaseOrderItem
  {:product-id s/Str
   :quantity s/Int
   :unit-price (s/maybe s/Num)
   :location-id (s/maybe s/Str)})

(def PurchaseOrder
  {:id s/Str
   :supplier-id s/Str
   :status (s/enum "pending" "approved" "shipped" "received" "cancelled")
   :order-date java.util.Date
   :expected-delivery-date (s/maybe java.util.Date)
   :actual-delivery-date (s/maybe java.util.Date)
   :items [PurchaseOrderItem]
   :total-amount (s/maybe s/Num)
   :notes (s/maybe s/Str)
   :created-at java.util.Date
   :updated-at java.util.Date})

(def NewPurchaseOrder
  (-> (dissoc PurchaseOrder :id :status :actual-delivery-date :created-at :updated-at)
      (assoc (s/optional-key :status) (s/enum "pending" "approved" "shipped" "received" "cancelled"))))

(def PurchaseOrderStatusUpdate
  {:status (s/enum "pending" "approved" "shipped" "received" "cancelled")})

;; API routes
(defapi app-routes
  {:swagger swagger-config}

  (middleware [middleware/wrap-format
               (wrap-cors
                :access-control-allow-origin [#".*"]
                :access-control-allow-methods [:get :put :post :delete])
               wrap-params]

    ;; Health check route for Kubernetes liveness/readiness probes
              (context "/health" []
                :tags ["health"]

                (GET "/liveness" []
                  :summary "Liveness probe endpoint"
                  (ok {:status "UP"}))

                (GET "/readiness" []
                  :summary "Readiness probe endpoint"
                  (let [mongo-ok? (try
                                    (db/find-product-by-id "test-id")
                                    true
                                    (catch Exception _ false))]
                    (if mongo-ok?
                      (ok {:status "UP"
                           :checks {:mongodb "UP"}})
                      (service-unavailable {:status "DOWN"
                                            :checks {:mongodb "DOWN"}})))))

    ;; API v1 routes
              (context "/api/v1" []

      ;; Product routes
                (context "/products" []
                  :tags ["products"]

                  (GET "/" []
                    :summary "List all products"
                    :query-params [{limit :- s/Int 100}
                                   {offset :- s/Int 0}
                                   {sort :- (s/maybe s/Str) nil}
                                   {category :- (s/maybe s/Str) nil}
                                   {status :- (s/maybe (s/enum "active" "inactive" "discontinued")) nil}]
                    (let [sort-map (when sort
                                     (let [[field dir] (str/split sort #":")
                                           direction (if (= dir "desc") -1 1)]
                                       {(keyword field) direction}))
                          filter-map (cond-> {}
                                       category (assoc :category category)
                                       status (assoc :status status))
                          pagination {:limit limit :skip offset}
                          products (db/list-products filter-map sort-map pagination)]
                      (ok {:data products
                           :metadata {:limit limit
                                      :offset offset
                                      :total (count products)}})))

                  (POST "/" []
                    :summary "Create a new product"
                    :body [product NewProduct]
                    (let [result (db/create-product product)]
                      (if (:error result)
                        (bad-request result)
                        (created (str "/api/v1/products/" (:id result)) result))))

                  (GET "/:id" []
                    :summary "Get product by ID"
                    :path-params [id :- s/Str]
                    (if-let [product (db/find-product-by-id id)]
                      (ok product)
                      (not-found {:error "Product not found"})))

                  (PUT "/:id" []
                    :summary "Update a product"
                    :path-params [id :- s/Str]
                    :body [product-update ProductUpdate]
                    (let [result (db/update-product id product-update)]
                      (if (:error result)
                        (if (= (:error result) "Product not found")
                          (not-found result)
                          (bad-request result))
                        (ok result))))

                  (DELETE "/:id" []
                    :summary "Delete a product"
                    :path-params [id :- s/Str]
                    (let [result (db/delete-product id)]
                      (if (:error result)
                        (not-found result)
                        (no-content)))))

      ;; Location routes
                (context "/locations" []
                  :tags ["locations"]

                  (GET "/" []
                    :summary "List all inventory locations"
                    :query-params [{type :- (s/maybe (s/enum "store" "warehouse" "distribution-center" "supplier")) nil}
                                   {status :- (s/maybe (s/enum "active" "inactive" "closed")) nil}]
                    (let [filter-map (cond-> {}
                                       type (assoc :type type)
                                       status (assoc :status status))
                          locations (db/list-locations filter-map)]
                      (ok locations)))

                  (POST "/" []
                    :summary "Create a new location"
                    :body [location NewLocation]
                    (let [result (db/create-location location)]
                      (if (:error result)
                        (bad-request result)
                        (created (str "/api/v1/locations/" (:id result)) result))))

                  (GET "/:id" []
                    :summary "Get location by ID"
                    :path-params [id :- s/Str]
                    (if-let [location (db/find-location-by-id id)]
                      (ok location)
                      (not-found {:error "Location not found"})))

                  (PUT "/:id" []
                    :summary "Update a location"
                    :path-params [id :- s/Str]
                    :body [location-update LocationUpdate]
                    (let [result (db/update-location id location-update)]
                      (if (:error result)
                        (if (= (:error result) "Inventory location not found")
                          (not-found result)
                          (bad-request result))
                        (ok result)))))

      ;; Inventory routes
                (context "/inventory" []
                  :tags ["inventory"]

                  (GET "/product/:id" []
                    :summary "Get inventory for a specific product across all locations"
                    :path-params [id :- s/Str]
                    (let [records (db/get-inventory-records-by-product id)]
                      (ok records)))

                  (GET "/location/:id" []
                    :summary "Get inventory for a specific location"
                    :path-params [id :- s/Str]
                    (let [records (db/get-inventory-records-by-location id)]
                      (ok records)))

                  (GET "/:product-id/:location-id" []
                    :summary "Get inventory record for a specific product at a location"
                    :path-params [product-id :- s/Str
                                  location-id :- s/Str]
                    (if-let [record (db/find-inventory-record product-id location-id)]
                      (ok record)
                      (not-found {:error "Inventory record not found"})))

                  (POST "/" []
                    :summary "Create or update an inventory record"
                    :body [record NewInventoryRecord]
                    (let [result (db/create-or-update-inventory-record record)]
                      (if (:error result)
                        (bad-request result)
                        (ok result))))

                  (PUT "/:product-id/:location-id" []
                    :summary "Update inventory quantity"
                    :path-params [product-id :- s/Str
                                  location-id :- s/Str]
                    :body [update InventoryUpdate]
                    (let [quantity-change (:quantity update)
                          result (db/update-inventory-quantity product-id location-id quantity-change)]
                      (if (:error result)
                        (if (= (:error result) "Inventory record not found")
                          (not-found result)
                          (bad-request result))
                        (ok result)))))

      ;; Purchase Order routes
                (context "/purchase-orders" []
                  :tags ["purchase-orders"]

                  (GET "/" []
                    :summary "List all purchase orders"
                    :query-params [{supplier-id :- (s/maybe s/Str) nil}
                                   {status :- (s/maybe (s/enum "pending" "approved" "shipped" "received" "cancelled")) nil}]
                    (let [filter-map (cond-> {}
                                       supplier-id (assoc :supplier-id supplier-id)
                                       status (assoc :status status))
                          orders (db/list-purchase-orders filter-map)]
                      (ok orders)))

                  (POST "/" []
                    :summary "Create a new purchase order"
                    :body [order NewPurchaseOrder]
                    (let [result (db/create-purchase-order order)]
                      (if (:error result)
                        (bad-request result)
                        (created (str "/api/v1/purchase-orders/" (:id result)) result))))

                  (GET "/:id" []
                    :summary "Get purchase order by ID"
                    :path-params [id :- s/Str]
                    (if-let [order (db/find-purchase-order-by-id id)]
                      (ok order)
                      (not-found {:error "Purchase order not found"})))

                  (PUT "/:id/status" []
                    :summary "Update purchase order status"
                    :path-params [id :- s/Str]
                    :body [status-update PurchaseOrderStatusUpdate]
                    (let [result (db/update-purchase-order-status id (:status status-update))]
                      (if (:error result)
                        (if (= (:error result) "Purchase order not found")
                          (not-found result)
                          (bad-request result))
                        (ok result))))))))

;; Create the handler with all middleware applied
(def app
  (-> app-routes
      (wrap-defaults (assoc-in api-defaults [:params :nested] true))
      wrap-json-response
      (wrap-json-body {:keywords? true})))

;; Startup function for routes
(defn start-routes []
  (log/info "Starting API routes for inventory service")
  app) 