# TODO: Roof Tile Visualizer Open Tasks

This file outlines the features and fixes that are currently outstanding, their current limitations, and the proposed long-term solutions.

**Status Legend:**
- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed

---

## 1. ComfyUI True Inpainting Workflow & Agent Platform Migration
* **Issue with Current State:** 
  The Next.js backend (`app/api/generate/route.ts`) queues a simple whole-image Image-to-Image workflow using a base SDXL model with `denoise: 0.85` on a local ComfyUI instance. This modifies the entire image rather than targeting only the roof, and requires the user to run a local GPU server.
* **Proposed Interim Approach (Perfecting Local AI):** 
  Upgrade the local ComfyUI workflow to true Inpainting.
  - `[x]` Add a segmentation step (e.g., using Segment Anything (SAM) or YOLO-World node) to automatically isolate the roof pixels.
  - `[x]` Load a proper SDXL Inpainting checkpoint (such as `sd_xl_inpainting_0.1.safetensors`).
  - `[x]` Integrate a ControlNet Depth SDXL node with the original image to preserve structural details.
  - `[x]` Save this perfect node setup as "API Format" JSON and replace the placeholder in `app/api/generate/route.ts`.
* **Proposed Long-Term Approach (Agent Platform Production):**
  - [x] To remove the local GPU dependency for production, deploy the exact finalized Hugging Face models (SDXL + ControlNet) to a Google Cloud Agent Platform endpoint via Model Garden.
  - [x] Update the Next.js API route (`app/api/generate/route.ts`) to securely send the image to Agent Platform instead of `127.0.0.1:8188`, using your GCP credits.

## 2. Supabase Backend Integration
* **Issue with Current State:** 
  The application is completely stateless. It lacks user authentication, database models, and cloud storage. The roof tile catalog is hardcoded into the component, and generated images are temporarily proxied from the local ComfyUI API without persistence.
* **Proposed Interim Approach (Local Storage):**
  - `[x]` Save generated output images to the local `data/output/` folder and serve them via `/api/image` from disk to prevent loss when ComfyUI restarts or runs offline.
* **Proposed Long-Term Approach:**
  Configure Supabase as the core backend:
  - `[x]` Install `@supabase/supabase-js`.
  - `[x]` Implement Supabase Auth with custom styled login/signup screens, utilizing Next.js App Router middleware to protect the `/api/generate` and dashboard routes.
  - `[x]` Create SQL tables in PostgreSQL (`profiles`, `roof_tiles`, `generations`).
  - `[x]` Create Supabase Storage buckets to save the uploaded house images and the generated output files returned by ComfyUI, preventing local file loss.

## 3. Interactive Before/After Image Comparison Slider
* **Issue with Current State:** 
  The UI simply toggles between showing the original "Before" image and the generated "After" image. There is no interactive side-by-side or sliding comparison.
* **Proposed Long-Term Approach:** 
  Create an interactive, slide-to-compare widget in the frontend.
  - `[x]` Implement a React component that overlaps both images and uses a divider handle that users can drag left/right. The drag position updates the `clip-path` of the top image.

## 4. Tile Catalog Thumbnails
* **Issue with Current State:** 
  The `TileSelector` component displays flat solid color squares (`colorHex`) instead of realistic thumbnail previews of the tiles.
* **Proposed Long-Term Approach:** 
  Produce and add realistic thumbnail images.
  - `[x]` Generate or download realistic thumbnail images (e.g., in `.jpg` or `.webp` format) representing terracotta tiles, grey slate tiles, metal standing seam roofs, etc.
  - `[x]` Update `TileOption` in `TileSelector.tsx` to render these image assets.

## 5. README & Setup Walkthrough Upgrades
* **Issue with Current State:** 
  The root `README.md` is a boilerplate Next.js template. It does not explain how to run the app, set up the environment, or run backend AI server validations.
* **Proposed Long-Term Approach:** 
  Refactor `README.md` to be a comprehensive developer guide.
- `[x]` Update `README.md` to cover dependencies installation, environment variables setup (e.g., Supabase credentials, ComfyUI URL), local test executions (`test_local_ai.py`), and running the Next.js development server.

## 6. Next.js Production Deployment (Google Cloud Run)
* **Issue with Current State:** 
  The Next.js application only runs locally. For production, it needs to be containerized and deployed. To avoid network egress charges and minimize latency with the Agent Platform endpoint, the application needs to be deployed in the same GCP region.
* **Proposed Long-Term Approach:** 
  Deploy the Next.js application to Google Cloud Run:
  - `[ ]` Create a production-ready `Dockerfile` for the Next.js application.
  - `[ ]` Configure Google Cloud Artifact Registry and Cloud Build to build and host the container images.
  - `[ ]` Deploy the application container to Google Cloud Run in the same GCP region (e.g., `us-central1`) as the Agent Platform endpoints.
  - `[ ]` Bind the production custom domain and configure production environment variables (e.g., Supabase keys, Agent Platform target project and endpoint configuration).
