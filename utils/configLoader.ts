import rawConfigs from '../config/advanced_user_configs.json';

/**
 * Resolved type-safe application configurations extracted from config/advanced_user_configs.json
 */
export const configs = {
  comfyui_server: rawConfigs.comfyui_server.value,
  sdxl_checkpoint: rawConfigs.sdxl_checkpoint.value,
  sam_checkpoint: rawConfigs.sam_checkpoint.value,
  controlnet_checkpoint: rawConfigs.controlnet_checkpoint.value,
  sampler_settings: {
    steps: rawConfigs.sampler_settings.steps.value,
    cfg: rawConfigs.sampler_settings.cfg.value,
    sampler_name: rawConfigs.sampler_settings.sampler_name.value,
    scheduler: rawConfigs.sampler_settings.scheduler.value,
    denoise: rawConfigs.sampler_settings.denoise.value,
  },
  sam_settings: {
    threshold: rawConfigs.sam_settings.threshold.value,
    refine_iterations: rawConfigs.sam_settings.refine_iterations.value,
    individual_masks: rawConfigs.sam_settings.individual_masks.value,
    grow_mask_by: rawConfigs.sam_settings.grow_mask_by.value,
  },
  controlnet_settings: {
    strength: rawConfigs.controlnet_settings.strength.value,
    start_percent: rawConfigs.controlnet_settings.start_percent.value,
    end_percent: rawConfigs.controlnet_settings.end_percent.value,
  },
  midas_settings: {
    a: rawConfigs.midas_settings.a.value,
    bg_threshold: rawConfigs.midas_settings.bg_threshold.value,
    resolution: rawConfigs.midas_settings.resolution.value,
  },
  supabase_settings: {
    bucket_name: rawConfigs.supabase_settings.bucket_name.value,
  },
  local_paths: {
    output_dir: rawConfigs.local_paths.output_dir.value,
    default_house_image: rawConfigs.local_paths.default_house_image.value,
    local_mask_path: rawConfigs.local_paths.local_mask_path.value,
    save_filename_prefix: rawConfigs.local_paths.save_filename_prefix.value,
  },
  prompts: {
    positive_prompt_template: rawConfigs.prompts.positive_prompt_template.value,
    negative_prompt: rawConfigs.prompts.negative_prompt.value,
    default_tile_prompt: rawConfigs.prompts.default_tile_prompt.value,
  },
  vertex_ai_settings: {
    use_vertex_ai: process.env.VERTEX_USE_ENDPOINT === 'true' || ((rawConfigs as any).vertex_ai_settings?.use_vertex_ai?.value ?? false),
    project_id: process.env.VERTEX_PROJECT_ID || ((rawConfigs as any).vertex_ai_settings?.project_id?.value ?? ''),
    location: process.env.VERTEX_LOCATION || ((rawConfigs as any).vertex_ai_settings?.location?.value ?? 'us-central1'),
    endpoint_id: process.env.VERTEX_ENDPOINT_ID || ((rawConfigs as any).vertex_ai_settings?.endpoint_id?.value ?? ''),
  }
};
export default configs;
