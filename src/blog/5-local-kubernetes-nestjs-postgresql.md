---
seoTitle: Local Kubernetes with NestJS & PostgreSQL
slug: local-kubernetes-nestjs-postgresql
tag: Kubernetes · DevOps
title: From Zero to Hero: Mastering Local Kubernetes with NestJS and PostgreSQL in Minutes!
subtitle: A practical proof of concept for deploying a NestJS logging API with PostgreSQL inside a lightweight Kubernetes cluster using k3d.
date: May 14, 2025
readTime: 12 min read
mediumUrl: https://arg-software.medium.com/from-zero-to-hero-mastering-local-kubernetes-with-nestjs-and-postgresql-in-minutes-4f3718c09004
excerpt: As Kubernetes becomes the industry standard for deploying modern cloud-native applications, mastering its local development workflows is essential. We'll walk you through deploying a NestJS logging API with PostgreSQL inside a lightweight Kubernetes cluster using k3d.
---

![From Zero to Hero](/images/blog/from-zero-to-hero/from-zero-to-hero-header.webp)

As Kubernetes becomes the industry standard for deploying modern cloud-native applications, mastering its local development workflows is essential for developers. In this article, we'll walk you through a practical proof of concept for deploying a NestJS-based logging API with a PostgreSQL database inside a lightweight Kubernetes cluster using k3d.

## Understanding Kubernetes: The Basics

Before going to our implementation, let's clarify some fundamental Kubernetes concepts.

Kubernetes (K8s) is an open-source platform that automates deploying, scaling, and operating application containers. Think of it as an orchestra conductor coordinating how your containerized applications run across a cluster of machines.

Key Kubernetes components include:

- **Pods.** The most minor deployable units in Kubernetes that can be created and managed. A pod contains one or more containers (like Docker containers) that are guaranteed to be co-located on the host machine.
- **Nodes.** Worker machines (either physical or virtual) that run your applications. Each node contains the services necessary to run pods.
- **Control Panel.** The Kubernetes brain that manages the cluster's worker nodes and pods. It makes global decisions about the cluster and detects/responds to cluster events.
- **Services.** An abstraction that defines a logical set of pods and a policy to access them. Services enable network access to pods, acting like a load balancer.
- **Deployments.** Provides declarative updates for pods and replica sets. You describe a desired state in a deployment, and the deployment controller changes the actual state to match your desired state.

Now that we understand these core concepts let's see how they come together in our local development environment!

## What is k3d and Why Use It?

k3d is a lightweight wrapper that runs k3s (Rancher Labs minimal Kubernetes distribution) inside Docker containers. It's designed for local development and testing, making it perfect for our PoC.

Several options exist for local Kubernetes development, including Minikube, Docker Desktop with Kubernetes, and Kind. Here's why k3d stands out:

- **Ultra Lightweight.** k3d requires minimal resources compared to complete Kubernetes installations. It can run on virtually any development machine without hogging system resources.
- **Quick Setup.** Create, start, and stop clusters in seconds rather than minutes. This rapid iteration capability is invaluable during development.
- **Docker-Based.** Since it runs entirely in Docker containers, there's no need for virtual machines or additional hypervisors, making it compatible with any system that can run Docker.
- **Multi-Cluster Support.** Easily create multiple isolated clusters, perfect for testing different configurations or running various environments simultaneously.
- **Closer to Production.** k3s is a certified Kubernetes distribution used in production environments, especially edge and IoT deployments. This means your local setup closely resembles a real-world scenario.
- **Registry Integration.** Built-in support for local registries makes it simple to test images without pushing them to external repositories.

![k3d Alternatives](/images/blog/from-zero-to-hero/k3d-alternatives.webp)

As the table shows, k3d excels in resource efficiency, startup speed, and multi-cluster support, making it ideal for our development workflow where rapid iteration is key. While Minikube offers the most complete Kubernetes experience and Docker Desktop provides UI integration, k3d's lightweight nature and speed make it the perfect choice for our NestJS and PostgreSQL development environment.

## Why Local Kubernetes Development Matters

While Kubernetes excels in production environments, testing configurations locally before deployment can save countless hours of debugging and troubleshooting. A local Kubernetes setup allows you to validate your configurations in a similar climate to production, test deployment strategies without impacting live systems, experiment with Kubernetes features safely, and accelerate your development feedback loop.

## Setting Up Our Proof of Concept

