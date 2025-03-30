(ns retailshift.inventory.kafka.consumer
  (:require [clojure.tools.logging :as log]
            [retailshift.inventory.config.core :as config]
            [retailshift.inventory.db.mongodb :as mongodb]
            [retailshift.inventory.models.product :as product]
            [cheshire.core :as json]
            [mount.core :refer [defstate]])
  (:import [org.apache.kafka.clients.consumer KafkaConsumer ConsumerConfig ConsumerRecord ConsumerRecords]
           [org.apache.kafka.common.serialization StringDeserializer]
           [java.time Duration]
           [java.util Properties]
           [java.util.concurrent Executors TimeUnit]))

(defn- get-config-with-default
  "Get a configuration value with a default fallback"
  [path default]
  (let [value (config/get-config path)]
    (if (nil? value) default value)))

(defn- create-consumer-config
  "Create Kafka consumer configuration"
  []
  (let [props (Properties.)]
    (.put props ConsumerConfig/BOOTSTRAP_SERVERS_CONFIG
          (config/get-config [:kafka :bootstrap-servers]))
    (.put props ConsumerConfig/GROUP_ID_CONFIG
          (get-config-with-default [:kafka :group-id] "retailshift-inventory"))
    (.put props ConsumerConfig/KEY_DESERIALIZER_CLASS_CONFIG
          (.getName StringDeserializer))
    (.put props ConsumerConfig/VALUE_DESERIALIZER_CLASS_CONFIG
          (.getName StringDeserializer))
    (.put props ConsumerConfig/AUTO_OFFSET_RESET_CONFIG
          (get-config-with-default [:kafka :auto-offset-reset] "earliest"))
    (.put props ConsumerConfig/ENABLE_AUTO_COMMIT_CONFIG
          (str (get-config-with-default [:kafka :enable-auto-commit] "true")))
    (.put props ConsumerConfig/AUTO_COMMIT_INTERVAL_MS_CONFIG
          (str (get-config-with-default [:kafka :auto-commit-interval-ms] "1000")))
    (.put props ConsumerConfig/SESSION_TIMEOUT_MS_CONFIG
          (str (get-config-with-default [:kafka :session-timeout-ms] "30000")))
    (.put props ConsumerConfig/MAX_POLL_RECORDS_CONFIG
          (str (get-config-with-default [:kafka :max-poll-records] "500")))
    props))

(defn- process-inventory-update
  "Process an inventory update event"
  [event]
  (try
    (log/info "Processing inventory update event:" (:id (:data event)))
    (let [product-data (:data event)
          product-id (:id product-data)
          ; Check if product exists in the database
          existing-product (mongodb/find-product-by-id product-id)]
      (if existing-product
        ; Update existing product
        (let [updated-product (assoc product-data :updated-at (java.util.Date.))
              validation (product/validate-product updated-product)]
          (if (:valid validation)
            (do
              (mongodb/update-product product-id updated-product)
              (log/info "Updated product:" product-id))
            (log/error "Invalid product data:" validation)))
        ; Create new product
        (let [new-product (product/create-product product-data)
              validation (product/validate-product new-product)]
          (if (:valid validation)
            (do
              (mongodb/create-product new-product)
              (log/info "Created new product:" (:id new-product)))
            (log/error "Invalid product data:" validation)))))
    (catch Exception e
      (log/error e "Error processing inventory update event"))))

(defn- process-transaction-created
  "Process a transaction created event to update inventory quantities"
  [event]
  (try
    (log/info "Processing transaction event:" (:id (:data event)))
    (let [transaction (:data event)
          items (:items transaction)]
      (doseq [item items]
        (let [product-id (:product-id item)
              quantity (:quantity item)
              ; Get current inventory record
              inventory-record (mongodb/find-inventory-record
                                product-id
                                (:location-id transaction))]
          (if inventory-record
            ; Update inventory quantity
            (let [current-quantity (:quantity inventory-record)
                  new-quantity (- current-quantity quantity)
                  min-quantity (:minimum-quantity inventory-record 5)
                  max-quantity (:maximum-quantity inventory-record 100)
                  status (product/calculate-inventory-status new-quantity min-quantity max-quantity)
                  updated-record (assoc inventory-record
                                        :quantity new-quantity
                                        :status status
                                        :updated-at (java.util.Date.))]
              (mongodb/create-or-update-inventory-record updated-record)
              (log/info "Updated inventory for product:" product-id
                        "New quantity:" new-quantity
                        "Status:" status))
            (log/warn "No inventory record found for product:" product-id)))))
    (catch Exception e
      (log/error e "Error processing transaction event"))))

