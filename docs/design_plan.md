# Roof Tile Visualizer Design Document

This document outlines the architecture, tech stack, and implementation steps for the Roof Tile Visualizer web application. The goal is to allow users to upload an image of their house, select a new roof tile style/color, and generate a photorealistic image showing the new roof.

## User Review Required
> [!IMPORTANT]
> Please review the architecture and testing strategies below, especially regarding the AI API integration and the local testing approach you asked about.

## Open Questions
> [!NOTE]
> **Agent Platform (GCP) for Production**: Yes, you are absolutely right! Google Cloud's Model Garden on the Gemini Enterprise Agent Platform (formerly Vertex AI) now has native integrations with Hugging Face, allowing us to easily deploy open-source models (like Stable Diffusion or ControlNet) to Agent Platform endpoints. Since you have GCP credits, this is the perfect solution for production to avoid out-of-pocket costs.
> 
> **Recommendation**: Let's build and test the pipeline entirely on your local RTX 3060 (12GB VRAM) for zero-cost, rapid development. Once the application works flawlessly locally, we will deploy the exact same Hugging Face models to an Agent Platform endpoint using your GCP credits for production.

## Proposed Architecture

### 1. Frontend (Web App)
- **Framework**: Next.js (React) using the App Router.
- **Styling**: Vanilla CSS (to provide a premium, dynamic, and customized UI with animations and responsive design).
- **Core Components**:
  - Image Upload interface (drag & drop).
  - Tile/Color Selection sidebar (catalog of roofing materials).
  - "Before & After" image comparison slider.

### 2. Backend & Data Storage
- **Platform**: Supabase
  - **Auth**: Email/password and social login (requires users to log in before uploading).
  - **Database (PostgreSQL)**: To store the catalog of available roof tiles, user profiles, and generation history.
  - **Storage**: Cloud buckets to store the uploaded original images and the AI-generated results.
- **Hosting**: Vercel (for frontend and serverless API endpoints).

### 3. AI Image Processing
- **Approach**: Local AI Image-to-Image Generation (Inpainting) using your RTX 3060 (12GB VRAM) for testing, with a direct migration path to Agent Platform (via Hugging Face on Model Garden) for production.
- **Workflow**:
  1. User uploads house image.
  2. Next.js API sends image to your local AI instance (e.g., ComfyUI API or Automatic1111) to create a "mask" of the existing roof using a segmentation model.
  3. The local AI runs an Inpainting model (like Stable Diffusion + ControlNet) with the mask and a prompt for the new tile.
  4. The generated image is returned to the frontend and saved to Supabase Storage.

## Proposed Changes

### c:/Users/geoff/github_repos/personal/roof_tile_visualizer
We will initialize the Next.js project here and configure the necessary folders.

#### [NEW] `agent_artifacts/2026.05.25_plan_initial_design.md`
A saved copy of this finalized plan.

#### [NEW] `package.json`
Next.js project initialization.

#### [NEW] `app/page.tsx`
The main landing page and visualizer interface.

#### [NEW] `app/globals.css`
The vanilla CSS file for our premium design aesthetics.

#### [NEW] `components/ImageUploader.tsx`
Component for handling image uploads.

#### [NEW] `components/TileSelector.tsx`
Component for selecting tile styles.

#### [NEW] `docs/LOCAL_AI_SETUP.md`
README explaining how to set up the local AI environment (ComfyUI/A1111) and run the models on your RTX 3060.

#### [NEW] `tests/test_local_ai.py`
A test suite to validate the local AI endpoint and ensure the masking/inpainting pipeline is working correctly before integrating with the web UI.

## Verification Plan

### Automated Tests
- **Local AI Test Suite**: Run `test_local_ai.py` against the local AI instance to verify generation quality and API connectivity.
- Test the Next.js frontend locally using `npm run dev`.
- Verify the Supabase database connection and storage bucket uploads.

### Manual Verification
- Create a test account via the Auth flow.
- Manually upload a test image of a house.
- Select a red terracotta tile.
- Wait for the generation and verify the resulting image is displayed correctly on the screen.
