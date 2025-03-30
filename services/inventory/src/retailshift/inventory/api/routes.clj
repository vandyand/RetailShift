(ns retailshift.inventory.api.routes
  (:require [compojure.core :refer [defroutes GET POST PUT DELETE context]]
            [compojure.route :as route]
            [ring.util.http-response :refer :all]
            [ring.middleware.json :refer [wrap-json-body wrap-json-response]]
            [ring.middleware.defaults :refer [wrap-defaults api-defaults]]
            [schema.core :as s]
            [clojure.tools.logging :as log]
            [retailshift.inventory.db.mongodb :as db]
            [muuntaja.middleware :as muuntaja]
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
  (-> (dissoc Product :id :created-at :updated-at)
      (select-keys [:sku :name :description :category :price :cost :tax-rate
                    :stock-quantity :reorder-level :supplier-id :dimensions
                    :attributes :images :status :tags])
      (->> (reduce-kv (fn [m k v] (assoc m (s/optional-key k) v)) {}))))

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
  (-> (dissoc Location :id :created-at :updated-at)
      (select-keys [:name :type :address :contact :status])
      (->> (reduce-kv (fn [m k v] (assoc m (s/optional-key k) v)) {}))))

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

;; Simplified API routes
(defroutes app-routes
  ;; Health check routes
  (context "/health" []
    (GET "/liveness" []
      (ok {:status "UP"}))

    (GET "/readiness" []
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
      (GET "/" []
        (let [products (db/list-products {} nil nil)]
          (ok {:data products})))

      (POST "/" {product :body}
        (let [result (db/create-product product)]
          (if (:error result)
            (bad-request result)
            (created (str "/api/v1/products/" (:id result)) result))))

      (GET "/:id" [id]
        (if-let [product (db/find-product-by-id id)]
          (ok product)
          (not-found {:error "Product not found"})))

      (PUT "/:id" [id :as {product-update :body}]
        (let [result (db/update-product id product-update)]
          (if (:error result)
            (if (= (:error result) "Product not found")
              (not-found result)
              (bad-request result))
            (ok result))))

      (DELETE "/:id" [id]
        (let [result (db/delete-product id)]
          (if (:error result)
            (not-found result)
            (no-content))))))

  ;; Default route for unmatched paths
  (route/not-found {:error "Not Found"}))

;; Create middleware-wrapped handler
(def app
  (-> app-routes
      (wrap-cors :access-control-allow-origin [#".*"]
                 :access-control-allow-methods [:get :put :post :delete])
      (wrap-json-response)
      (wrap-json-body {:keywords? true})
      (wrap-params)))

;; Startup function for routes
(defn start
  []
  (log/info "Starting inventory API routes")
  (log/info "Routes configured and ready to serve requests")
  app) 