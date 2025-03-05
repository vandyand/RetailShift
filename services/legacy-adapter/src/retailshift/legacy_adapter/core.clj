(ns retailshift.legacy-adapter.core
  (:require [retailshift.legacy-adapter.config :as config]
            [retailshift.legacy-adapter.api.routes :as routes]
            [retailshift.legacy-adapter.kafka.producer :as producer]
            [retailshift.legacy-adapter.db.mongodb :as mongodb]
            [retailshift.legacy-adapter.db.legacy-client :as legacy-client]
            [clojure.tools.logging :as log]
            [mount.core :as mount]
            [ring.adapter.jetty :as jetty])
  (:gen-class))

(mount/defstate http-server
  :start (let [port (or (config/get-in [:server :port]) 8080)
               routes (routes/app)]
           (log/info "Starting HTTP server on port" port)
           (jetty/run-jetty routes {:port port :join? false}))
  :stop (when http-server
          (log/info "Stopping HTTP server")
          (.stop http-server)))

(defn- init-system
  "Initialize all system components"
  []
  (log/info "Initializing Legacy Adapter Service")
  (-> (mount/only #{#'config/config
                    #'mongodb/connection
                    #'legacy-client/connection
                    #'producer/kafka-producer
                    #'http-server})
      (mount/start)))

(defn- shutdown-system
  "Gracefully shutdown all system components"
  []
  (log/info "Shutting down Legacy Adapter Service")
  (mount/stop))

(defn- add-shutdown-hook
  "Register shutdown hook for graceful termination"
  []
  (.addShutdownHook
   (Runtime/getRuntime)
   (Thread. ^Runnable shutdown-system)))

(defn- display-banner
  "Display application banner on startup"
  []
  (println "
-----------------------------------------------------
 RetailShift Legacy Adapter Service
 Version: 0.1.0
 Environment: " (or (System/getenv "APP_ENV") "development") "
-----------------------------------------------------"))

(defn -main
  "Entry point for the Legacy Adapter Service"
  [& args]
  (try
    (display-banner)
    (add-shutdown-hook)
    (init-system)
    (log/info "Legacy Adapter Service started successfully")
    (catch Exception e
      (log/error e "Failed to start Legacy Adapter Service")
      (System/exit 1))))

(comment
  ;; For REPL-driven development
  (mount/start)
  (mount/stop)
  (mount/start-with-args {:profile :dev})

  ;; Restart specific components
  (mount/stop #'http-server)
  (mount/start #'http-server)

  ;; Check config
  config/config) 