(defn- process-purchase-order-received
  "Process a purchase order received event to increase inventory"
  [event]
  (try
    (log/info "Processing purchase order received event:" (:id (:data event)))
    (let [purchase-order (:data event)
          items (:items purchase-order)]
      (doseq [item items]
        (let [product-id (:product-id item)
              quantity (:quantity item)
              ; Get current inventory record
              inventory-record (mongodb/find-inventory-record
                                product-id
                                (:location-id purchase-order))]
          (if inventory-record
            ; Update inventory quantity
            (let [current-quantity (:quantity inventory-record)
                  new-quantity (+ current-quantity quantity)
                  min-quantity (:minimum-quantity inventory-record 5)
                  max-quantity (:maximum-quantity inventory-record 100)
                  status (product/calculate-inventory-status new-quantity min-quantity max-quantity)
                  updated-record (assoc inventory-record
                                        :quantity new-quantity
                                        :status status
                                        :updated-at (java.util.Date.))]
              (mongodb/create-or-update-inventory-record updated-record)
              (log/info "Updated inventory for product:" product-id
                        "New quantity:" new-quantity
                        "Status:" status))
            (log/warn "No inventory record found for product:" product-id)))))
    (catch Exception e
      (log/error e "Error processing purchase order event"))))

(defn- process-record
  "Process a Kafka consumer record"
  [^ConsumerRecord record]
  (try
    (let [key (.key record)
          value (.value record)
          event (json/parse-string value true)]
      (log/debug "Received Kafka message - Key:" key "Topic:" (.topic record))
      (case (:type event)
        "inventory_update" (process-inventory-update event)
        "transaction_created" (process-transaction-created event)
        "purchase_order_received" (process-purchase-order-received event)
        (log/warn "Unknown event type:" (:type event))))
    (catch Exception e
      (log/error e "Error processing Kafka record"))))

(defn- poll-messages
  "Poll for messages from Kafka topics"
  [^KafkaConsumer consumer running?]
  (try
    (while @running?
      (let [records (.poll consumer (Duration/ofMillis 100))]
        (doseq [record records]
          (process-record record))
        (Thread/sleep 50)))
    (catch Exception e
      (log/error e "Error in Kafka consumer polling loop"))))

;; Define a consumer-state atom to hold the state
(defonce consumer-state (atom nil))

(defn start-consumer
  "Start the Kafka consumer"
  []
  (let [config (create-consumer-config)
        consumer (KafkaConsumer. config)
        topics [(get-config-with-default [:kafka :topics :inventory] "inventory-updates")
                (get-config-with-default [:kafka :topics :transactions] "transactions")
                (get-config-with-default [:kafka :topics :purchase-orders] "purchase-orders")]
        running? (atom true)
        executor (Executors/newSingleThreadExecutor)
        callable (reify java.util.concurrent.Callable
                   (call [_] (poll-messages consumer running?)))]
    (log/info "Starting Kafka consumer for topics:" topics)
    (.subscribe consumer topics)
    (let [state {:consumer consumer
                 :running? running?
                 :executor executor
                 :executor-future (.submit executor callable)}]
      (reset! consumer-state state)
      state)))

(defn stop-consumer
  "Stop the Kafka consumer"
  [state]
  (try
    (when-let [{:keys [consumer running? executor executor-future]} state]
      (when running?
        (reset! running? false))

      (when executor-future
        (future-cancel executor-future))

      (when executor
        (.shutdown executor)
        (try
          (.awaitTermination executor 5 TimeUnit/SECONDS)
          (catch InterruptedException e
            (log/warn e "Interrupted while waiting for consumer executor to terminate"))))

      (when consumer
        (log/info "Closing Kafka consumer")
        (.wakeup consumer)
        (try
          (.close consumer (Duration/ofSeconds 5))
          (catch Exception e
            (log/warn e "Error closing Kafka consumer")))))

    (catch Exception e
      (log/error e "Error stopping Kafka consumer")))
  (reset! consumer-state nil))

(defstate kafka-consumer
  :start (start-consumer)
  :stop (stop-consumer (deref consumer-state))) 