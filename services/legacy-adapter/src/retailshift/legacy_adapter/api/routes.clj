(ns retailshift.legacy-adapter.api.routes
  (:require [retailshift.legacy-adapter.api.middleware :as middleware]
            [retailshift.legacy-adapter.api.handlers.health :as health]
            [retailshift.legacy-adapter.api.handlers.inventory :as inventory]
            [retailshift.legacy-adapter.api.handlers.transactions :as transactions]
            [retailshift.legacy-adapter.api.handlers.customers :as customers]
            [retailshift.legacy-adapter.api.handlers.migration :as migration]
            [retailshift.legacy-adapter.api.handlers.metrics :as metrics]
            [clojure.tools.logging :as log]
            [compojure.core :refer [defroutes GET POST PUT DELETE]]
            [compojure.route :as route]
            [ring.middleware.json :refer [wrap-json-body wrap-json-response]]
            [ring.middleware.params :refer [wrap-params]]
            [ring.middleware.keyword-params :refer [wrap-keyword-params]]))

;; Define API routes
(defroutes api-routes
  ;; Health check endpoints
  (GET "/health" [] (health/check))
  (GET "/health/readiness" [] (health/readiness))
  (GET "/health/liveness" [] (health/liveness))

  ;; Metrics endpoint for Prometheus
  (GET "/metrics" [] (metrics/collect))

  ;; Legacy inventory endpoints
  (GET "/api/v1/inventory" [] inventory/get-all)
  (GET "/api/v1/inventory/:id" [id] (inventory/get-by-id id))
  (POST "/api/v1/inventory" [] inventory/create)
  (PUT "/api/v1/inventory/:id" [id] (inventory/update id))

  ;; Legacy transaction endpoints
  (GET "/api/v1/transactions" [] transactions/get-all)
  (GET "/api/v1/transactions/:id" [id] (transactions/get-by-id id))
  (POST "/api/v1/transactions" [] transactions/create)

  ;; Legacy customer endpoints
  (GET "/api/v1/customers" [] customers/get-all)
  (GET "/api/v1/customers/:id" [id] (customers/get-by-id id))
  (POST "/api/v1/customers" [] customers/create)
  (PUT "/api/v1/customers/:id" [id] (customers/update id))

  ;; Migration endpoints
  (POST "/api/v1/migration/start" [] migration/start)
  (GET "/api/v1/migration/status" [] migration/status)
  (POST "/api/v1/migration/abort" [] migration/abort)

  ;; Default route for unmatched paths
  (route/not-found {:error "Not Found"}))

;; Create a new handler function that doesn't require arguments
(def app-handler
  (-> api-routes
      ;; Apply middleware in order (outermost first)
      (middleware/wrap-correlation-id)
      (middleware/wrap-logging)
      (middleware/wrap-exception-handler)
      (middleware/wrap-authentication)
      (middleware/wrap-rate-limit)
      (wrap-json-response)
      (wrap-json-body {:keywords? true})
      (wrap-keyword-params)
      (wrap-params)))

(defn app
  "Create the Ring handler for the application.
   Can be called with or without a request parameter."
  ([]
   app-handler)
  ([request]
   (app-handler request)))

(comment
  ;; For REPL testing
  (require '[ring.mock.request :as mock])
  (app (mock/request :get "/health"))
  (app (mock/request :get "/api/v1/inventory"))) 