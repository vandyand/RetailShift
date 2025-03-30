(ns retailshift.inventory.config.core
  (:require [clojure.tools.logging :as log]
            [clojure.java.io :as io]
            [clojure.edn :as edn]
            [mount.core :refer [defstate]]
            [environ.core :refer [env]]
            [aero.core :as aero]))

;; Global config atom for early access before mount starts
(def ^:private config-atom (atom nil))

;; Default configuration values
(def default-config
  {:service {:name "inventory-service"
             :version "0.1.0"
             :port 8080}
   :mongodb {:uri "mongodb://mongodb:27017/inventory"
             :max-connections 10
             :connect-timeout-ms 5000}
   :kafka {:bootstrap-servers "kafka:9092"
           :consumer-group "inventory-service"
           :producer-client-id "inventory-producer"
           :topics {:inventory-updates "inventory-updates"
                    :transactions "transactions"
                    :purchase-orders "purchase-orders"}}
   :redis {:uri "redis://redis:6379"
           :max-connections 5}
   :health {:cache-ttl-seconds 30
            :startup-time-ms 45000}
   :metrics {:enabled true
             :jvm-metrics true
             :log-metrics false}
   :logging {:level "info"
             :console true
             :file false
             :file-path "logs/inventory-service.log"}})

;; Helper function to construct MongoDB URI from Spring Data MongoDB environment variables
(defn- build-mongodb-uri
  "Build MongoDB URI from Spring Data MongoDB environment variables"
  []
  (let [host (System/getenv "SPRING_DATA_MONGODB_HOST")
        username (System/getenv "SPRING_DATA_MONGODB_USERNAME")
        password (System/getenv "SPRING_DATA_MONGODB_PASSWORD")
        database (System/getenv "SPRING_DATA_MONGODB_DATABASE")]
    (when host
      (log/info "Building MongoDB URI from Spring Data MongoDB environment variables")
      (if (and username password)
        (format "mongodb://%s:%s@%s:27017/%s" username password host (or database "inventory"))
        (format "mongodb://%s:27017/%s" host (or database "inventory"))))))

;; Helper function to get Kafka bootstrap servers from environment
(defn- build-kafka-config
  "Build Kafka config from environment variables"
  []
  (let [bootstrap-servers (System/getenv "KAFKA_BOOTSTRAP_SERVERS")
        consumer-group (System/getenv "KAFKA_CONSUMER_GROUP")]
    {:bootstrap-servers bootstrap-servers
     :consumer-group consumer-group}))

;; Load configuration from file
(defn load-config-file
  "Load configuration from the specified file"
  [config-file]
  (try
    (log/info "Attempting to load configuration from file:" config-file)
    (if-let [resource (io/resource config-file)]
      (do
        (log/info "Found config file as resource:" config-file)
        (aero/read-config resource))
      (let [file (io/file config-file)]
        (if (.exists file)
          (do
            (log/info "Found config file on disk:" config-file)
            (aero/read-config file))
          (do
            (log/warn "Config file not found:" config-file)
            nil))))
    (catch Exception e
      (log/warn e "Failed to load configuration file:" config-file)
      nil)))

;; Dump all environment variables for debugging
(defn debug-environment
  "Log all environment variables for debugging"
  []
  (log/info "Environment variables:")
  (let [env-map (System/getenv)]
    (doseq [key (sort (keys env-map))]
      (log/info (str key "=" (get env-map key))))))

;; Build final configuration
(defn build-config
  "Build configuration by merging defaults, file config, and environment variables"
  []
  (debug-environment)
  (let [config-file (or (System/getenv "CONFIG_FILE") "config/config.edn")
        file-config (load-config-file config-file)

        mongodb-uri (build-mongodb-uri)
        kafka-config (build-kafka-config)

        ;; Extract important environment variables
        env-config {:service {:port (let [port-str (System/getenv "SERVICE_PORT")]
                                      (when port-str (Integer/parseInt port-str)))}
                    :mongodb {:uri mongodb-uri}
                    :kafka (select-keys kafka-config [:bootstrap-servers :consumer-group])}

        ;; Remove nil values from env-config
        clean-env-config (into {}
                               (for [[k v] env-config]
                                 [k (into {} (filter (comp some? val) v))]))

        ;; Final configuration with precedence: env vars > file config > defaults
        final-config (merge-with
                      (fn [a b] (if (map? a) (merge-with (fn [x y] (or y x)) a b) (or b a)))
                      default-config
                      (or file-config {})
                      clean-env-config)]

    (log/info "Final MongoDB URI:" (get-in final-config [:mongodb :uri]))
    (log/info "Final Kafka bootstrap servers:" (get-in final-config [:kafka :bootstrap-servers]))
    (log/info "Configuration loaded successfully")
    (reset! config-atom final-config)
    final-config))

;; Configuration state
(defstate config
  :start (build-config))

;; Helper function to access config values
(defn get-config
  "Get a value from the configuration using a path of keys"
  [path]
  (if (bound? #'config)
    (get-in config path)
    (get-in @config-atom path)))

;; Helper function for checking if feature is enabled
(defn feature-enabled?
  "Check if a specific feature is enabled"
  [feature-path]
  (boolean (get-config (into [:features] feature-path))))

;; Initialize configuration
(defn init-config!
  "Initialize configuration"
  []
  (log/info "Initializing configuration for inventory service")
  (if (bound? #'config)
    config
    (build-config))) 