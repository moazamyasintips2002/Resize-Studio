# Resize-Studio CI/CD Deployment with Jenkins & K3s

This project demonstrates a complete, automated DevOps workflow to containerize a static frontend application, push it to a global container registry, and deploy it onto a lightweight Kubernetes cluster (**K3s**).

---

## 🚀 Pipeline Architecture Overview

The automation workflow executes the following sequential steps on every single commit:
1. **Source Checkout**: Pulls the latest code directly from GitHub.
2. **Docker Build**: Packages the application into an isolated container using a production-ready Nginx configuration.
3. **Registry Push**: Authenticates safely and pushes the versioned image to Docker Hub under a specific repository.
4. **K3s Orchestration**: Deploys or rollouts an updated deployment configuration to a localized K3s cluster.

---

## 🛠️ Step-by-Step Implementation Guide

### Step 1: Containerization (`Dockerfile`)
A minimal multi-stage-like footprint was used using `nginx:alpine` to serve frontend static content reliably.
```dockerfile
FROM nginx:alpine
COPY index.html styles.css app.js tools.js /usr/share/nginx/html/
EXPOSE 80
```

### Step 2: Infrastructure as Code (`k8s/deployment.yaml`)
Defined a persistent declarative spec state featuring a single ReplicaSet instance connected to a highly accessible `NodePort` Service infrastructure configuration layer.

### Step 3: CI/CD Engine Orchestration (`Jenkinsfile`)
Written a complete declarative scripting architecture implementing structural environment variable definitions and strict post-execution conditional handlers to provide clean continuous delivery updates.

---

## 🔍 Historical Troubleshooting Log (Issue Resolutions)

During the configuration phases, several infrastructural problems were actively diagnosed and corrected:

### 1. The Jenkins Authentication Wall
* **Symptom:** Pipeline failed instantly during the secure registry connection routine.
* **Root Cause:** A generic string placeholder was assigned to the internal credential handling block instead of referencing the exact unique global authorization hash key stored inside Jenkins' credentials module.
* **Resolution:** Correlated and fixed the unique `DOCKER_CREDS_ID` definitions token to perfectly align target credential bindings.

### 2. Kubernetes Strict Indentation Violations
* **Symptom:** K3s configuration engine rejected the target manifest inputs, flagging an unmappable entity error (`strict decoding error: unknown field "spec.containers"`).
* **Root Cause:** Incompliant space layout structures where a list mapping descriptor (`containers:`) skipped indentation scopes, breaking the rigid standard YAML structural rules.
* **Resolution:** Cleaned formatting configurations to force exact tabless nested mapping trees within `spec.template.spec`.

### 3. Persistent Image Initialization Delays
* **Symptom:** Dispatched pods remained frozen under a continuous `ContainerCreating` cycle state for several minutes.
* **Root Cause:** Network download processes became temporarily unresponsive while fetching un-cached layers during simultaneous container initialization attempts.
* **Resolution:** Triggered a complete structural self-healing routine using a cluster-wide forced rollout execution sequence (`kubectl delete pods --all`), allowing K3s to initialize layers dynamically and cycle the runtime state straight to active `Running` status.
