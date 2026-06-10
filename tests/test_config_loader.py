import unittest
import os
import sys

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.config_loader import load_config, get_flat_config

class TestConfigLoader(unittest.TestCase):
    def test_load_config(self):
        cfg = load_config()
        self.assertIn("comfyui_server", cfg)
        self.assertIn("value", cfg["comfyui_server"])
        self.assertIn("description", cfg["comfyui_server"])

    def test_get_flat_config(self):
        flat = get_flat_config()
        self.assertIn("comfyui_server", flat)
        self.assertEqual(flat["comfyui_server"], "http://127.0.0.1:8188")
        
        self.assertIn("sampler_settings.steps", flat)
        self.assertEqual(flat["sampler_settings.steps"], 20)
        
        self.assertIn("local_paths.output_dir", flat)
        self.assertEqual(flat["local_paths.output_dir"], "data/output")
        
        self.assertIn("prompts.positive_prompt_template", flat)

if __name__ == '__main__':
    unittest.main()