Now that we understand why k3d is our tool of choice let's look at what our PoC will demonstrate. This project shows how to use Kubernetes to deploy a NestJS API using Kubernetes Deployments, run PostgreSQL within the cluster, expose services using LoadBalancer and NodePort, configure applications with ConfigMaps, and manage database migrations.

## Our Kubernetes Components

Here's a breakdown of the core Kubernetes components used in our PoC and how we defined each.

### Namespace: Our Service's Home

A namespace provides logical isolation for our resources.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logger-k8s
```

Why it matters: Keeps all logging components isolated from other applications, preventing resource conflicts and simplifying access control.

### Deployments: Running our Applications

Our setup includes two key deployments. The NestJS API Deployment runs our logging service API with automatic scaling and recovery:

```yaml
# api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logger
  namespace: logger-k8s
spec:
  replicas: 2  # High availability!
  template:
    spec:
      containers:
        - name: logger
          image: argsoftware/logger:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: logger-config  # Configuration injection
```

What it does: Two replicas ensure one service stays up even if the other fails. All settings come from a single ConfigMap. imagePullPolicy: Always keeps the service always with the most recent version.

The PostgreSQL Deployment manages our database instance. It runs a single-instance PostgreSQL container and mounts a persistent volume for data storage:

```yaml
# database/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logger-database
  namespace: logger-k8s
spec:
  containers:
    - name: database
      image: postgres:15
      ports:
        - containerPort: 5432
      volumeMounts:
        - mountPath: /var/lib/postgresql/data
          name: database-data  # Persistent storage
  volumes:
    - name: database-data
      persistentVolumeClaim:
        claimName: database-data-pvc
```

What it does: Logs survive pod restarts and node failures. Database credentials come from the same ConfigMap. The official PostgreSQL 15 image provides reliability.

### Services: Connecting our Pods

Services act as stable network endpoints for your pods, automatically handling discovery and load balancing.

The PostgreSQL Database Service uses ClusterIP, which makes the database accessible only within the Kubernetes cluster:

```yaml
# database/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: logger-database
  namespace: logger-k8s
spec:
  ports:
    - port: 5432
  selector:
    app: logger-database
  type: ClusterIP  # Internal access only
```

Why ClusterIP: ClusterIP makes the database accessible only within the Kubernetes cluster, preventing potential attackers from reaching your database directly. API pods can find the database using logger-database as the hostname, and traffic gets routed to the correct database pod even if it moves to a different node.

The NestJS API Service uses LoadBalancer to expose the API externally:

```yaml
# api/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: logger
  namespace: logger-k8s
spec:
  ports:
    - port: 8000
      targetPort: 8000
  type: LoadBalancer  # Exposes to the world!
```

Why LoadBalancer: It creates an external IP address that can be accessed from anywhere, distributes incoming traffic across all API replicas, automatically routes traffic to healthy pods if one fails, and when running in cloud providers (AWS, GCP, Azure) it provisions a real load balancer.

When to use what: ClusterIP for internal components (databases, caches, internal services). LoadBalancer for externally accessible components (APIs, web frontends). NodePort (not used here) for development or when you need a specific port exposed on each node.

### Persistent Volume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: database-data-pv
spec:
  capacity:
    storage: 5Gi
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /tmp/database-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data-pvc
  namespace: logger-k8s
spec:
  resources:
    requests:
      storage: 5Gi
```

How it works: The PersistentVolume reserves 5GB of storage on the host. The PersistentVolumeClaim requests this storage for your database. The Retain policy ensures your data isn't deleted if the claim is removed.

### ConfigMap

Used to centralize and inject environment variables into API and database deployments. We define a ConfigMap called logger-config to store all configuration values that would otherwise be hardcoded in our pods. This improves maintainability and allows us to keep application code and configuration separate.

Note: The repository includes a api/configmap.yaml.example file. Before deploying, you must copy it to api/configmap.yaml and edit the file to include your own database credentials and configuration values.

```yaml
# api/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logger-config
  namespace: logger-k8s
data:
  DATABASE_URL: "postgresql://logs-user:logs123!@logger-database:5432/logs-db?schema=public"
  POSTGRES_DB: "logs-db"
  POSTGRES_USER: "logs-user"
  POSTGRES_PASSWORD: "logs123!"  # Change in production!
```

### Database Migration Job: Automatic Setup

Used to apply Prisma database migrations during deployment automatically. We define a Kubernetes Job that runs npx prisma migrate deploy from within the same Docker image used by the API. This ensures the database schema is up to date before the app starts.

