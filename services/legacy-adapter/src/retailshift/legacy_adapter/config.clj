(ns retailshift.legacy-adapter.config
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [clojure.tools.logging :as log]
            [mount.core :refer [defstate]]))

;; Define config atom
(defonce ^:private config-state (atom {}))

(defn- deep-merge
  "Deep merge two maps"
  [& maps]
  (apply merge-with (fn [x y]
                      (cond (map? x) (deep-merge x y)
                            :else y))
         maps))

(defn- config-from-file
  "Load configuration from an EDN file"
  [file]
  (try
    (when (.exists (io/file file))
      (-> file
          slurp
          edn/read-string))
    (catch Exception e
      (log/warn "Failed to load config from" file ":" (.getMessage e))
      nil)))

(defn- env-name->config-key
  "Convert environment variable name to config key path"
  [env-name]
  (when (str/starts-with? env-name "RETAILSHIFT_")
    (-> env-name
        (str/replace-first #"^RETAILSHIFT_" "")
        (str/lower-case)
        (str/split #"_")
        (->> (map keyword)))))

(defn- env-vars->config
  "Convert environment variables to configuration map"
  []
  (reduce (fn [acc [k v]]
            (if-let [path (env-name->config-key k)]
              (assoc-in acc path v)
              acc))
          {}
          (System/getenv)))

(defn- load-config
  "Load configuration from files and environment variables"
  []
  (let [env (or (System/getenv "APP_ENV") "development")
        base-config (config-from-file "resources/config/base.edn")
        env-config (config-from-file (str "resources/config/" env ".edn"))
        env-vars-config (env-vars->config)]
    (deep-merge base-config env-config env-vars-config)))

(defstate app-config
  :start (do
           (log/info "Loading configuration")
           (reset! config-state (load-config))))

(defn get-in
  "Get a value from config using a path of keys"
  [path & [default]]
  (clojure.core/get-in @config-state path default))

(defn get-config
  "Get the entire config map"
  []
  @config-state)

(comment
  ;; For REPL usage
  (load-config)
  (get-in [:server :port])
  (get-in [:mongodb :uri])) 