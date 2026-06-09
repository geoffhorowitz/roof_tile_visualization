-- -------------------------------------------------------------
-- Supabase Schema for Roof Tile Visualizer
-- -------------------------------------------------------------

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  full_name TEXT,
  avatar_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Roof Tiles Table (Catalog)
CREATE TABLE IF NOT EXISTS public.roof_tiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  prompt TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.roof_tiles ENABLE ROW LEVEL SECURITY;

-- Roof Tiles Policies
CREATE POLICY "Roof tiles are viewable by everyone" ON public.roof_tiles
  FOR SELECT USING (true);


-- 3. Generations Table (History)
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tile_id TEXT REFERENCES public.roof_tiles(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  original_image_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Generations Policies
CREATE POLICY "Users can view their own generations" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations" ON public.generations
  FOR DELETE USING (auth.uid() = user_id);


-- 4. Storage Bucket Setup
-- Programmatically insert the public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('roof-visualizer', 'roof-visualizer', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects
-- Allow public select access to files
CREATE POLICY "Public Select Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'roof-visualizer');

-- Allow authenticated users to upload files into their own user-scoped directory
CREATE POLICY "Auth User Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'roof-visualizer' AND 
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files they own
CREATE POLICY "Auth User Delete Access" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'roof-visualizer' AND 
    auth.role() = 'authenticated'
  );


-- 5. Seed Data (Pre-seed the roof tiles from config/tileCatalog.ts)
INSERT INTO public.roof_tiles (id, name, category, color_hex, prompt, thumbnail_url) VALUES
  ('arch-terracotta', 'Terracotta Red', 'Architectural Tiles', '#8b3a2b', 'red terracotta spanish roof tiles', '/architectural/terracotta_red.png'),
  ('arch-slate', 'Slate Grey', 'Architectural Tiles', '#4a5568', 'dark grey slate roof tiles', '/architectural/slate_grey.png'),
  ('arch-clay', 'Mediterranean Clay', 'Architectural Tiles', '#cd5c5c', 'mediterranean clay barrel roof tiles', '/architectural/mediterranean_clay.png'),
  ('arch-metal', 'Forest Green Metal', 'Architectural Tiles', '#2f4f4f', 'forest green metal standing seam roof', '/architectural/forest_green_metal.png'),
  ('arch-wood', 'Weathered Wood Cedar', 'Architectural Tiles', '#8b7355', 'weathered wood cedar shake roof', '/architectural/cedar_shake.png'),
  ('gaf-barkwood', 'Barkwood', 'GAF Timberline HDZ', '#5c4a3c', 'barkwood, dark brown asphalt shingles roof, textured brown shingles', '/shingles/GAF Timberline HDZ Barkwood.avif'),
  ('gaf-birchwood', 'Birchwood', 'GAF Timberline HDZ', '#bfae9e', 'birchwood, light grey asphalt shingles roof, silver grey shingles', '/shingles/GAF Timberline HDZ Birchwood.avif'),
  ('gaf-biscayne-blue', 'Biscayne Blue', 'GAF Timberline HDZ', '#3b5a75', 'biscayne blue, slate blue asphalt shingles roof, navy blue color', '/shingles/GAF Timberline HDZ Biscayne Blue.avif'),
  ('gaf-chestnut-valley', 'Chestnut Valley', 'GAF Timberline HDZ', '#4a3b2c', 'chestnut valley, deep brown asphalt shingles roof, dark chestnut brown', '/shingles/GAF Timberline HDZ Chestnut Valley.avif'),
  ('gaf-cliffside', 'Cliffside', 'GAF Timberline HDZ', '#6b7075', 'cliffside grey, medium grey asphalt shingles roof, stone grey', '/shingles/GAF Timberline HDZ Cliffside.avif'),
  ('gaf-copper-canyon', 'Copper Canyon', 'GAF Timberline HDZ', '#804a30', 'copper canyon, reddish brown asphalt shingles roof, warm copper terracotta brown', '/shingles/GAF Timberline HDZ Copper Canyon.avif'),
  ('gaf-driftwood', 'Driftwood', 'GAF Timberline HDZ', '#7c7267', 'driftwood, greyish brown asphalt shingles roof, weathered driftwood color', '/shingles/GAF Timberline HDZ Driftwood.avif'),
  ('gaf-fox-hollow', 'Fox Hollow', 'GAF Timberline HDZ', '#8c9094', 'fox hollow, light grey asphalt shingles roof, pale grey shingles', '/shingles/GAF Timberline HDZ Fox Hollow.avif'),
  ('gaf-golden-amber', 'Golden Amber', 'GAF Timberline HDZ', '#a67438', 'golden amber, warm golden brown asphalt shingles roof, amber honey color', '/shingles/GAF Timberline HDZ Golden Amber.avif'),
  ('gaf-hickory', 'Hickory', 'GAF Timberline HDZ', '#3b2d21', 'hickory, dark brown asphalt shingles roof, deep hickory brown', '/shingles/GAF Timberline HDZ Hickory.avif'),
  ('gaf-hunter-green', 'Hunter Green', 'GAF Timberline HDZ', '#26402d', 'hunter green, dark forest green asphalt shingles roof, deep green color', '/shingles/GAF Timberline HDZ Hunter Green.avif'),
  ('gaf-midnight-mesa', 'Midnight Mesa', 'GAF Timberline HDZ', '#2c2826', 'midnight mesa, dark brown asphalt shingles roof, near-black charcoal brown', '/shingles/GAF Timberline HDZ Midnight Mesa.avif'),
  ('gaf-mission-brown', 'Mission Brown', 'GAF Timberline HDZ', '#403024', 'mission brown, dark soil brown asphalt shingles roof, warm brown', '/shingles/GAF Timberline HDZ Mission Brown.avif'),
  ('gaf-oyster-gray', 'Oyster Gray', 'GAF Timberline HDZ', '#a8aba6', 'oyster gray, light grey asphalt shingles roof, pale oyster grey', '/shingles/GAF Timberline HDZ Oyster Gray.avif'),
  ('gaf-patriot-red', 'Patriot Red', 'GAF Timberline HDZ', '#7a2b2d', 'patriot red, deep brick red asphalt shingles roof, dark red color', '/shingles/GAF Timberline HDZ Patriot Red.avif'),
  ('gaf-pewter-gray', 'Pewter Gray', 'GAF Timberline HDZ', '#575a5e', 'pewter gray, dark grey asphalt shingles roof, charcoal pewter grey', '/shingles/GAF Timberline HDZ Pewter Gray.avif'),
  ('gaf-shakewood', 'Shakewood', 'GAF Timberline HDZ', '#9e8e78', 'shakewood, light brown asphalt shingles roof, sandy wood brown', '/shingles/GAF Timberline HDZ Shakewood.avif'),
  ('gaf-sierra-sand', 'Sierra Sand', 'GAF Timberline HDZ', '#aba291', 'sierra sand, beige asphalt shingles roof, sandy tan color', '/shingles/GAF Timberline HDZ Sierra Sand.avif'),
  ('gaf-sunset-brick', 'Sunset Brick', 'GAF Timberline HDZ', '#944b36', 'sunset brick, reddish terracotta asphalt shingles roof, warm brick red', '/shingles/GAF Timberline HDZ Sunset Brick.avif'),
  ('gaf-weathered-wood', 'Weathered Wood', 'GAF Timberline HDZ', '#6b5d52', 'weathered wood, brown asphalt shingles roof, rustic weathered wood color', '/shingles/GAF Timberline HDZ Weathered Wood.avif'),
  ('gaf-williamsburg-slate', 'Williamsburg Slate', 'GAF Timberline HDZ', '#48525c', 'williamsburg slate, blue-grey asphalt shingles roof, slate blue', '/shingles/GAF Timberline HDZ Williamsburg Slate.avif'),
  ('oc-autumn-brown', 'Autumn Brown', 'Owens Corning Supreme', '#5c4333', 'autumn brown, warm brown asphalt shingles roof, autumn foliage brown', '/shingles/Owens Corning Supreme Autumn Brown.avif'),
  ('oc-brownwood', 'Brownwood', 'Owens Corning Supreme', '#4a382c', 'brownwood, dark brown asphalt shingles roof, wood brown', '/shingles/Owens Corning Supreme Brownwood.avif'),
  ('oc-desert-tan', 'Desert Tan', 'Owens Corning Supreme', '#a39178', 'desert tan, sandy beige asphalt shingles roof, tan color', '/shingles/Owens Corning Supreme Desert Tan.avif'),
  ('oc-driftwood', 'Driftwood', 'Owens Corning Supreme', '#6e665a', 'driftwood, greyish brown asphalt shingles roof, weathered wood', '/shingles/Owens Corning Supreme Driftwood.avif'),
  ('oc-estate-gray', 'Estate Gray', 'Owens Corning Supreme', '#5d6166', 'estate gray, medium grey asphalt shingles roof, slate grey', '/shingles/Owens Corning Supreme Estate Gray.avif'),
  ('oc-onyx-black', 'Onyx Black', 'Owens Corning Supreme', '#1f2021', 'onyx black, deep dark black asphalt shingles roof, charcoal black', '/shingles/Owens Corning Supreme Onyx Black.avif'),
  ('oc-shasta-white', 'Shasta White', 'Owens Corning Supreme', '#e3e5e6', 'shasta white, bright clean white asphalt shingles roof, light grey shadows, white color', '/shingles/Owens Corning Supreme Shasta White.avif'),
  ('oc-teak', 'Teak', 'Owens Corning Supreme', '#453526', 'teak, dark teak brown asphalt shingles roof, deep brown', '/shingles/Owens Corning Supreme Teak.avif')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  color_hex = EXCLUDED.color_hex,
  prompt = EXCLUDED.prompt,
  thumbnail_url = EXCLUDED.thumbnail_url;
