(ns retailshift.inventory.utils.validation
  (:require [clojure.tools.logging :as log]
            [clojure.string :as str]
            [retailshift.inventory.models.product :as model]))

;; Helper functions for common data validation
(defn sanitize-string
  "Sanitize a string by trimming whitespace and removing invalid characters"
  [s]
  (when s
    (-> s
        str/trim
        (str/replace #"[^\p{L}\p{N}\p{P}\p{Z}]" ""))))

(defn sanitize-number
  "Convert a value to a valid number or return nil"
  [n]
  (cond
    (number? n) n
    (string? n) (try
                  (let [s (str/trim n)]
                    (if (str/blank? s)
                      nil
                      (read-string s)))
                  (catch Exception _ nil))
    :else nil))

(defn sanitize-map
  "Recursively sanitize a map's string values and convert string numbers to actual numbers"
  [m]
  (into {}
        (for [[k v] m]
          [k (cond
               (string? v) (sanitize-string v)
               (map? v) (sanitize-map v)
               (vector? v) (mapv (fn [item]
                                   (if (map? item)
                                     (sanitize-map item)
                                     item))
                                 v)
               :else v)])))

;; SKU normalization
(defn normalize-sku
  "Normalize a SKU by removing special characters and converting to uppercase"
  [sku]
  (when sku
    (-> sku
        str/trim
        str/upper-case
        (str/replace #"[^A-Z0-9-]" ""))))

;; Category path normalization
(defn normalize-category
  "Normalize category string to a consistent format"
  [category]
  (when category
    (-> category
        str/trim
        (str/replace #"\s*>\s*" "/")
        (str/replace #"\s+" "-")
        str/lower-case)))

;; Pricing calculations
(defn calculate-tax
  "Calculate tax amount based on price and tax rate"
  [price tax-rate]
  (when (and price tax-rate)
    (let [price (sanitize-number price)
          tax-rate (sanitize-number tax-rate)]
      (when (and price tax-rate)
        (BigDecimal. (format "%.2f" (* price (/ tax-rate 100))))))))

(defn calculate-total-price
  "Calculate total price including tax"
  [price tax-rate]
  (when price
    (let [price (sanitize-number price)
          tax (if tax-rate
                (calculate-tax price tax-rate)
                0)]
      (when price
        (+ price (or tax 0))))))

;; Product data validation and transformation
(defn prepare-product-data
  "Prepare and validate product data for storage"
  [data]
  (try
    (let [sanitized (sanitize-map data)
          prepared (cond-> sanitized
                     (:sku sanitized) (update :sku normalize-sku)
                     (:category sanitized) (update :category normalize-category))]
      (if (model/valid-product? prepared)
        {:valid true :data prepared}
        {:valid false :errors (model/explain-product prepared)}))
    (catch Exception e
      (log/error e "Error preparing product data")
      {:valid false :errors ["Invalid data format"]})))

;; Inventory data validation and transformations
(defn prepare-inventory-record
  "Prepare and validate inventory record data"
  [data]
  (try
    (let [sanitized (sanitize-map data)
          prepared (assoc sanitized :quantity (max 0 (or (:quantity sanitized) 0)))]
      (if (model/valid-inventory-record? prepared)
        {:valid true :data prepared}
        {:valid false :errors (model/explain-inventory-record prepared)}))
    (catch Exception e
      (log/error e "Error preparing inventory record data")
      {:valid false :errors ["Invalid data format"]})))

;; Purchase order validation
(defn prepare-purchase-order
  "Prepare and validate purchase order data"
  [data]
  (try
    (let [sanitized (sanitize-map data)
          items (map sanitize-map (:items sanitized))
          prepared (assoc sanitized :items items)
          total-amount (reduce + (map #(* (or (:unit-price %) 0) (:quantity %)) items))
          prepared (assoc prepared :total-amount total-amount)]
      (if (model/valid-purchase-order? prepared)
        {:valid true :data prepared}
        {:valid false :errors (model/explain-purchase-order prepared)}))
    (catch Exception e
      (log/error e "Error preparing purchase order data")
      {:valid false :errors ["Invalid data format"]})))

;; CSV data parsing
(defn parse-csv-line
  "Parse a CSV line into a map with the given headers"
  [headers line]
  (try
    (let [values (str/split line #",")
          pairs (map vector headers values)]
      (into {} pairs))
    (catch Exception e
      (log/error e "Error parsing CSV line:" line)
      nil)))

(defn parse-csv
  "Parse a CSV string into a collection of maps"
  [csv-content]
  (try
    (let [lines (str/split-lines csv-content)
          headers (map keyword (str/split (first lines) #","))
          data-lines (rest lines)]
      (filter identity (map #(parse-csv-line headers %) data-lines)))
    (catch Exception e
      (log/error e "Error parsing CSV content")
      [])))

;; JSON data utilities
(defn parse-json
  "Parse JSON string with error handling"
  [json-content]
  (try
    {:valid true :data (cheshire.core/parse-string json-content true)}
    (catch Exception e
      (log/error e "Error parsing JSON content")
      {:valid false :error "Invalid JSON format"})))

;; Data conversion utilities
(defn convert-to-csv
  "Convert a collection of maps to CSV format"
  [records]
  (when (seq records)
    (let [headers (keys (first records))
          header-line (str/join "," (map name headers))
          data-lines (for [record records]
                       (str/join "," (map #(get record %) headers)))]
      (str/join "\n" (cons header-line data-lines)))))

;; Date utilities
(defn valid-date?
  "Check if a string is a valid date"
  [date-str]
  (try
    (java.time.LocalDate/parse date-str)
    true
    (catch Exception _
      false)))

(defn parse-date
  "Parse a date string to a java.util.Date"
  [date-str]
  (try
    (-> date-str
        java.time.LocalDate/parse
        (.atStartOfDay (java.time.ZoneId/systemDefault))
        java.util.Date/from)
    (catch Exception _
      nil))) 