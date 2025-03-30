(ns retailshift.inventory.core
  (:require [clojure.tools.logging :as log]
            [mount.core :as mount]
            [ring.adapter.jetty :as jetty]
            [retailshift.inventory.config.core :as config]
            [retailshift.inventory.db.mongodb :as mongodb]
            [retailshift.inventory.api.routes :as routes]
            [retailshift.inventory.kafka.consumer :as consumer]
            [clojure.java.io :as io]
            [clojure.string :as str])
  (:gen-class))

;; Simple file copy function to replace jakemcc.clojure.java.io.resource/copy
(defn copy-file
  "Copy a file from source to destination"
  [source dest]
  (with-open [in (io/input-stream source)
              out (io/output-stream dest)]
    (io/copy in out)))

;; Global application state
(defonce http-server (atom nil))

;; Application initialization
(defn init-app!
  "Initialize the application"
  [& {:keys [with-kafka] :or {with-kafka false}}]
  (log/info "Initializing inventory service..." (if with-kafka "with Kafka" "without Kafka"))

  ;; Ensure configuration is loaded
  (config/init-config!)

  ;; Initialize MongoDB connections and schema
  (mongodb/init-db!)

  ;; Start Kafka consumer if enabled
  (when with-kafka
    (try
      (log/info "Initializing Kafka consumer")
      (mount/start)
      (log/info "Kafka consumer initialized successfully")
      (catch Exception e
        (log/error e "Failed to initialize Kafka consumer - service will run without Kafka"))))

  (log/info "Inventory service initialized"))

;; Start HTTP server
(defn start-http-server!
  "Start the HTTP server"
  []
  (let [port (or (config/get-config [:service :port]) 8080)
        _ (log/info "Initializing routes")
        routes (routes/start)
        _ (log/info "Routes initialized successfully")]
    (log/info "Starting HTTP server on port" port)
    (try
      (let [server (jetty/run-jetty routes {:port port :join? false})]
        (reset! http-server server)
        (log/info "HTTP server started successfully")
        server)
      (catch Exception e
        (log/error e "Failed to start HTTP server")
        (throw e)))))

;; Stop HTTP server
(defn stop-http-server!
  "Stop the HTTP server"
  []
  (when-let [server @http-server]
    (log/info "Stopping HTTP server")
    (.stop server)
    (reset! http-server nil)
    (log/info "HTTP server stopped")))

;; Application shutdown
(defn shutdown!
  "Shutdown the application"
  []
  (log/info "Shutting down inventory service...")
  (stop-http-server!)
  (mount/stop)
  (log/info "Inventory service shutdown complete"))

;; Register shutdown hook
(defn register-shutdown-hook!
  "Register a JVM shutdown hook"
  []
  (.addShutdownHook (Runtime/getRuntime)
                    (Thread. ^Runnable shutdown!)))

;; Ensure required resources exist
(defn ensure-resources
  "Ensure required resource directories and files exist"
  []
  (let [config-dir "resources/config"
        logs-dir "logs"]

    ;; Create directories if they don't exist
    (doseq [dir [config-dir logs-dir]]
      (let [dir-file (io/file dir)]
        (when-not (.exists dir-file)
          (log/info "Creating directory:" dir)
          (.mkdirs dir-file))))

    ;; Create default config file if it doesn't exist
    (let [config-file (io/file (str config-dir "/config.edn"))]
      (when-not (.exists config-file)
        (log/info "Creating default config file")
        (spit config-file (str/trim "
{:service {:name \"inventory-service\"
           :port 8080}
 :mongodb {:uri \"mongodb://localhost:27017/inventory\"}
 :kafka {:bootstrap-servers \"localhost:9092\"
         :consumer-group \"inventory-service\"
         :producer-client-id \"inventory-producer\"}
 :redis {:uri \"redis://localhost:6379\"}
 :logging {:level \"info\"}}
"))))))

;; Main entry point
(defn -main
  "Main entry point for the inventory service"
  [& args]
  (try
    ;; Ensure required resources exist
    (ensure-resources)

    ;; Register shutdown hook
    (register-shutdown-hook!)

    ;; Parse command line arguments
    (let [enable-kafka (some #{"--with-kafka"} args)
          block (some #{"--block"} args)]

      ;; Initialize application
      (init-app! :with-kafka enable-kafka)

      ;; Start HTTP server
      (start-http-server!)

      (log/info "Inventory service started successfully"
                (if enable-kafka "with Kafka enabled" "with Kafka disabled"))

      ;; Keep the JVM running if requested
      (when block
        @(promise)))

    (catch Exception e
      (log/error e "Failed to start inventory service")
      (System/exit 1))))

;; Hot reload for development
(defn restart
  "Restart the application for development"
  []
  (mount/stop)
  (mount/start)
  (stop-http-server!)
  (init-app!)
  (start-http-server!)
  :restarted) 