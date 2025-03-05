(ns retailshift.inventory.core
  (:require [clojure.tools.logging :as log]
            [mount.core :as mount]
            [ring.adapter.jetty :as jetty]
            [retailshift.inventory.config.core :as config]
            [retailshift.inventory.db.mongodb :as mongodb]
            [retailshift.inventory.api.routes :as routes]
            [retailshift.inventory.kafka.consumer :as consumer]
            [jakemcc.clojure.java.io.resource :refer [copy]]
            [clojure.java.io :as io]
            [clojure.string :as str])
  (:gen-class))

;; Global application state
(defonce http-server (atom nil))

;; Application initialization
(defn init-app!
  "Initialize the application"
  []
  (log/info "Initializing inventory service...")

  ;; Ensure configuration is loaded
  (config/init-config!)

  ;; Initialize MongoDB connections and schema
  (mongodb/init-db!)

  (log/info "Inventory service initialized"))

;; Start HTTP server
(defn start-http-server!
  "Start the HTTP server"
  []
  (let [port (or (config/get-config [:service :port]) 8080)
        routes (routes/start-routes)]
    (log/info "Starting HTTP server on port" port)
    (let [server (jetty/run-jetty routes {:port port :join? false})]
      (reset! http-server server)
      (log/info "HTTP server started")
      server)))

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

    ;; Mount will start all services marked with defstate
    (mount/start)

    ;; Initialize application
    (init-app!)

    ;; Start HTTP server
    (start-http-server!)

    (log/info "Inventory service started successfully")

    ;; Keep the JVM running
    (when (and args (= (first args) "--block"))
      @(promise))

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