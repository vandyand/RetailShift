(ns retailshift.legacy-adapter.db.mongodb
  (:require [clojure.tools.logging :as log]
            [retailshift.legacy-adapter.config :as config]
            [monger.core :as mg]
            [monger.collection :as mc]
            [monger.operators :refer [$set]]
            [monger.query :as q]
            [mount.core :refer [defstate]])
  (:import [com.mongodb MongoClientOptions MongoClientSettings ServerAddress]))

;; Define the MongoDB connection atom
(defonce ^:private conn-state (atom nil))

(defn- create-connection
  "Create a MongoDB connection"
  []
  (let [uri (config/get-in [:mongodb :uri])
        _ (log/info "Connecting to MongoDB:" uri)
        {:keys [conn db]} (mg/connect-via-uri uri)]
    {:conn conn
     :db db}))

;; Define the connection state using mount
(defstate db-connection
  :start (reset! conn-state (create-connection))
  :stop (when-let [conn (:conn @conn-state)]
          (log/info "Closing MongoDB connection")
          (mg/disconnect conn)))

(defn check-connection
  "Check if MongoDB connection is healthy"
  []
  (try
    (let [{:keys [db]} @conn-state]
      (mc/count db "system.indexes")
      true)
    (catch Exception e
      (log/error e "MongoDB connection check failed")
      false)))

(defn find-one
  "Find a single document by ID"
  [collection id]
  (try
    (let [{:keys [db]} @conn-state]
      (mc/find-map-by-id db collection id))
    (catch Exception e
      (log/error e (str "Failed to find document in " collection " with ID " id))
      nil)))

(defn find-all
  "Find all documents in a collection, with optional query and pagination"
  ([collection]
   (find-all collection {} nil nil))
  ([collection query]
   (find-all collection query nil nil))
  ([collection query limit]
   (find-all collection query limit nil))
  ([collection query limit skip]
   (try
     (let [{:keys [db]} @conn-state]
       (cond
         (and limit skip) (mc/find-maps db collection query {:limit limit, :skip skip})
         limit (mc/find-maps db collection query {:limit limit})
         :else (mc/find-maps db collection query)))
     (catch Exception e
       (log/error e (str "Failed to find documents in " collection))
       []))))

(defn insert
  "Insert a document into a collection"
  [collection document]
  (try
    (let [{:keys [db]} @conn-state
          result (mc/insert-and-return db collection document)]
      result)
    (catch Exception e
      (log/error e (str "Failed to insert document into " collection))
      nil)))

(defn update-by-id
  "Update a document by ID"
  [collection id update-doc]
  (try
    (let [{:keys [db]} @conn-state]
      (mc/update-by-id db collection id {$set update-doc})
      (find-one collection id))
    (catch Exception e
      (log/error e (str "Failed to update document in " collection " with ID " id))
      nil)))

(defn delete-by-id
  "Delete a document by ID"
  [collection id]
  (try
    (let [{:keys [db]} @conn-state]
      (mc/remove-by-id db collection id)
      true)
    (catch Exception e
      (log/error e (str "Failed to delete document in " collection " with ID " id))
      false))) 