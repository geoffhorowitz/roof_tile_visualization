# Production Agent Platform Setup Guide

> [!NOTE]
> Google Cloud has rebranded **Vertex AI** to the **Gemini Enterprise Agent Platform** (commonly referred to as the **Agent Platform**). The underlying APIs, SDK names, and environment variables still use `aiplatform`/`VERTEX_*` for backward compatibility, but in the Google Cloud Console, menus and services are now located under "Agent Platform" and "Agent Studio".

This guide explains how to deploy the ComfyUI image-generation pipeline to a Google Cloud Agent Platform (formerly Vertex AI) custom prediction endpoint and configure the Next.js web application to route requests to it.

---

## 1. Containerizing ComfyUI for the Agent Platform

Agent Platform Custom Prediction endpoints require a containerized web server that accepts HTTP requests and returns prediction responses. For ComfyUI, you will package ComfyUI, the required model checkpoints, and custom nodes in a Docker image.

### A. Docker Setup Files
The required container deployment files are located in the [docker/](docker/) folder:
- **[docker/Dockerfile](docker/Dockerfile)**: Standard CUDA image setup that installs dependencies, clones ComfyUI, downloads checkpoint models, and sets the predictor entrypoint.
- **[docker/vertex_predictor.py](docker/vertex_predictor.py)**: Python service wrapper script that boots ComfyUI in the background and maps the Agent Platform endpoint predict API.

### B. Build and Push to Artifact Registry
Run these commands from the project root directory:
```bash
# Authenticate gcloud
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create Artifact Registry Repository
gcloud artifacts repositories create roof-tile-visualizer-repo --repository-format=docker --location=us-central1

# Build the image using the docker/ directory context
docker build -t us-central1-docker.pkg.dev/roof-tile-visualizer/roof-tile-visualizer-repo/comfyui-vertex:latest -f docker/Dockerfile docker/

# Push the built container
docker push us-central1-docker.pkg.dev/roof-tile-visualizer/roof-tile-visualizer-repo/comfyui-vertex:latest
```

---

## 2. Deploying Endpoint to the Agent Platform

1. Go to the **Agent Platform** (formerly Vertex AI) console on Google Cloud.
2. Select **Models** --> **Model Registry** and click **Import**.
3. Configure the first step (**Name and region**):
   * **Import options**: Choose *Import as new model*.
   * **Name**: Enter a descriptive name, e.g., `comfyui-roof-tile-visualizer`.
   * **Description**: Enter a short description of the service. e.g., `ComfyUI container running SDXL, ControlNet Depth, and SAM 3.1 for roof tile inpainting.`
   * **Region**: Select the region where you built your Artifact Registry repository (e.g., `us-central1 (Iowa)`).
   * Click **Continue**.
4. Configure the second step (**Model settings**):
   * Select **Import an existing container**.
   * **Container image**: Point to your built Artifact Registry image URL (e.g., `us-central1-docker.pkg.dev/<YOUR_GCP_PROJECT_ID>/roof-tile-visualizer-repo/comfyui-vertex:latest`).
   * **Health route**: `/health`
   * **Inference route**: `/predict`
   * **Port**: `8080`
   * Click **Import**.
5. Once imported, select the Model from the list, click **Deploy to Endpoint**, and configure the resource allocation:
   * Select a GPU type (e.g., `NVIDIA L4` or `NVIDIA T4`).
   * Set the machine type (e.g., `g2-standard-4` or `n1-standard-4`).
   * Set the minimum nodes to `1` during operational hours to eliminate GPU cold starts (or `0` for auto-scale down, which incurs a ~1-2 minute cold start latency).

Note down the **Endpoint ID** generated for your deployment.

---

## 3. Configuring the Web Application

To route requests from Next.js to the Agent Platform, update your environment variables in `.env.local` (local development) or Cloud Run / Vercel deployment dashboards. Note that the environment variables still retain the `VERTEX_*` prefix for compatibility with the SDK:

```ini
# Enable Agent Platform Routing
VERTEX_USE_ENDPOINT=true

# Google Cloud Project Details
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=your-numeric-endpoint-id

# Local Development Only: Service Account Key
# 1. Create a service account in GCP Console.
# 2. Grant it the "Vertex AI User" role.
# 3. Create and download a JSON Private Key.
# 4. Paste the JSON string here on a single line.
# (Note: Leave blank when deployed to Cloud Run, as it inherits permissions automatically).
VERTEX_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", "private_key_id": "...", "private_key": "...", ...}'
```

---

## 4. Verification

Verify the connection and request format by running the standalone TypeScript test script:

```bash
# From workspace root
npx ts-node tests/test_vertex_ai.ts
```

This script reads the original house photo, parses your credentials, sends a sample payload directly to your live Agent Platform prediction endpoint, and saves the output locally under `tests/vertex_test_output.png`.
