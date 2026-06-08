# Welcome Agents! 

You have been invoked to participate in a "Divide and Conquer" workflow to build the **Roof Tile Visualizer**, a Next.js web application that uses AI to replace the roof on a user's uploaded house photo with a new selected tile style.

## Architecture & Background
- **Frontend**: Next.js App Router, React, Vanilla CSS (premium dark mode, glassmorphism).
- **Backend (Current Interim state)**: The Next.js API route (`app/api/generate/route.ts`) securely proxies image generation requests to a local ComfyUI server (`127.0.0.1:8188`) via an image proxy to avoid browser CORS/loading issues.
- **Backend (Future Production state)**: The ComfyUI pipeline will be replaced by Vertex AI endpoints (using GCP credits) hosting Hugging Face models (SDXL + ControlNet).
- **Database/Auth**: Will be handled by Supabase (PostgreSQL, Storage, Auth).

## Important Documents
Before taking any action, please familiarize yourself with the project by reading:
- The design documents in 'docs/design_plan.md` and the `agent_artifacts/` directory (especially `2026.06.06_plan_comfyui_integration.md`).
- `walkthrough.md`: A summary of the codebase and application architecture.

## Task Delegation Rules (CRITICAL)
We are using a "Divide and Conquer" approach. The master task list is located in `TODO.md` at the root of the project.

When you receive an assignment from the user, you must follow these rules strictly:
1. Open `TODO.md` to locate your assigned task.
2. Check the status of your assigned task.
3. If the task is marked as `[x]` (completed) or `[/]` (in progress), **DO NOT WORK ON IT**. Another agent is already handling it. Stop and notify the user immediately.
4. If the task is marked as `[ ]` (uncompleted), **change it to `[/]` (in progress)** before you begin working!
5. When you finish the task, change the marker to `[x]` (completed) and update the user.
6. Follow all User Global rules (such as writing Execution Updates in `agent_artifacts/` after finishing an implementation plan).
