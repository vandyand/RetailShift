(defproject retailshift/inventory "0.1.0-SNAPSHOT"
  :description "Inventory Management Service for RetailShift"
  :url "https://github.com/yourusername/retailshift"
  :license {:name "MIT"
            :url "https://opensource.org/licenses/MIT"}

  :dependencies [[org.clojure/clojure "1.11.1"]
                 [org.clojure/tools.logging "1.2.4"]
                 [cheshire "5.11.0"]  ; JSON processing
                 [ring/ring-core "1.9.6"]  ; Web server
                 [ring/ring-jetty-adapter "1.9.6"]
                 [compojure "1.7.0"]  ; Routing
                 [ring/ring-json "0.5.1"]  ; JSON middleware
                 [org.apache.kafka/kafka-clients "3.4.0"]  ; Kafka client
                 [org.apache.kafka/kafka-streams "3.4.0"]  ; Kafka Streams
                 [com.taoensso/carmine "3.2.0"]  ; Redis client for caching
                 [com.novemberain/monger "3.5.0"]  ; MongoDB client
                 [clj-http "3.12.3"]  ; HTTP client
                 [mount "0.1.17"]  ; Component lifecycle management
                 [metosin/reitit "0.5.18"]  ; Better routing
                 [metosin/malli "0.9.2"]  ; Schema validation
                 [io.kubernetes/client-java "17.0.2"]  ; Kubernetes client
                 [micrometer-registry-prometheus "1.11.0"]  ; Metrics for monitoring
                 [io.opentracing/opentracing-api "0.33.0"]  ; Distributed tracing
                 [io.jaegertracing/jaeger-client "1.8.1"]]

  :main ^:skip-aot retailshift.inventory.core
  :target-path "target/%s"

  :profiles {:uberjar {:aot :all
                       :jvm-opts ["-Dclojure.compiler.direct-linking=true"]}
             :dev {:dependencies [[org.clojure/tools.namespace "1.3.0"]
                                  [ring/ring-mock "0.4.0"]
                                  [midje "1.10.9"]]
                   :plugins [[lein-midje "3.2.2"]
                             [lein-cloverage "1.2.4"]]}}

  :resource-paths ["resources"]
  :test-paths ["test"]

  ;; Docker integration
  :plugins [[lein-shell "0.5.0"]]
  :aliases {"docker-build" ["shell" "docker" "build" "-t" "retailshift/inventory:latest" "."]
            "k8s-deploy" ["shell" "kubectl" "apply" "-f" "k8s/deployment.yaml"]
            "run-tests" ["midje"]
            "coverage" ["cloverage"]}) 