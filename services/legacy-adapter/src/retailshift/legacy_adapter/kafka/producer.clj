(ns retailshift.legacy-adapter.kafka.producer
  (:require [clojure.tools.logging :as log]
            [retailshift.legacy-adapter.config :as config]
            [cheshire.core :as json]
            [mount.core :refer [defstate]])
  (:import [org.apache.kafka.clients.producer KafkaProducer ProducerRecord]
           [org.apache.kafka.common.serialization StringSerializer]
           [java.util Properties]))

(defn- create-producer-config
  "Create Kafka producer configuration"
  []
  (let [props (Properties.)]
    (.put props "bootstrap.servers" (config/get-in [:kafka :bootstrap-servers]))
    (.put props "client.id" (config/get-in [:kafka :client-id]))
    (.put props "key.serializer" (.getName StringSerializer))
    (.put props "value.serializer" (.getName StringSerializer))
    (.put props "acks" (config/get-in [:kafka :acks]))
    (.put props "retries" (str (config/get-in [:kafka :retries])))
    (.put props "max.block.ms" (str (config/get-in [:kafka :max-block-ms])))
    props))

(defn- create-producer
  "Create a Kafka producer instance"
  []
  (let [props (create-producer-config)]
    (log/info "Creating Kafka producer for" (.get props "bootstrap.servers"))
    (KafkaProducer. props)))

(defstate kafka-producer
  :start (create-producer)
  :stop (when kafka-producer
          (log/info "Closing Kafka producer")
          (.close kafka-producer)))

(defn check-connection
  "Check if Kafka connection is healthy"
  []
  (try
    (let [topic-name (config/get-in [:kafka :topics :events])]
      ;; Just try to get metadata, don't actually send
      (.partitionsFor ^KafkaProducer kafka-producer topic-name)
      true)
    (catch Exception e
      (log/error e "Kafka connection check failed")
      false)))

(defn- get-topic
  "Get topic name by key"
  [topic-key]
  (config/get-in [:kafka :topics topic-key]))

(defn send-message
  "Send a message to Kafka topic"
  ([topic-key message]
   (send-message topic-key nil message))
  ([topic-key key message]
   (try
     (let [topic (get-topic topic-key)
           _ (log/debug "Sending message to topic" topic)
           message-str (json/generate-string message)
           record (if key
                    (ProducerRecord. topic key message-str)
                    (ProducerRecord. topic message-str))]
       (.send ^KafkaProducer kafka-producer record)
       true)
     (catch Exception e
       (log/error e "Failed to send message to Kafka")
       false))))

(defn send-inventory-update
  "Send inventory update event"
  [inventory-data]
  (let [event {:type "inventory_update"
               :timestamp (System/currentTimeMillis)
               :data inventory-data}]
    (send-message :inventory (str (:id inventory-data)) event)))

(defn send-transaction-event
  "Send transaction event"
  [transaction-data]
  (let [event {:type "transaction_created"
               :timestamp (System/currentTimeMillis)
               :data transaction-data}]
    (send-message :transactions (str (:id transaction-data)) event)))

(defn send-customer-update
  "Send customer update event"
  [customer-data]
  (let [event {:type "customer_update"
               :timestamp (System/currentTimeMillis)
               :data customer-data}]
    (send-message :customers (str (:id customer-data)) event)))

(defn send-migration-event
  "Send migration event"
  [event-type data]
  (let [event {:type (str "migration_" (name event-type))
               :timestamp (System/currentTimeMillis)
               :data data}]
    (send-message :events (str "migration-" (name event-type)) event))) 