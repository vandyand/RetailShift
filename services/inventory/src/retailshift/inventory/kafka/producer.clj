(ns retailshift.inventory.kafka.producer
  (:require [clojure.tools.logging :as log]
            [mount.core :refer [defstate]]
            [cheshire.core :as json]
            [clojure.string :as str]
            [retailshift.inventory.config.core :as config])
  (:import [org.apache.kafka.clients.producer KafkaProducer ProducerConfig ProducerRecord]
           [org.apache.kafka.common.serialization StringSerializer]
           [java.util UUID Properties]))

;; Producer configuration
(defn- create-producer-config
  "Create Kafka producer configuration"
  []
  (let [bootstrap-servers (config/get-config [:kafka :bootstrap-servers])
        client-id (config/get-config [:kafka :producer-client-id])
        props (Properties.)]

    ;; Set required properties
    (doto props
      (.put ProducerConfig/BOOTSTRAP_SERVERS_CONFIG bootstrap-servers)
      (.put ProducerConfig/CLIENT_ID_CONFIG client-id)
      (.put ProducerConfig/KEY_SERIALIZER_CLASS_CONFIG (.getName StringSerializer))
      (.put ProducerConfig/VALUE_SERIALIZER_CLASS_CONFIG (.getName StringSerializer))

      ;; Set idempotence for exactly-once semantics
      (.put ProducerConfig/ENABLE_IDEMPOTENCE_CONFIG "true")
      (.put ProducerConfig/ACKS_CONFIG "all")
      (.put ProducerConfig/RETRIES_CONFIG (str Integer/MAX_VALUE))

      ;; Performance tuning
      (.put ProducerConfig/LINGER_MS_CONFIG "20")
      (.put ProducerConfig/BATCH_SIZE_CONFIG (str (* 32 1024))) ; 32KB batch size
      (.put ProducerConfig/COMPRESSION_TYPE_CONFIG "snappy")

      ;; Buffer memory controls memory used for buffering records
      (.put ProducerConfig/BUFFER_MEMORY_CONFIG (str (* 32 1024 1024))) ; 32MB buffer

      ;; Request timeout
      (.put ProducerConfig/REQUEST_TIMEOUT_MS_CONFIG "30000"))

    props))

;; Kafka producer state
(defstate kafka-producer
  :start (let [config (create-producer-config)]
           (log/info "Starting Kafka producer with bootstrap servers:"
                     (config/get-config [:kafka :bootstrap-servers]))
           (KafkaProducer. config))
  :stop (when kafka-producer
          (log/info "Shutting down Kafka producer")
          (.close kafka-producer)
          (log/info "Kafka producer shut down")))

;; Helper functions
(defn- generate-key
  "Generate a key for a Kafka message"
  [data]
  (or (:id data)
      (str (UUID/randomUUID))))

;; Public functions
(defn publish-event!
  "Publish an event to a Kafka topic"
  [topic data]
  (try
    (let [key (generate-key data)
          value (json/generate-string data)
          record (ProducerRecord. topic key value)]

      (log/debug "Publishing event to topic:" topic "with key:" key)
      (-> kafka-producer
          (.send record)
          (.get))

      (log/debug "Successfully published event to topic:" topic)
      {:success true
       :topic topic
       :key key})
    (catch Exception e
      (log/error e "Failed to publish event to topic:" topic)
      {:success false
       :topic topic
       :error (.getMessage e)})))

(defn publish-inventory-update!
  "Publish inventory update event"
  [product-data]
  (let [topic (config/get-config [:kafka :topics :inventory-updates])]
    (publish-event! topic
                    (merge product-data
                           {:event-type "inventory-update"
                            :timestamp (System/currentTimeMillis)}))))

(defn publish-product-created!
  "Publish product created event"
  [product-data]
  (let [topic (config/get-config [:kafka :topics :inventory-updates])]
    (publish-event! topic
                    (merge product-data
                           {:event-type "product-created"
                            :timestamp (System/currentTimeMillis)}))))

(defn publish-product-updated!
  "Publish product updated event"
  [product-data]
  (let [topic (config/get-config [:kafka :topics :inventory-updates])]
    (publish-event! topic
                    (merge product-data
                           {:event-type "product-updated"
                            :timestamp (System/currentTimeMillis)}))))

(defn publish-product-deleted!
  "Publish product deleted event"
  [product-id]
  (let [topic (config/get-config [:kafka :topics :inventory-updates])]
    (publish-event! topic
                    {:id product-id
                     :event-type "product-deleted"
                     :timestamp (System/currentTimeMillis)})))

(defn publish-purchase-order-status-changed!
  "Publish purchase order status changed event"
  [purchase-order]
  (let [topic (config/get-config [:kafka :topics :purchase-orders])]
    (publish-event! topic
                    (merge (select-keys purchase-order [:id :supplier-id :status :items])
                           {:event-type "purchase-order-status-changed"
                            :timestamp (System/currentTimeMillis)}))))

(defn publish-low-stock-alert!
  "Publish low stock alert event"
  [product-id location-id quantity reorder-level]
  (let [topic (config/get-config [:kafka :topics :inventory-updates])]
    (publish-event! topic
                    {:product-id product-id
                     :location-id location-id
                     :quantity quantity
                     :reorder-level reorder-level
                     :event-type "low-stock-alert"
                     :timestamp (System/currentTimeMillis)}))) 