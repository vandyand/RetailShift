(ns retailshift.inventory.models.product
  (:require [malli.core :as m]
            [malli.error :as me]
            [malli.transform :as mt]))

;; Define the product schema using malli
(def Product
  [:map
   [:id :string]
   [:sku :string]
   [:name :string]
   [:description {:optional true} :string]
   [:category :string]
   [:price :double]
   [:cost {:optional true} :double]
   [:tax-rate {:optional true} :double]
   [:stock-quantity :int]
   [:reorder-level {:optional true} :int]
   [:supplier-id {:optional true} :string]
   [:dimensions {:optional true}
    [:map
     [:width {:optional true} :double]
     [:height {:optional true} :double]
     [:depth {:optional true} :double]
     [:weight {:optional true} :double]
     [:unit {:optional true} [:enum "cm" "in" "mm"]]]]
   [:attributes {:optional true}
    [:map-of :keyword :any]]
   [:images {:optional true}
    [:sequential :string]]
   [:status [:enum "active" "discontinued" "out-of-stock"]]
   [:tags {:optional true}
    [:sequential :string]]
   [:created-at inst?]
   [:updated-at inst?]])

;; Define the inventory location schema
(def InventoryLocation
  [:map
   [:id :string]
   [:name :string]
   [:type [:enum "store" "warehouse" "supplier"]]
   [:address {:optional true}
    [:map
     [:street {:optional true} :string]
     [:city {:optional true} :string]
     [:state {:optional true} :string]
     [:country {:optional true} :string]
     [:postal-code {:optional true} :string]]]
   [:contact {:optional true}
    [:map
     [:name {:optional true} :string]
     [:email {:optional true} :string]
     [:phone {:optional true} :string]]]
   [:status [:enum "active" "inactive"]]
   [:created-at inst?]
   [:updated-at inst?]])

;; Define the inventory record schema (product quantity at a specific location)
(def InventoryRecord
  [:map
   [:id :string]
   [:product-id :string]
   [:location-id :string]
   [:quantity :int]
   [:minimum-quantity {:optional true} :int]
   [:maximum-quantity {:optional true} :int]
   [:last-count-date {:optional true} inst?]
   [:status [:enum "in-stock" "low-stock" "out-of-stock" "overstocked"]]
   [:created-at inst?]
   [:updated-at inst?]])

;; Define purchase order schema
(def PurchaseOrder
  [:map
   [:id :string]
   [:supplier-id :string]
   [:status [:enum "draft" "submitted" "approved" "shipped" "received" "cancelled"]]
   [:order-date inst?]
   [:expected-delivery-date {:optional true} inst?]
   [:actual-delivery-date {:optional true} inst?]
   [:items
    [:sequential
     [:map
      [:product-id :string]
      [:quantity :int]
      [:unit-cost :double]
      [:total-cost :double]]]]
   [:total-amount :double]
   [:notes {:optional true} :string]
   [:created-at inst?]
   [:updated-at inst?]])

;; Function to validate a product against the schema
(defn validate-product
  [product]
  (if (m/validate Product product)
    {:valid true}
    {:valid false
     :errors (me/humanize (m/explain Product product))}))

;; Function to validate an inventory location against the schema
(defn validate-inventory-location
  [location]
  (if (m/validate InventoryLocation location)
    {:valid true}
    {:valid false
     :errors (me/humanize (m/explain InventoryLocation location))}))

;; Function to validate an inventory record against the schema
(defn validate-inventory-record
  [record]
  (if (m/validate InventoryRecord record)
    {:valid true}
    {:valid false
     :errors (me/humanize (m/explain InventoryRecord record))}))

;; Function to validate a purchase order against the schema
(defn validate-purchase-order
  [order]
  (if (m/validate PurchaseOrder order)
    {:valid true}
    {:valid false
     :errors (me/humanize (m/explain PurchaseOrder order))}))

;; Function to create a product with timestamps
(defn create-product
  [product-data]
  (let [now (java.util.Date.)
        product (merge product-data
                       {:created-at now
                        :updated-at now})]
    (if (:id product)
      product
      (assoc product :id (str (java.util.UUID/randomUUID))))))

;; Function to create an inventory location with timestamps
(defn create-inventory-location
  [location-data]
  (let [now (java.util.Date.)
        location (merge location-data
                        {:created-at now
                         :updated-at now})]
    (if (:id location)
      location
      (assoc location :id (str (java.util.UUID/randomUUID))))))

;; Function to create an inventory record with timestamps
(defn create-inventory-record
  [record-data]
  (let [now (java.util.Date.)
        record (merge record-data
                      {:created-at now
                       :updated-at now})]
    (if (:id record)
      record
      (assoc record :id (str (java.util.UUID/randomUUID))))))

;; Function to create a purchase order with timestamps
(defn create-purchase-order
  [order-data]
  (let [now (java.util.Date.)
        order (merge order-data
                     {:created-at now
                      :updated-at now
                      :order-date now})]
    (if (:id order)
      order
      (assoc order :id (str (java.util.UUID/randomUUID))))))

;; Helper function to calculate inventory status based on quantity and thresholds
(defn calculate-inventory-status
  [quantity min-quantity max-quantity]
  (cond
    (<= quantity 0) "out-of-stock"
    (< quantity min-quantity) "low-stock"
    (> quantity max-quantity) "overstocked"
    :else "in-stock")) 