```yaml
# api/migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate-job
  namespace: logger-k8s
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: argsoftware/logger:latest
          command: ["npx", "prisma", "migrate", "deploy"]
          envFrom:
            - configMapRef:
                name: logger-config
      restartPolicy: Never
```

Why: This job automatically sets up your database schema before your app starts, using the same Docker image as your API. No manual migration steps are needed.

## Deploying the Environment with k3d

Let's walk through the deployment process step by step.

First, create the Kubernetes cluster and expose port 8000:

```bash
k3d cluster create kubernetes-poc-cluster --port "8000:8000@loadbalancer"
```

Next, apply our configuration files in the proper sequence:

```bash
# Set up namespace and config
kubectl apply -f namespace.yaml
kubectl apply -f database/pvc.yaml
kubectl apply -f api/configmap.yaml

# Deploy the PostgreSQL database
kubectl apply -f database/deployment.yaml
kubectl apply -f database/service.yaml

# Run Prisma migrations before starting the API
kubectl apply -f api/migrate-job.yaml
kubectl wait --for=condition=complete job/prisma-migrate-job -n logger-k8s

# Finally, deploy the backend API
kubectl apply -f api/deployment.yaml
kubectl apply -f api/service.yaml
```

To ensure everything is running correctly, check your pods and services:

```bash
kubectl get pods -n logger-k8s
kubectl get svc -n logger-k8s
```

Prisma migrations are automatically applied via a dedicated Kubernetes Job in this setup. The job runs npx prisma migrate deploy inside the same Docker image used for the API, applying all pending migrations on startup. To inspect migration logs:

```bash
kubectl logs job/prisma-migrate-job -n logger-k8s
```

Once complete, the API is deployed against an up-to-date schema without manual SQL interaction.

## Testing the API

Once everything is running, you can access our API with:

```bash
curl http://localhost:8000/logs
```

You can also verify the load balancing is working by checking the instance ID:

```bash
curl http://localhost:8000
```

You should see responses from different pods, confirming that the load balancer distributes traffic correctly.

## Moving Toward Production

While this setup is perfect for local development, several enhancements would make it production-ready.

### Replace ConfigMaps with Secrets

Kubernetes Secrets store sensitive information like passwords, OAuth tokens, and SSH keys. Unlike ConfigMaps, Secrets are base64 encoded by default, can be encrypted at rest when using appropriate storage backends, have stricter access controls through RBAC (Role-Based Access Control), and can be mounted as temporary files that aren't persisted on the disk. Implementing Secrets would significantly improve our security posture, especially for database credentials and API keys.

### Implement Horizontal Pod Autoscaling

Horizontal Pod Autoscaler (HPA) automatically scales the number of pods in a deployment based on observed CPU utilization or custom metrics. This enhancement would automatically adjust resources based on actual demand, ensure optimal performance during traffic spikes, reduce costs during low-demand periods, increase application resilience, and eliminate manual scaling operations.

### Add Automated Migration Tools in CI/CD Pipelines

Tools like Flyway, Liquibase, or custom migration scripts integrated into your CI/CD pipeline automatically apply database schema changes. Automated migrations would eliminate error-prone manual migration steps, ensure consistent database states across environments, create a traceable history of schema changes, allow versioning and rollback capabilities, and synchronize application code and database schema changes.

### Configure TLS-Secured Ingress for Encrypted Traffic

Ingress resources with TLS certificates encrypt traffic between clients and your services. Implementing TLS would protect data in transit from interception, establish trust with users through verified certificates, meet compliance requirements for data protection, prevent man-in-the-middle attacks, and enable HTTP/2 and other modern web protocols.

### Adding NGINX Ingress Controller

You could also add NGINX ingress for improved routing:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
```

NGINX Ingress Controller is a Kubernetes resource that manages external service access and provides advanced routing capabilities. It would add URL-based routing to different services, TLS termination in a centralized location, rate limiting and traffic control, load balancing with advanced algorithms, rewrite rules and request/response modifications, and WebSocket support and HTTP/2.

## Conclusion

This proof of concept demonstrates how to create a functional local Kubernetes environment for developing and testing cloud-native applications. By using k3d, we've simplified what would otherwise be a complex setup, making Kubernetes accessible for local development.

Running Kubernetes locally speeds up your feedback cycles and ensures that your development environment closely mirrors production, reducing "it works on my machine" problems.

Ready to try it yourself? The complete source code and configuration files are available on GitHub: https://github.com/ARG-Software/Kubernetes-Poc
