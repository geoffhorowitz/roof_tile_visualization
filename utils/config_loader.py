import json
import os

def load_config():
    """Loads the config file and returns it as a dictionary with value and description details."""
    # Resolve path relative to this file's directory (utils/)
    utils_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(utils_dir, "../config/advanced_user_configs.json")
    config_path = os.path.normpath(config_path)
    
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found at {config_path}")
        
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_flat_config():
    """
    Returns a flattened dictionary mapping config dot-paths (and top-level keys) to their values.
    For example:
        "comfyui_server" -> "http://127.0.0.1:8188"
        "sampler_settings.steps" -> 20
        "local_paths.output_dir" -> "data/output"
    """
    data = load_config()
    flat = {}
    
    def parse_dict(d, prefix=""):
        for k, v in d.items():
            if isinstance(v, dict) and "value" in v:
                flat[prefix + k] = v["value"]
            elif isinstance(v, dict):
                parse_dict(v, prefix + k + ".")
                
    parse_dict(data)
    return flat
