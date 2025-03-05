(ns retailshift.inventory.config.core
  (:require [clojure.tools.logging :as log]
            [clojure.java.io :as io]
            [clojure.edn :as edn]
            [mount.core :refer [defstate]]
            [environ.core :refer [env]]
            [aero.core :as aero]))

;; Default configuration values
(def default-config
  {:service {:name "inventory-service"
             :version "0.1.0"
             :port 8080}
   :mongodb {:uri "mongodb://localhost:27017/inventory"
             :max-connections 10
             :connect-timeout-ms 5000}
   :kafka {:bootstrap-servers "localhost:9092"
           :consumer-group "inventory-service"
           :producer-client-id "inventory-producer"
           :topics {:inventory-updates "inventory-updates"
                    :transactions "transactions"
                    :purchase-orders "purchase-orders"}}
   :redis {:uri "redis://localhost:6379"
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

;; Load configuration from file
(defn load-config-file
  "Load configuration from the specified file"
  [config-file]
  (try
    (when (and config-file (.exists (io/file config-file)))
      (log/info "Loading configuration from file:" config-file)
      (aero/read-config config-file))
    (catch Exception e
      (log/warn e "Failed to load configuration file:" config-file)
      nil)))

;; Build final configuration
(defn build-config
  "Build configuration by merging defaults, file config, and environment variables"
  []
  (let [config-file (or (env :config-file) "resources/config/config.edn")
        file-config (load-config-file config-file)
        
        ;; Extract important environment variables
        env-config {:service {:port (some-> (env :service-port) (Integer/parseInt))}
                    :mongodb {:uri (env :mongodb-uri)}
                    :kafka {:bootstrap-servers (env :kafka-bootstrap-servers)
                            :consumer-group (env :kafka-consumer-group)}
                    :redis {:uri (env :redis-uri)}}
        
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
    
    (log/info "Configuration loaded successfully")
    final-config))

;; Configuration state
(defstate config
  :start (build-config))

;; Helper function to access config values
(defn get-config
  "Get a value from the configuration using a path of keys"
  [path]
  (get-in config path))

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
  (when-not (bound? #'config)
    (build-config))) 