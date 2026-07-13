'use client';
import { useState, useEffect } from 'react';
import { API } from '@/lib/api';

const BEDROCK_ITEMS = [
  { id: "acacia_button", label: "Acacia Button" },
  { id: "acacia_door", label: "Acacia Door" },
  { id: "acacia_fence_gate", label: "Acacia Fence Gate" },
  { id: "acacia_hanging_sign", label: "Acacia Hanging Sign" },
  { id: "acacia_pressure_plate", label: "Acacia Pressure Plate" },
  { id: "acacia_shelf", label: "Acacia Shelf" },
  { id: "acacia_sign", label: "Acacia Sign" },
  { id: "acacia_standing_sign", label: "Acacia Sign" },
  { id: "acacia_stairs", label: "Acacia Stairs" },
  { id: "acacia_trapdoor", label: "Acacia Trapdoor" },
  { id: "acacia_wall_sign", label: "Acacia Wall Sign" },
  { id: "activator_rail", label: "Activator Rail" },
  { id: "allow", label: "Allow" },
  { id: "amethyst_cluster", label: "Amethyst Cluster" },
  { id: "amethyst_shard", label: "Amethyst Shard" },
  { id: "ancient_debris", label: "Ancient Debris" },
  { id: "andesite_stairs", label: "Andesite Stairs" },
  { id: "angler_pottery_sherd", label: "Angler Pottery Sherd" },
  { id: "anvil", label: "Anvil" },
  { id: "apple", label: "Apple" },
  { id: "archer_pottery_sherd", label: "Archer Pottery Sherd" },
  { id: "armadillo_scute", label: "Armadillo Scute" },
  { id: "armor_stand", label: "Armor Stand" },
  { id: "arms_up_pottery_sherd", label: "Arms Up Pottery Sherd" },
  { id: "arrow", label: "Arrow" },
  { id: "azalea", label: "Azalea" },
  { id: "azalea_leaves", label: "Azalea Leaves" },
  { id: "baked_potato", label: "Baked Potato" },
  { id: "bamboo", label: "Bamboo" },
  { id: "bamboo_button", label: "Bamboo Button" },
  { id: "bamboo_door", label: "Bamboo Door" },
  { id: "bamboo_double_slab", label: "Bamboo Double Slab" },
  { id: "bamboo_fence", label: "Bamboo Fence" },
  { id: "bamboo_fence_gate", label: "Bamboo Fence Gate" },
  { id: "bamboo_hanging_sign", label: "Bamboo Hanging Sign" },
  { id: "bamboo_mosaic", label: "Bamboo Mosaic" },
  { id: "bamboo_mosaic_double_slab", label: "Bamboo Mosaic Double Slab" },
  { id: "bamboo_mosaic_slab", label: "Bamboo Mosaic Slab" },
  { id: "bamboo_mosaic_stairs", label: "Bamboo Mosaic Stairs" },
  { id: "bamboo_planks", label: "Bamboo Planks" },
  { id: "bamboo_pressure_plate", label: "Bamboo Pressure Plate" },
  { id: "bamboo_sapling", label: "Bamboo Sapling" },
  { id: "bamboo_shelf", label: "Bamboo Shelf" },
  { id: "bamboo_sign", label: "Bamboo Sign" },
  { id: "bamboo_standing_sign", label: "Bamboo Sign" },
  { id: "bamboo_slab", label: "Bamboo Slab" },
  { id: "bamboo_stairs", label: "Bamboo Stairs" },
  { id: "bamboo_trapdoor", label: "Bamboo Trapdoor" },
  { id: "bamboo_wall_sign", label: "Bamboo Wall Sign" },
  { id: "standing_banner", label: "Banner" },
  { id: "banner_pattern", label: "Banner Pattern" },
  { id: "barrel", label: "Barrel" },
  { id: "barrier", label: "Barrier" },
  { id: "basalt", label: "Basalt" },
  { id: "beacon", label: "Beacon" },
  { id: "bed", label: "Bed" },
  { id: "bedrock", label: "Bedrock" },
  { id: "bee_nest", label: "Bee Nest" },
  { id: "beehive", label: "Beehive" },
  { id: "beetroot", label: "Beetroot" },
  { id: "beetroot_seeds", label: "Beetroot Seeds" },
  { id: "beetroot_soup", label: "Beetroot Soup" },
  { id: "bell", label: "Bell" },
  { id: "big_dripleaf", label: "Big Dripleaf" },
  { id: "birch_button", label: "Birch Button" },
  { id: "birch_door", label: "Birch Door" },
  { id: "birch_fence_gate", label: "Birch Fence Gate" },
  { id: "birch_hanging_sign", label: "Birch Hanging Sign" },
  { id: "birch_pressure_plate", label: "Birch Pressure Plate" },
  { id: "birch_shelf", label: "Birch Shelf" },
  { id: "birch_sign", label: "Birch Sign" },
  { id: "birch_standing_sign", label: "Birch Sign" },
  { id: "birch_stairs", label: "Birch Stairs" },
  { id: "birch_trapdoor", label: "Birch Trapdoor" },
  { id: "birch_wall_sign", label: "Birch Wall Sign" },
  { id: "black_candle", label: "Black Candle" },
  { id: "black_harness", label: "Black Harness" },
  { id: "blackstone", label: "Blackstone" },
  { id: "blackstone_double_slab", label: "Blackstone Double Slab" },
  { id: "blackstone_slab", label: "Blackstone Slab" },
  { id: "blackstone_stairs", label: "Blackstone Stairs" },
  { id: "blackstone_wall", label: "Blackstone Wall" },
  { id: "blade_pottery_sherd", label: "Blade Pottery Sherd" },
  { id: "blast_furnace", label: "Blast Furnace" },
  { id: "blaze_powder", label: "Blaze Powder" },
  { id: "blaze_rod", label: "Blaze Rod" },
  { id: "amethyst_block", label: "Block of Amethyst" },
  { id: "bamboo_block", label: "Block of Bamboo" },
  { id: "coal_block", label: "Block of Coal" },
  { id: "copper_block", label: "Block of Copper" },
  { id: "diamond_block", label: "Block of Diamond" },
  { id: "emerald_block", label: "Block of Emerald" },
  { id: "gold_block", label: "Block of Gold" },
  { id: "iron_block", label: "Block of Iron" },
  { id: "lapis_block", label: "Block of Lapis Lazuli" },
  { id: "netherite_block", label: "Block of Netherite" },
  { id: "quartz_block", label: "Block of Quartz" },
  { id: "raw_copper_block", label: "Block of Raw Copper" },
  { id: "raw_gold_block", label: "Block of Raw Gold" },
  { id: "raw_iron_block", label: "Block of Raw Iron" },
  { id: "redstone_block", label: "Block of Redstone" },
  { id: "resin_block", label: "Block of Resin" },
  { id: "stripped_bamboo_block", label: "Block of Stripped Bamboo" },
  { id: "blue_candle", label: "Blue Candle" },
  { id: "blue_egg", label: "Blue Egg" },
  { id: "blue_harness", label: "Blue Harness" },
  { id: "blue_ice", label: "Blue Ice" },
  { id: "bolt_armor_trim_smithing_template", label: "Bolt Armor Trim" },
  { id: "bone", label: "Bone" },
  { id: "bone_block", label: "Bone Block" },
  { id: "book", label: "Book" },
  { id: "writable_book", label: "Book and Quill" },
  { id: "bookshelf", label: "Bookshelf" },
  { id: "border_block", label: "Border" },
  { id: "bordure_indented_banner_pattern", label: "Bordure Indented Banner Pattern" },
  { id: "experience_bottle", label: "Bottle o' Enchanting" },
  { id: "bow", label: "Bow" },
  { id: "bowl", label: "Bowl" },
  { id: "brain_coral_wall_fan", label: "Brain Coral Wall Fan" },
  { id: "bread", label: "Bread" },
  { id: "breeze_rod", label: "Breeze Rod" },
  { id: "brewer_pottery_sherd", label: "Brewer Pottery Sherd" },
  { id: "brewing_stand", label: "Brewing Stand" },
  { id: "brick", label: "Brick" },
  { id: "brick_stairs", label: "Brick Stairs" },
  { id: "brick_block", label: "Bricks" },
  { id: "brown_candle", label: "Brown Candle" },
  { id: "brown_egg", label: "Brown Egg" },
  { id: "brown_harness", label: "Brown Harness" },
  { id: "brown_mushroom", label: "Brown Mushroom" },
  { id: "brush", label: "Brush" },
  { id: "bubble_column", label: "Bubble Column" },
  { id: "bubble_coral_wall_fan", label: "Bubble Coral Wall Fan" },
  { id: "bucket", label: "Bucket" },
  { id: "budding_amethyst", label: "Budding Amethyst" },
  { id: "burn_pottery_sherd", label: "Burn Pottery Sherd" },
  { id: "bush", label: "Bush" },
  { id: "cactus", label: "Cactus" },
  { id: "cactus_flower", label: "Cactus Flower" },
  { id: "cake", label: "Cake" },
  { id: "black_candle_cake", label: "Cake with Black Candle" },
  { id: "blue_candle_cake", label: "Cake with Blue Candle" },
  { id: "brown_candle_cake", label: "Cake with Brown Candle" },
  { id: "candle_cake", label: "Cake with Candle" },
  { id: "cyan_candle_cake", label: "Cake with Cyan Candle" },
  { id: "gray_candle_cake", label: "Cake with Gray Candle" },
  { id: "green_candle_cake", label: "Cake with Green Candle" },
  { id: "light_blue_candle_cake", label: "Cake with Light Blue Candle" },
  { id: "light_gray_candle_cake", label: "Cake with Light Gray Candle" },
  { id: "lime_candle_cake", label: "Cake with Lime Candle" },
  { id: "magenta_candle_cake", label: "Cake with Magenta Candle" },
  { id: "orange_candle_cake", label: "Cake with Orange Candle" },
  { id: "pink_candle_cake", label: "Cake with Pink Candle" },
  { id: "purple_candle_cake", label: "Cake with Purple Candle" },
  { id: "red_candle_cake", label: "Cake with Red Candle" },
  { id: "white_candle_cake", label: "Cake with White Candle" },
  { id: "yellow_candle_cake", label: "Cake with Yellow Candle" },
  { id: "calcite", label: "Calcite" },
  { id: "calibrated_sculk_sensor", label: "Calibrated Sculk Sensor" },
  { id: "camera", label: "Camera" },
  { id: "campfire", label: "Campfire" },
  { id: "candle", label: "Candle" },
  { id: "carpet", label: "Carpet" },
  { id: "carrot", label: "Carrot" },
  { id: "carrots", label: "Carrots" },
  { id: "cartography_table", label: "Cartography Table" },
  { id: "carved_pumpkin", label: "Carved Pumpkin" },
  { id: "cauldron", label: "Cauldron" },
  { id: "cave_vines", label: "Cave Vines" },
  { id: "cave_vines_body_with_berries", label: "Cave Vines" },
  { id: "cave_vines_head_with_berries", label: "Cave Vines" },
  { id: "chain", label: "Chain" },
  { id: "chain_command_block", label: "Chain Command Block" },
  { id: "chainmail_boots", label: "Chainmail Boots" },
  { id: "chainmail_chestplate", label: "Chainmail Chestplate" },
  { id: "chainmail_helmet", label: "Chainmail Helmet" },
  { id: "chainmail_leggings", label: "Chainmail Leggings" },
  { id: "chalkboard", label: "Chalkboard" },
  { id: "charcoal", label: "Charcoal" },
  { id: "cherry_button", label: "Cherry Button" },
  { id: "cherry_door", label: "Cherry Door" },
  { id: "cherry_double_slab", label: "Cherry Double Slab" },
  { id: "cherry_fence", label: "Cherry Fence" },
  { id: "cherry_fence_gate", label: "Cherry Fence Gate" },
  { id: "cherry_hanging_sign", label: "Cherry Hanging Sign" },
  { id: "cherry_leaves", label: "Cherry Leaves" },
  { id: "cherry_log", label: "Cherry Log" },
  { id: "cherry_planks", label: "Cherry Planks" },
  { id: "cherry_pressure_plate", label: "Cherry Pressure Plate" },
  { id: "cherry_sapling", label: "Cherry Sapling" },
  { id: "cherry_shelf", label: "Cherry Shelf" },
  { id: "cherry_sign", label: "Cherry Sign" },
  { id: "cherry_standing_sign", label: "Cherry Sign" },
  { id: "cherry_slab", label: "Cherry Slab" },
  { id: "cherry_stairs", label: "Cherry Stairs" },
  { id: "cherry_trapdoor", label: "Cherry Trapdoor" },
  { id: "cherry_wall_sign", label: "Cherry Wall Sign" },
  { id: "cherry_wood", label: "Cherry Wood" },
  { id: "chest", label: "Chest" },
  { id: "chiseled_bookshelf", label: "Chiseled Bookshelf" },
  { id: "chiseled_cinnabar", label: "Chiseled Cinnabar" },
  { id: "chiseled_copper", label: "Chiseled Copper" },
  { id: "chiseled_deepslate", label: "Chiseled Deepslate" },
  { id: "chiseled_nether_bricks", label: "Chiseled Nether Bricks" },
  { id: "chiseled_polished_blackstone", label: "Chiseled Polished Blackstone" },
  { id: "chiseled_resin_bricks", label: "Chiseled Resin Bricks" },
  { id: "chiseled_sulfur", label: "Chiseled Sulfur" },
  { id: "chiseled_tuff", label: "Chiseled Tuff" },
  { id: "chiseled_tuff_bricks", label: "Chiseled Tuff Bricks" },
  { id: "chorus_flower", label: "Chorus Flower" },
  { id: "chorus_fruit", label: "Chorus Fruit" },
  { id: "chorus_plant", label: "Chorus Plant" },
  { id: "cinnabar", label: "Cinnabar" },
  { id: "cinnabar_brick_double_slab", label: "Cinnabar Brick Double Slab" },
  { id: "cinnabar_brick_slab", label: "Cinnabar Brick Slab" },
  { id: "cinnabar_brick_stairs", label: "Cinnabar Brick Stairs" },
  { id: "cinnabar_brick_wall", label: "Cinnabar Brick Wall" },
  { id: "cinnabar_bricks", label: "Cinnabar Bricks" },
  { id: "cinnabar_double_slab", label: "Cinnabar Double Slab" },
  { id: "cinnabar_slab", label: "Cinnabar Slab" },
  { id: "cinnabar_stairs", label: "Cinnabar Stairs" },
  { id: "cinnabar_wall", label: "Cinnabar Wall" },
  { id: "clay", label: "Clay" },
  { id: "clay_ball", label: "Clay Ball" },
  { id: "clock", label: "Clock" },
  { id: "closed_eyeblossom", label: "Closed Eyeblossom" },
  { id: "coal", label: "Coal" },
  { id: "coal_ore", label: "Coal Ore" },
  { id: "coast_armor_trim_smithing_template", label: "Coast Armor Trim" },
  { id: "cobbled_deepslate", label: "Cobbled Deepslate" },
  { id: "cobbled_deepslate_double_slab", label: "Cobbled Deepslate Double Slab" },
  { id: "cobbled_deepslate_slab", label: "Cobbled Deepslate Slab" },
  { id: "cobbled_deepslate_stairs", label: "Cobbled Deepslate Stairs" },
  { id: "cobbled_deepslate_wall", label: "Cobbled Deepslate Wall" },
  { id: "cobblestone", label: "Cobblestone" },
  { id: "stone_stairs", label: "Cobblestone Stairs" },
  { id: "web", label: "Cobweb" },
  { id: "cocoa", label: "Cocoa" },
  { id: "command_block", label: "Command Block" },
  { id: "compass", label: "Compass" },
  { id: "composter", label: "Composter" },
  { id: "conduit", label: "Conduit" },
  { id: "cooked_chicken", label: "Cooked Chicken" },
  { id: "cooked_fish", label: "Cooked Cod" },
  { id: "cooked_porkchop", label: "Cooked Porkchop" },
  { id: "porkchop_cooked", label: "Cooked Porkchop" },
  { id: "cooked_rabbit", label: "Cooked Rabbit" },
  { id: "cooked_salmon", label: "Cooked Salmon" },
  { id: "cookie", label: "Cookie" },
  { id: "copper_axe", label: "Copper Axe" },
  { id: "copper_bars", label: "Copper Bars" },
  { id: "copper_boots", label: "Copper Boots" },
  { id: "copper_bulb", label: "Copper Bulb" },
  { id: "copper_chain", label: "Copper Chain" },
  { id: "copper_chest", label: "Copper Chest" },
  { id: "copper_chestplate", label: "Copper Chestplate" },
  { id: "copper_door", label: "Copper Door" },
  { id: "copper_golem_statue", label: "Copper Golem Statue" },
  { id: "copper_grate", label: "Copper Grate" },
  { id: "copper_helmet", label: "Copper Helmet" },
  { id: "copper_hoe", label: "Copper Hoe" },
  { id: "copper_horse_armor", label: "Copper Horse Armor" },
  { id: "copper_ingot", label: "Copper Ingot" },
  { id: "copper_lantern", label: "Copper Lantern" },
  { id: "copper_leggings", label: "Copper Leggings" },
  { id: "copper_nautilus_armor", label: "Copper Nautilus Armor" },
  { id: "copper_nugget", label: "Copper Nugget" },
  { id: "copper_ore", label: "Copper Ore" },
  { id: "copper_pickaxe", label: "Copper Pickaxe" },
  { id: "copper_shovel", label: "Copper Shovel" },
  { id: "copper_spear", label: "Copper Spear" },
  { id: "copper_sword", label: "Copper Sword" },
  { id: "copper_torch", label: "Copper Torch" },
  { id: "copper_trapdoor", label: "Copper Trapdoor" },
  { id: "cracked_deepslate_bricks", label: "Cracked Deepslate Bricks" },
  { id: "cracked_deepslate_tiles", label: "Cracked Deepslate Tiles" },
  { id: "cracked_nether_bricks", label: "Cracked Nether Bricks" },
  { id: "cracked_polished_blackstone_bricks", label: "Cracked Polished Blackstone Bricks" },
  { id: "crafter", label: "Crafter" },
  { id: "crafting_table", label: "Crafting Table" },
  { id: "creaking_heart", label: "Creaking Heart" },
  { id: "creeper_banner_pattern", label: "Creeper Charge Banner Pattern" },
  { id: "crimson_button", label: "Crimson Button" },
  { id: "crimson_door", label: "Crimson Door" },
  { id: "crimson_fence", label: "Crimson Fence" },
  { id: "crimson_fence_gate", label: "Crimson Fence Gate" },
  { id: "crimson_fungus", label: "Crimson Fungus" },
  { id: "crimson_hanging_sign", label: "Crimson Hanging Sign" },
  { id: "crimson_hyphae", label: "Crimson Hyphae" },
  { id: "crimson_nylium", label: "Crimson Nylium" },
  { id: "crimson_planks", label: "Crimson Planks" },
  { id: "crimson_pressure_plate", label: "Crimson Pressure Plate" },
  { id: "crimson_shelf", label: "Crimson Shelf" },
  { id: "crimson_sign", label: "Crimson Sign" },
  { id: "crimson_standing_sign", label: "Crimson Sign" },
  { id: "crimson_wall_sign", label: "Crimson Sign" },
  { id: "crimson_double_slab", label: "Crimson Slab" },
  { id: "crimson_slab", label: "Crimson Slab" },
  { id: "crimson_stairs", label: "Crimson Stairs" },
  { id: "crimson_stem", label: "Crimson Stem" },
  { id: "crimson_trapdoor", label: "Crimson Trapdoor" },
  { id: "crossbow", label: "Crossbow" },
  { id: "crying_obsidian", label: "Crying Obsidian" },
  { id: "cut_copper", label: "Cut Copper" },
  { id: "double_cut_copper_slab", label: "Cut Copper Double Slab" },
  { id: "cut_copper_slab", label: "Cut Copper Slab" },
  { id: "cut_copper_stairs", label: "Cut Copper Stairs" },
  { id: "cyan_candle", label: "Cyan Candle" },
  { id: "cyan_harness", label: "Cyan Harness" },
  { id: "danger_pottery_sherd", label: "Danger Pottery Sherd" },
  { id: "dark_oak_button", label: "Dark Oak Button" },
  { id: "dark_oak_door", label: "Dark Oak Door" },
  { id: "dark_oak_fence_gate", label: "Dark Oak Fence Gate" },
  { id: "dark_oak_hanging_sign", label: "Dark Oak Hanging Sign" },
  { id: "dark_oak_pressure_plate", label: "Dark Oak Pressure Plate" },
  { id: "dark_oak_shelf", label: "Dark Oak Shelf" },
  { id: "darkoak_sign", label: "Dark Oak Sign" },
  { id: "darkoak_standing_sign", label: "Dark Oak Sign" },
  { id: "dark_oak_stairs", label: "Dark Oak Stairs" },
  { id: "dark_oak_trapdoor", label: "Dark Oak Trapdoor" },
  { id: "darkoak_wall_sign", label: "Dark Oak Wall Sign" },
  { id: "dark_prismarine_stairs", label: "Dark Prismarine Stairs" },
  { id: "daylight_detector", label: "Daylight Detector" },
  { id: "daylight_detector_inverted", label: "Daylight Detector Inverted" },
  { id: "dead_brain_coral_wall_fan", label: "Dead Brain Coral Wall Fan" },
  { id: "dead_bubble_coral_wall_fan", label: "Dead Bubble Coral Wall Fan" },
  { id: "deadbush", label: "Dead Bush" },
  { id: "dead_fire_coral_wall_fan", label: "Dead Fire Coral Wall Fan" },
  { id: "dead_horn_coral_wall_fan", label: "Dead Horn Coral Wall Fan" },
  { id: "dead_tube_coral_wall_fan", label: "Dead Tube Coral Wall Fan" },
  { id: "decorated_pot", label: "Decorated Pot" },
  { id: "deepslate", label: "Deepslate" },
  { id: "deepslate_brick_double_slab", label: "Deepslate Brick Double Slab" },
  { id: "deepslate_brick_slab", label: "Deepslate Brick Slab" },
  { id: "deepslate_brick_stairs", label: "Deepslate Brick Stairs" },
  { id: "deepslate_brick_wall", label: "Deepslate Brick Wall" },
  { id: "deepslate_bricks", label: "Deepslate Bricks" },
  { id: "deepslate_coal_ore", label: "Deepslate Coal Ore" },
  { id: "deepslate_copper_ore", label: "Deepslate Copper Ore" },
  { id: "deepslate_diamond_ore", label: "Deepslate Diamond Ore" },
  { id: "deepslate_emerald_ore", label: "Deepslate Emerald Ore" },
  { id: "deepslate_gold_ore", label: "Deepslate Gold Ore" },
  { id: "deepslate_iron_ore", label: "Deepslate Iron Ore" },
  { id: "deepslate_lapis_ore", label: "Deepslate Lapis Lazuli Ore" },
  { id: "deepslate_redstone_ore", label: "Deepslate Redstone Ore" },
  { id: "deepslate_tile_double_slab", label: "Deepslate Tile Double Slab" },
  { id: "deepslate_tile_slab", label: "Deepslate Tile Slab" },
  { id: "deepslate_tile_stairs", label: "Deepslate Tile Stairs" },
  { id: "deepslate_tile_wall", label: "Deepslate Tile Wall" },
  { id: "deepslate_tiles", label: "Deepslate Tiles" },
  { id: "deny", label: "Deny" },
  { id: "detector_rail", label: "Detector Rail" },
  { id: "diamond", label: "Diamond" },
  { id: "diamond_axe", label: "Diamond Axe" },
  { id: "diamond_boots", label: "Diamond Boots" },
  { id: "diamond_chestplate", label: "Diamond Chestplate" },
  { id: "diamond_helmet", label: "Diamond Helmet" },
  { id: "diamond_hoe", label: "Diamond Hoe" },
  { id: "horsearmordiamond", label: "Diamond Horse Armor" },
  { id: "diamond_leggings", label: "Diamond Leggings" },
  { id: "diamond_nautilus_armor", label: "Diamond Nautilus Armor" },
  { id: "diamond_ore", label: "Diamond Ore" },
  { id: "diamond_pickaxe", label: "Diamond Pickaxe" },
  { id: "diamond_shovel", label: "Diamond Shovel" },
  { id: "diamond_spear", label: "Diamond Spear" },
  { id: "diamond_sword", label: "Diamond Sword" },
  { id: "diorite_stairs", label: "Diorite Stairs" },
  { id: "dirt", label: "Dirt" },
  { id: "grass_path", label: "Dirt Path" },
  { id: "disc_fragment", label: "Disc Fragment" },
  { id: "dispenser", label: "Dispenser" },
  { id: "dragon_egg", label: "Dragon Egg" },
  { id: "dragon_breath", label: "Dragon's Breath" },
  { id: "dried_ghast", label: "Dried Ghast" },
  { id: "dried_kelp", label: "Dried Kelp" },
  { id: "dried_kelp_block", label: "Dried Kelp Block" },
  { id: "dripstone_block", label: "Dripstone Block" },
  { id: "dropper", label: "Dropper" },
  { id: "dune_armor_trim_smithing_template", label: "Dune Armor Trim" },
  { id: "echo_shard", label: "Echo Shard" },
  { id: "egg", label: "Egg" },
  { id: "elytra", label: "Elytra" },
  { id: "emerald", label: "Emerald" },
  { id: "emerald_ore", label: "Emerald Ore" },
  { id: "enchanted_book", label: "Enchanted Book" },
  { id: "enchanting_table", label: "Enchanting Table" },
  { id: "end_crystal", label: "End Crystal" },
  { id: "end_gateway", label: "End Gateway" },
  { id: "end_portal", label: "End Portal" },
  { id: "end_portal_frame", label: "End Portal Frame" },
  { id: "end_rod", label: "End Rod" },
  { id: "end_stone", label: "End Stone" },
  { id: "end_brick_stairs", label: "End Stone Brick Stairs" },
  { id: "end_bricks", label: "End Stone Bricks" },
  { id: "ender_chest", label: "Ender Chest" },
  { id: "ender_pearl", label: "Ender Pearl" },
  { id: "explorer_pottery_sherd", label: "Explorer Pottery Sherd" },
  { id: "exposed_chiseled_copper", label: "Exposed Chiseled Copper" },
  { id: "exposed_copper", label: "Exposed Copper" },
  { id: "exposed_copper_bars", label: "Exposed Copper Bars" },
  { id: "exposed_copper_bulb", label: "Exposed Copper Bulb" },
  { id: "exposed_copper_chain", label: "Exposed Copper Chain" },
  { id: "exposed_copper_chest", label: "Exposed Copper Chest" },
  { id: "exposed_copper_door", label: "Exposed Copper Door" },
  { id: "exposed_copper_golem_statue", label: "Exposed Copper Golem Statue" },
  { id: "exposed_copper_grate", label: "Exposed Copper Grate" },
  { id: "exposed_copper_lantern", label: "Exposed Copper Lantern" },
  { id: "exposed_copper_trapdoor", label: "Exposed Copper Trapdoor" },
  { id: "exposed_cut_copper", label: "Exposed Cut Copper" },
  { id: "exposed_double_cut_copper_slab", label: "Exposed Cut Copper Double Slab" },
  { id: "exposed_cut_copper_slab", label: "Exposed Cut Copper Slab" },
  { id: "exposed_cut_copper_stairs", label: "Exposed Cut Copper Stairs" },
  { id: "exposed_lightning_rod", label: "Exposed Lightning Rod" },
  { id: "eye_armor_trim_smithing_template", label: "Eye Armor Trim" },
  { id: "ender_eye", label: "Eye of Ender" },
  { id: "farmland", label: "Farmland" },
  { id: "feather", label: "Feather" },
  { id: "fermented_spider_eye", label: "Fermented Spider Eye" },
  { id: "field_masoned_banner_pattern", label: "Field Masoned Banner Pattern" },
  { id: "fire", label: "Fire" },
  { id: "fireball", label: "Fire Charge" },
  { id: "fire_coral_wall_fan", label: "Fire Coral Wall Fan" },
  { id: "firefly_bush", label: "Firefly Bush" },
  { id: "fireworks", label: "Firework Rocket" },
  { id: "fishing_rod", label: "Fishing Rod" },
  { id: "fletching_table", label: "Fletching Table" },
  { id: "flint", label: "Flint" },
  { id: "flint_and_steel", label: "Flint and Steel" },
  { id: "flow_armor_trim_smithing_template", label: "Flow Armor Trim" },
  { id: "flow_banner_pattern", label: "Flow Banner Pattern" },
  { id: "flow_pottery_sherd", label: "Flow Pottery Sherd" },
  { id: "red_flower", label: "Flower" },
  { id: "yellow_flower", label: "Flower" },
  { id: "flower_banner_pattern", label: "Flower Charge Banner Pattern" },
  { id: "flower_pot", label: "Flower Pot" },
  { id: "flowering_azalea", label: "Flowering Azalea" },
  { id: "azalea_leaves_flowered", label: "Flowering Azalea Leaves" },
  { id: "friend_pottery_sherd", label: "Friend Pottery Sherd" },
  { id: "frog_spawn", label: "Frogspawn" },
  { id: "frosted_ice", label: "Frosted Ice" },
  { id: "furnace", label: "Furnace" },
  { id: "ghast_tear", label: "Ghast Tear" },
  { id: "gilded_blackstone", label: "Gilded Blackstone" },
  { id: "glass", label: "Glass" },
  { id: "glass_bottle", label: "Glass Bottle" },
  { id: "glass_pane", label: "Glass Pane" },
  { id: "speckled_melon", label: "Glistering Melon Slice" },
  { id: "globe_banner_pattern", label: "Globe Banner Pattern" },
  { id: "glow_berries", label: "Glow Berries" },
  { id: "glow_ink_sac", label: "Glow Ink Sac" },
  { id: "glow_frame", label: "Glow Item Frame" },
  { id: "glow_lichen", label: "Glow Lichen" },
  { id: "glowingobsidian", label: "Glowing Obsidian" },
  { id: "glowstone", label: "Glowstone" },
  { id: "glowstone_dust", label: "Glowstone Dust" },
  { id: "goat_horn", label: "Goat Horn" },
  { id: "gold_ingot", label: "Gold Ingot" },
  { id: "gold_nugget", label: "Gold Nugget" },
  { id: "gold_ore", label: "Gold Ore" },
  { id: "golden_apple", label: "Golden Apple" },
  { id: "golden_axe", label: "Golden Axe" },
  { id: "golden_boots", label: "Golden Boots" },
  { id: "golden_carrot", label: "Golden Carrot" },
  { id: "golden_chestplate", label: "Golden Chestplate" },
  { id: "golden_dandelion", label: "Golden Dandelion" },
  { id: "golden_helmet", label: "Golden Helmet" },
  { id: "golden_hoe", label: "Golden Hoe" },
  { id: "horsearmorgold", label: "Golden Horse Armor" },
  { id: "golden_leggings", label: "Golden Leggings" },
  { id: "golden_nautilus_armor", label: "Golden Nautilus Armor" },
  { id: "golden_pickaxe", label: "Golden Pickaxe" },
  { id: "golden_shovel", label: "Golden Shovel" },
  { id: "golden_spear", label: "Golden Spear" },
  { id: "golden_sword", label: "Golden Sword" },
  { id: "granite_stairs", label: "Granite Stairs" },
  { id: "grass", label: "Grass Block" },
  { id: "gravel", label: "Gravel" },
  { id: "gray_candle", label: "Gray Candle" },
  { id: "gray_harness", label: "Gray Harness" },
  { id: "green_candle", label: "Green Candle" },
  { id: "green_harness", label: "Green Harness" },
  { id: "grindstone", label: "Grindstone" },
  { id: "gunpowder", label: "Gunpowder" },
  { id: "guster_banner_pattern", label: "Guster Banner Pattern" },
  { id: "guster_pottery_sherd", label: "Guster Pottery Sherd" },
  { id: "hanging_roots", label: "Hanging Roots" },
  { id: "hay_block", label: "Hay Bale" },
  { id: "heart_of_the_sea", label: "Heart of the Sea" },
  { id: "heart_pottery_sherd", label: "Heart Pottery Sherd" },
  { id: "heartbreak_pottery_sherd", label: "Heartbreak Pottery Sherd" },
  { id: "heavy_core", label: "Heavy Core" },
  { id: "heavy_weighted_pressure_plate", label: "Heavy Weighted Pressure Plate" },
  { id: "honey_block", label: "Honey Block" },
  { id: "honey_bottle", label: "Honey Bottle" },
  { id: "honeycomb", label: "Honeycomb" },
  { id: "honeycomb_block", label: "Honeycomb Block" },
  { id: "hopper", label: "Hopper" },
  { id: "horn_coral_wall_fan", label: "Horn Coral Wall Fan" },
  { id: "host_armor_trim_smithing_template", label: "Host Armor Trim" },
  { id: "howl_pottery_sherd", label: "Howl Pottery Sherd" },
  { id: "ice", label: "Ice" },
  { id: "infested_deepslate", label: "Infested Deepslate" },
  { id: "monster_egg", label: "Infested Stone" },
  { id: "iron_axe", label: "Iron Axe" },
  { id: "iron_bars", label: "Iron Bars" },
  { id: "iron_boots", label: "Iron Boots" },
  { id: "iron_chain", label: "Iron Chain" },
  { id: "iron_chestplate", label: "Iron Chestplate" },
  { id: "iron_door", label: "Iron Door" },
  { id: "iron_helmet", label: "Iron Helmet" },
  { id: "iron_hoe", label: "Iron Hoe" },
  { id: "horsearmoriron", label: "Iron Horse Armor" },
  { id: "iron_ingot", label: "Iron Ingot" },
  { id: "iron_leggings", label: "Iron Leggings" },
  { id: "iron_nautilus_armor", label: "Iron Nautilus Armor" },
  { id: "iron_nugget", label: "Iron Nugget" },
  { id: "iron_ore", label: "Iron Ore" },
  { id: "iron_pickaxe", label: "Iron Pickaxe" },
  { id: "iron_shovel", label: "Iron Shovel" },
  { id: "iron_spear", label: "Iron Spear" },
  { id: "iron_sword", label: "Iron Sword" },
  { id: "iron_trapdoor", label: "Iron Trapdoor" },
  { id: "frame", label: "Item Frame" },
  { id: "lit_pumpkin", label: "Jack o'Lantern" },
  { id: "jigsaw", label: "Jigsaw Block" },
  { id: "jukebox", label: "Jukebox" },
  { id: "jungle_button", label: "Jungle Button" },
  { id: "jungle_door", label: "Jungle Door" },
  { id: "jungle_fence_gate", label: "Jungle Fence Gate" },
  { id: "jungle_hanging_sign", label: "Jungle Hanging Sign" },
  { id: "jungle_pressure_plate", label: "Jungle Pressure Plate" },
  { id: "jungle_shelf", label: "Jungle Shelf" },
  { id: "jungle_sign", label: "Jungle Sign" },
  { id: "jungle_standing_sign", label: "Jungle Sign" },
  { id: "jungle_stairs", label: "Jungle Stairs" },
  { id: "jungle_trapdoor", label: "Jungle Trapdoor" },
  { id: "jungle_wall_sign", label: "Jungle Wall Sign" },
  { id: "kelp", label: "Kelp" },
  { id: "ladder", label: "Ladder" },
  { id: "lantern", label: "Lantern" },
  { id: "lapis_ore", label: "Lapis Lazuli Ore" },
  { id: "large_amethyst_bud", label: "Large Amethyst Bud" },
  { id: "flowing_lava", label: "Lava" },
  { id: "lava", label: "Lava" },
  { id: "lead", label: "Lead" },
  { id: "leaf_litter", label: "Leaf Litter" },
  { id: "leather", label: "Leather" },
  { id: "leather_boots", label: "Leather Boots" },
  { id: "leather_helmet", label: "Leather Cap" },
  { id: "horsearmorleather", label: "Leather Horse Armor" },
  { id: "leather_leggings", label: "Leather Pants" },
  { id: "leather_chestplate", label: "Leather Tunic" },
  { id: "leaves", label: "Leaves" },
  { id: "lectern", label: "Lectern" },
  { id: "lever", label: "Lever" },
  { id: "light_block", label: "Light" },
  { id: "light_blue_candle", label: "Light Blue Candle" },
  { id: "light_blue_harness", label: "Light Blue Harness" },
  { id: "light_gray_candle", label: "Light Gray Candle" },
  { id: "light_gray_harness", label: "Light Gray Harness" },
  { id: "light_weighted_pressure_plate", label: "Light Weighted Pressure Plate" },
  { id: "lightning_rod", label: "Lightning Rod" },
  { id: "waterlily", label: "Lily Pad" },
  { id: "lime_candle", label: "Lime Candle" },
  { id: "lime_harness", label: "Lime Harness" },
  { id: "lit_blast_furnace", label: "Lit Blast Furnace" },
  { id: "lit_deepslate_redstone_ore", label: "Lit Deepslate Redstone Ore" },
  { id: "lit_furnace", label: "Lit Furnace" },
  { id: "lit_redstone_lamp", label: "Lit Redstone Lamp" },
  { id: "lit_redstone_ore", label: "Lit Redstone Ore" },
  { id: "lit_smoker", label: "Lit Smoker" },
  { id: "lockedchest", label: "Locked chest" },
  { id: "lodestone", label: "Lodestone" },
  { id: "lodestonecompass", label: "Lodestone Compass" },
  { id: "log", label: "Log" },
  { id: "loom", label: "Loom" },
  { id: "mace", label: "Mace" },
  { id: "magenta_candle", label: "Magenta Candle" },
  { id: "magenta_harness", label: "Magenta Harness" },
  { id: "magma", label: "Magma Block" },
  { id: "magma_cream", label: "Magma Cream" },
  { id: "mangrove_button", label: "Mangrove Button" },
  { id: "mangrove_door", label: "Mangrove Door" },
  { id: "mangrove_double_slab", label: "Mangrove Double Slab" },
  { id: "mangrove_fence", label: "Mangrove Fence" },
  { id: "mangrove_fence_gate", label: "Mangrove Fence Gate" },
  { id: "mangrove_hanging_sign", label: "Mangrove Hanging Sign" },
  { id: "mangrove_leaves", label: "Mangrove Leaves" },
  { id: "mangrove_log", label: "Mangrove Log" },
  { id: "mangrove_planks", label: "Mangrove Planks" },
  { id: "mangrove_pressure_plate", label: "Mangrove Pressure Plate" },
  { id: "mangrove_propagule", label: "Mangrove Propagule" },
  { id: "mangrove_roots", label: "Mangrove Roots" },
  { id: "mangrove_shelf", label: "Mangrove Shelf" },
  { id: "mangrove_sign", label: "Mangrove Sign" },
  { id: "mangrove_standing_sign", label: "Mangrove Sign" },
  { id: "mangrove_slab", label: "Mangrove Slab" },
  { id: "mangrove_stairs", label: "Mangrove Stairs" },
  { id: "mangrove_trapdoor", label: "Mangrove Trapdoor" },
  { id: "mangrove_wall_sign", label: "Mangrove Wall Sign" },
  { id: "mangrove_wood", label: "Mangrove Wood" },
  { id: "map", label: "Map" },
  { id: "medium_amethyst_bud", label: "Medium Amethyst Bud" },
  { id: "melon_block", label: "Melon" },
  { id: "melon_seeds", label: "Melon Seeds" },
  { id: "melon", label: "Melon Slice" },
  { id: "melon_stem", label: "Melon Stem" },
  { id: "milk", label: "Milk Bucket" },
  { id: "minecart", label: "Minecart" },
  { id: "chest_minecart", label: "Minecart with Chest" },
  { id: "command_block_minecart", label: "Minecart with Command Block" },
  { id: "hopper_minecart", label: "Minecart with Hopper" },
  { id: "tnt_minecart", label: "Minecart with TNT" },
  { id: "miner_pottery_sherd", label: "Miner Pottery Sherd" },
  { id: "mob_spawner", label: "Monster Spawner" },
  { id: "moss_block", label: "Moss Block" },
  { id: "moss_carpet", label: "Moss Carpet" },
  { id: "mossy_cobblestone", label: "Mossy Cobblestone" },
  { id: "mossy_cobblestone_stairs", label: "Mossy Cobblestone Stairs" },
  { id: "mossy_stone_brick_stairs", label: "Mossy Stone Brick Stairs" },
  { id: "mourner_pottery_sherd", label: "Mourner Pottery Sherd" },
  { id: "mud", label: "Mud" },
  { id: "mud_brick_double_slab", label: "Mud Brick Double Slab" },
  { id: "mud_brick_slab", label: "Mud Brick Slab" },
  { id: "mud_brick_stairs", label: "Mud Brick Stairs" },
  { id: "mud_brick_wall", label: "Mud Brick Wall" },
  { id: "mud_bricks", label: "Mud Bricks" },
  { id: "muddy_mangrove_roots", label: "Muddy Mangrove Roots" },
  { id: "mushroom", label: "Mushroom" },
  { id: "mushroom_stew", label: "Mushroom Stew" },
  { id: "record", label: "Music Disc" },
  { id: "mycelium", label: "Mycelium" },
  { id: "name_tag", label: "Name Tag" },
  { id: "nautilus_shell", label: "Nautilus Shell" },
  { id: "netherbrick", label: "Nether Brick" },
  { id: "nether_brick_fence", label: "Nether Brick Fence" },
  { id: "nether_brick_stairs", label: "Nether Brick Stairs" },
  { id: "nether_brick", label: "Nether Bricks" },
  { id: "nether_gold_ore", label: "Nether Gold Ore" },
  { id: "quartz", label: "Nether Quartz" },
  { id: "quartz_ore", label: "Nether Quartz Ore" },
  { id: "netherreactor", label: "Nether Reactor Core" },
  { id: "nether_sprouts", label: "Nether Sprouts" },
  { id: "nether_wart", label: "Nether Wart" },
  { id: "nether_wart_block", label: "Nether Wart Block" },
  { id: "netherite_axe", label: "Netherite Axe" },
  { id: "netherite_boots", label: "Netherite Boots" },
  { id: "netherite_chestplate", label: "Netherite Chestplate" },
  { id: "netherite_helmet", label: "Netherite Helmet" },
  { id: "netherite_hoe", label: "Netherite Hoe" },
  { id: "netherite_horse_armor", label: "Netherite Horse Armor" },
  { id: "netherite_ingot", label: "Netherite Ingot" },
  { id: "netherite_leggings", label: "Netherite Leggings" },
  { id: "netherite_nautilus_armor", label: "Netherite Nautilus Armor" },
  { id: "netherite_pickaxe", label: "Netherite Pickaxe" },
  { id: "netherite_scrap", label: "Netherite Scrap" },
  { id: "netherite_shovel", label: "Netherite Shovel" },
  { id: "netherite_spear", label: "Netherite Spear" },
  { id: "netherite_sword", label: "Netherite Sword" },
  { id: "netherite_upgrade_smithing_template", label: "Netherite Upgrade" },
  { id: "netherrack", label: "Netherrack" },
  { id: "noteblock", label: "Note Block" },
  { id: "wooden_button", label: "Oak Button" },
  { id: "wooden_door", label: "Oak Door" },
  { id: "fence", label: "Oak Fence" },
  { id: "fence_gate", label: "Oak Fence Gate" },
  { id: "oak_hanging_sign", label: "Oak Hanging Sign" },
  { id: "wooden_pressure_plate", label: "Oak Pressure Plate" },
  { id: "oak_shelf", label: "Oak Shelf" },
  { id: "sign", label: "Oak Sign" },
  { id: "oak_stairs", label: "Oak Stairs" },
  { id: "trapdoor", label: "Oak Trapdoor" },
  { id: "observer", label: "Observer" },
  { id: "obsidian", label: "Obsidian" },
  { id: "ochre_froglight", label: "Ochre Froglight" },
  { id: "ominous_bottle", label: "Ominous Bottle" },
  { id: "ominous_trial_key", label: "Ominous Trial Key" },
  { id: "open_eyeblossom", label: "Open Eyeblossom" },
  { id: "orange_candle", label: "Orange Candle" },
  { id: "orange_harness", label: "Orange Harness" },
  { id: "oxidized_chiseled_copper", label: "Oxidized Chiseled Copper" },
  { id: "oxidized_copper", label: "Oxidized Copper" },
  { id: "oxidized_copper_bars", label: "Oxidized Copper Bars" },
  { id: "oxidized_copper_bulb", label: "Oxidized Copper Bulb" },
  { id: "oxidized_copper_chain", label: "Oxidized Copper Chain" },
  { id: "oxidized_copper_chest", label: "Oxidized Copper Chest" },
  { id: "oxidized_copper_door", label: "Oxidized Copper Door" },
  { id: "oxidized_copper_golem_statue", label: "Oxidized Copper Golem Statue" },
  { id: "oxidized_copper_grate", label: "Oxidized Copper Grate" },
  { id: "oxidized_copper_lantern", label: "Oxidized Copper Lantern" },
  { id: "oxidized_copper_trapdoor", label: "Oxidized Copper Trapdoor" },
  { id: "oxidized_cut_copper", label: "Oxidized Cut Copper" },
  { id: "oxidized_double_cut_copper_slab", label: "Oxidized Cut Copper Double Slab" },
  { id: "oxidized_cut_copper_slab", label: "Oxidized Cut Copper Slab" },
  { id: "oxidized_cut_copper_stairs", label: "Oxidized Cut Copper Stairs" },
  { id: "oxidized_lightning_rod", label: "Oxidized Lightning Rod" },
  { id: "packed_ice", label: "Packed Ice" },
  { id: "packed_mud", label: "Packed Mud" },
  { id: "painting", label: "Painting" },
  { id: "pale_hanging_moss", label: "Pale Hanging Moss" },
  { id: "pale_moss_block", label: "Pale Moss Block" },
  { id: "pale_moss_carpet", label: "Pale Moss Carpet" },
  { id: "pale_oak_button", label: "Pale Oak Button" },
  { id: "pale_oak_door", label: "Pale Oak Door" },
  { id: "pale_oak_double_slab", label: "Pale Oak Double Slab" },
  { id: "pale_oak_fence", label: "Pale Oak Fence" },
  { id: "pale_oak_fence_gate", label: "Pale Oak Fence Gate" },
  { id: "pale_oak_hanging_sign", label: "Pale Oak Hanging Sign" },
  { id: "pale_oak_leaves", label: "Pale Oak Leaves" },
  { id: "pale_oak_log", label: "Pale Oak Log" },
  { id: "pale_oak_planks", label: "Pale Oak Planks" },
  { id: "pale_oak_pressure_plate", label: "Pale Oak Pressure Plate" },
  { id: "pale_oak_sapling", label: "Pale Oak Sapling" },
  { id: "pale_oak_shelf", label: "Pale Oak Shelf" },
  { id: "pale_oak_sign", label: "Pale Oak Sign" },
  { id: "pale_oak_standing_sign", label: "Pale Oak Sign" },
  { id: "pale_oak_slab", label: "Pale Oak Slab" },
  { id: "pale_oak_stairs", label: "Pale Oak Stairs" },
  { id: "pale_oak_trapdoor", label: "Pale Oak Trapdoor" },
  { id: "pale_oak_wall_sign", label: "Pale Oak Wall Sign" },
  { id: "pale_oak_wood", label: "Pale Oak Wood" },
  { id: "paper", label: "Paper" },
  { id: "pearlescent_froglight", label: "Pearlescent Froglight" },
  { id: "phantom_membrane", label: "Phantom Membrane" },
  { id: "photo", label: "Photo" },
  { id: "pink_candle", label: "Pink Candle" },
  { id: "pink_harness", label: "Pink Harness" },
  { id: "pink_petals", label: "Pink Petals" },
  { id: "piston", label: "Piston" },
  { id: "piston_arm_collision", label: "Piston Arm Collision" },
  { id: "pitcher_crop", label: "Pitcher Crop" },
  { id: "pitcher_plant", label: "Pitcher Plant" },
  { id: "pitcher_pod", label: "Pitcher Pod" },
  { id: "double_plant", label: "Plant" },
  { id: "plenty_pottery_sherd", label: "Plenty Pottery Sherd" },
  { id: "podzol", label: "Podzol" },
  { id: "pointed_dripstone", label: "Pointed Dripstone" },
  { id: "poisonous_potato", label: "Poisonous Potato" },
  { id: "polished_andesite_stairs", label: "Polished Andesite Stairs" },
  { id: "polished_basalt", label: "Polished Basalt" },
  { id: "polished_blackstone", label: "Polished Blackstone" },
  { id: "polished_blackstone_brick_double_slab", label: "Polished Blackstone Brick Double Slab" },
  { id: "polished_blackstone_brick_slab", label: "Polished Blackstone Brick Slab" },
  { id: "polished_blackstone_brick_stairs", label: "Polished Blackstone Brick Stairs" },
  { id: "polished_blackstone_brick_wall", label: "Polished Blackstone Brick Wall" },
  { id: "polished_blackstone_bricks", label: "Polished Blackstone Bricks" },
  { id: "polished_blackstone_button", label: "Polished Blackstone Button" },
  { id: "polished_blackstone_double_slab", label: "Polished Blackstone Double Slab" },
  { id: "polished_blackstone_pressure_plate", label: "Polished Blackstone Pressure Plate" },
  { id: "polished_blackstone_slab", label: "Polished Blackstone Slab" },
  { id: "polished_blackstone_stairs", label: "Polished Blackstone Stairs" },
  { id: "polished_blackstone_wall", label: "Polished Blackstone Wall" },
  { id: "polished_cinnabar", label: "Polished Cinnabar" },
  { id: "polished_cinnabar_double_slab", label: "Polished Cinnabar Double Slab" },
  { id: "polished_cinnabar_slab", label: "Polished Cinnabar Slab" },
  { id: "polished_cinnabar_stairs", label: "Polished Cinnabar Stairs" },
  { id: "polished_cinnabar_wall", label: "Polished Cinnabar Wall" },
  { id: "polished_deepslate", label: "Polished Deepslate" },
  { id: "polished_deepslate_double_slab", label: "Polished Deepslate Double Slab" },
  { id: "polished_deepslate_slab", label: "Polished Deepslate Slab" },
  { id: "polished_deepslate_stairs", label: "Polished Deepslate Stairs" },
  { id: "polished_deepslate_wall", label: "Polished Deepslate Wall" },
  { id: "polished_diorite_stairs", label: "Polished Diorite Stairs" },
  { id: "polished_granite_stairs", label: "Polished Granite Stairs" },
  { id: "polished_sulfur", label: "Polished Sulfur" },
  { id: "polished_sulfur_double_slab", label: "Polished Sulfur Double Slab" },
  { id: "polished_sulfur_slab", label: "Polished Sulfur Slab" },
  { id: "polished_sulfur_stairs", label: "Polished Sulfur Stairs" },
  { id: "polished_sulfur_wall", label: "Polished Sulfur Wall" },
  { id: "polished_tuff", label: "Polished Tuff" },
  { id: "polished_tuff_double_slab", label: "Polished Tuff Double Slab" },
  { id: "polished_tuff_slab", label: "Polished Tuff Slab" },
  { id: "polished_tuff_stairs", label: "Polished Tuff Stairs" },
  { id: "polished_tuff_wall", label: "Polished Tuff Wall" },
  { id: "chorus_fruit_popped", label: "Popped Chorus Fruit" },
  { id: "portal", label: "Portal" },
  { id: "portfolio", label: "Portfolio" },
  { id: "potato", label: "Potato" },
  { id: "potatoes", label: "Potatoes" },
  { id: "potent_sulfur", label: "Potent Sulfur" },
  { id: "powder_snow", label: "Powder Snow" },
  { id: "powered_comparator", label: "Powered Comparator" },
  { id: "golden_rail", label: "Powered Rail" },
  { id: "powered_repeater", label: "Powered Repeater" },
  { id: "prismarine_bricks_stairs", label: "Prismarine Brick Stairs" },
  { id: "prismarine_crystals", label: "Prismarine Crystals" },
  { id: "prismarine_shard", label: "Prismarine Shard" },
  { id: "prismarine_stairs", label: "Prismarine Stairs" },
  { id: "prize_pottery_sherd", label: "Prize Pottery Sherd" },
  { id: "pufferfish", label: "Pufferfish" },
  { id: "pumpkin", label: "Pumpkin" },
  { id: "pumpkin_pie", label: "Pumpkin Pie" },
  { id: "pumpkin_seeds", label: "Pumpkin Seeds" },
  { id: "pumpkin_stem", label: "Pumpkin Stem" },
  { id: "purple_candle", label: "Purple Candle" },
  { id: "purple_harness", label: "Purple Harness" },
  { id: "purpur_stairs", label: "Purpur Stairs" },
  { id: "quartz_bricks", label: "Quartz Bricks" },
  { id: "quartz_stairs", label: "Quartz Stairs" },
  { id: "rabbit_hide", label: "Rabbit Hide" },
  { id: "rabbit_stew", label: "Rabbit Stew" },
  { id: "rabbit_foot", label: "Rabbit's Foot" },
  { id: "rail", label: "Rail" },
  { id: "raiser_armor_trim_smithing_template", label: "Raiser Armor Trim" },
  { id: "beef", label: "Raw Beef" },
  { id: "chicken", label: "Raw Chicken" },
  { id: "fish", label: "Raw Cod" },
  { id: "raw_copper", label: "Raw Copper" },
  { id: "raw_gold", label: "Raw Gold" },
  { id: "raw_iron", label: "Raw Iron" },
  { id: "porkchop", label: "Raw Porkchop" },
  { id: "rabbit", label: "Raw Rabbit" },
  { id: "salmon", label: "Raw Salmon" },
  { id: "recovery_compass", label: "Recovery Compass" },
  { id: "red_candle", label: "Red Candle" },
  { id: "red_harness", label: "Red Harness" },
  { id: "red_mushroom", label: "Red Mushroom" },
  { id: "red_mushroom_block", label: "Red Mushroom Block" },
  { id: "red_nether_brick_stairs", label: "Red Nether Brick Stairs" },
  { id: "red_nether_brick", label: "Red Nether Bricks" },
  { id: "red_sandstone", label: "Red Sandstone" },
  { id: "red_sandstone_stairs", label: "Red Sandstone Stairs" },
  { id: "comparator", label: "Redstone Comparator" },
  { id: "redstone", label: "Redstone Dust" },
  { id: "redstone_wire", label: "Redstone Dust" },
  { id: "redstone_lamp", label: "Redstone Lamp" },
  { id: "redstone_ore", label: "Redstone Ore" },
  { id: "repeater", label: "Redstone Repeater" },
  { id: "redstone_torch", label: "Redstone Torch" },
  { id: "unlit_redstone_torch", label: "Redstone Torch" },
  { id: "reinforced_deepslate", label: "Reinforced Deepslate" },
  { id: "repeating_command_block", label: "Repeating Command Block" },
  { id: "resin_brick", label: "Resin Brick" },
  { id: "resin_brick_double_slab", label: "Resin Brick Double Slab" },
  { id: "resin_brick_slab", label: "Resin Brick Slab" },
  { id: "resin_brick_stairs", label: "Resin Brick Stairs" },
  { id: "resin_brick_wall", label: "Resin Brick Wall" },
  { id: "resin_bricks", label: "Resin Bricks" },
  { id: "resin_clump", label: "Resin Clump" },
  { id: "respawn_anchor", label: "Respawn Anchor" },
  { id: "rib_armor_trim_smithing_template", label: "Rib Armor Trim" },
  { id: "dirt_with_roots", label: "Rooted Dirt" },
  { id: "rotten_flesh", label: "Rotten Flesh" },
  { id: "ruby", label: "Ruby" },
  { id: "saddle", label: "Saddle" },
  { id: "sand", label: "Sand" },
  { id: "sandstone", label: "Sandstone" },
  { id: "sandstone_stairs", label: "Sandstone Stairs" },
  { id: "scaffolding", label: "Scaffolding" },
  { id: "scrape_pottery_sherd", label: "Scrape Pottery Sherd" },
  { id: "sculk", label: "Sculk" },
  { id: "sculk_catalyst", label: "Sculk Catalyst" },
  { id: "sculk_sensor", label: "Sculk Sensor" },
  { id: "sculk_shrieker", label: "Sculk Shrieker" },
  { id: "sculk_vein", label: "Sculk Vein" },
  { id: "sea_pickle", label: "Sea Pickle" },
  { id: "sentry_armor_trim_smithing_template", label: "Sentry Armor Trim" },
  { id: "shaper_armor_trim_smithing_template", label: "Shaper Armor Trim" },
  { id: "sheaf_pottery_sherd", label: "Sheaf Pottery Sherd" },
  { id: "shears", label: "Shears" },
  { id: "shelter_pottery_sherd", label: "Shelter Pottery Sherd" },
  { id: "shield", label: "Shield" },
  { id: "short_dry_grass", label: "Short Dry Grass" },
  { id: "tallgrass", label: "Short Grass" },
  { id: "shroomlight", label: "Shroomlight" },
  { id: "shulker_shell", label: "Shulker Shell" },
  { id: "standing_sign", label: "Sign" },
  { id: "silence_armor_trim_smithing_template", label: "Silence Armor Trim" },
  { id: "skull_banner_pattern", label: "Skull Charge Banner Pattern" },
  { id: "skull_pottery_sherd", label: "Skull Pottery Sherd" },
  { id: "slime", label: "Slime Block" },
  { id: "slime_ball", label: "Slimeball" },
  { id: "small_amethyst_bud", label: "Small Amethyst Bud" },
  { id: "small_dripleaf_block", label: "Small Dripleaf" },
  { id: "smithing_table", label: "Smithing Table" },
  { id: "smithing_template", label: "Smithing Template" },
  { id: "smoker", label: "Smoker" },
  { id: "smooth_basalt", label: "Smooth Basalt" },
  { id: "smooth_quartz_stairs", label: "Smooth Quartz Stairs" },
  { id: "smooth_red_sandstone_stairs", label: "Smooth Red Sandstone Stairs" },
  { id: "smooth_sandstone_stairs", label: "Smooth Sandstone Stairs" },
  { id: "smooth_stone", label: "Smooth Stone" },
  { id: "sniffer_egg", label: "Sniffer Egg" },
  { id: "snort_pottery_sherd", label: "Snort Pottery Sherd" },
  { id: "snout_armor_trim_smithing_template", label: "Snout Armor Trim" },
  { id: "piglin_banner_pattern", label: "Snout Banner Pattern" },
  { id: "snow_layer", label: "Snow" },
  { id: "snow", label: "Snow Block" },
  { id: "snowball", label: "Snowball" },
  { id: "soul_campfire", label: "Soul Campfire" },
  { id: "soul_fire", label: "Soul Fire" },
  { id: "soul_lantern", label: "Soul Lantern" },
  { id: "soul_sand", label: "Soul Sand" },
  { id: "soul_soil", label: "Soul Soil" },
  { id: "soul_torch", label: "Soul Torch" },
  { id: "spider_eye", label: "Spider Eye" },
  { id: "spire_armor_trim_smithing_template", label: "Spire Armor Trim" },
  { id: "spore_blossom", label: "Spore Blossom" },
  { id: "spruce_button", label: "Spruce Button" },
  { id: "spruce_door", label: "Spruce Door" },
  { id: "spruce_fence_gate", label: "Spruce Fence Gate" },
  { id: "spruce_hanging_sign", label: "Spruce Hanging Sign" },
  { id: "spruce_pressure_plate", label: "Spruce Pressure Plate" },
  { id: "spruce_shelf", label: "Spruce Shelf" },
  { id: "spruce_sign", label: "Spruce Sign" },
  { id: "spruce_standing_sign", label: "Spruce Sign" },
  { id: "spruce_stairs", label: "Spruce Stairs" },
  { id: "spruce_trapdoor", label: "Spruce Trapdoor" },
  { id: "spruce_wall_sign", label: "Spruce Wall Sign" },
  { id: "spyglass", label: "Spyglass" },
  { id: "cooked_beef", label: "Steak" },
  { id: "steak", label: "Steak" },
  { id: "stick", label: "Stick" },
  { id: "sticky_piston", label: "Sticky Piston" },
  { id: "sticky_piston_arm_collision", label: "Sticky Piston Arm Collision" },
  { id: "stone_axe", label: "Stone Axe" },
  { id: "stone_brick_stairs", label: "Stone Brick Stairs" },
  { id: "stonebrick", label: "Stone Bricks" },
  { id: "stone_button", label: "Stone Button" },
  { id: "stone_hoe", label: "Stone Hoe" },
  { id: "stone_pickaxe", label: "Stone Pickaxe" },
  { id: "stone_pressure_plate", label: "Stone Pressure Plate" },
  { id: "stone_shovel", label: "Stone Shovel" },
  { id: "double_stone_slab", label: "Stone Slab" },
  { id: "stone_slab", label: "Stone Slab" },
  { id: "stone_spear", label: "Stone Spear" },
  { id: "normal_stone_stairs", label: "Stone Stairs" },
  { id: "stone_sword", label: "Stone Sword" },
  { id: "stonecutter", label: "Stonecutter" },
  { id: "stonecutter_block", label: "Stonecutter" },
  { id: "string", label: "String" },
  { id: "stripped_acacia_log", label: "Stripped Acacia Log" },
  { id: "stripped_birch_log", label: "Stripped Birch Log" },
  { id: "stripped_cherry_log", label: "Stripped Cherry Log" },
  { id: "stripped_cherry_wood", label: "Stripped Cherry Wood" },
  { id: "stripped_crimson_hyphae", label: "Stripped Crimson Hyphae" },
  { id: "stripped_crimson_stem", label: "Stripped Crimson Stem" },
  { id: "stripped_dark_oak_log", label: "Stripped Dark Oak Log" },
  { id: "stripped_jungle_log", label: "Stripped Jungle Log" },
  { id: "stripped_mangrove_log", label: "Stripped Mangrove Log" },
  { id: "stripped_mangrove_wood", label: "Stripped Mangrove Wood" },
  { id: "stripped_oak_log", label: "Stripped Oak Log" },
  { id: "stripped_pale_oak_log", label: "Stripped Pale Oak Log" },
  { id: "stripped_pale_oak_wood", label: "Stripped Pale Oak Wood" },
  { id: "stripped_spruce_log", label: "Stripped Spruce Log" },
  { id: "stripped_warped_hyphae", label: "Stripped Warped Hyphae" },
  { id: "stripped_warped_stem", label: "Stripped Warped Stem" },
  { id: "structure_block", label: "Structure Block" },
  { id: "structure_void", label: "Structure Void" },
  { id: "sugar", label: "Sugar" },
  { id: "reeds", label: "Sugar Cane" },
  { id: "sulfur", label: "Sulfur" },
  { id: "sulfur_brick_double_slab", label: "Sulfur Brick Double Slab" },
  { id: "sulfur_brick_slab", label: "Sulfur Brick Slab" },
  { id: "sulfur_brick_stairs", label: "Sulfur Brick Stairs" },
  { id: "sulfur_brick_wall", label: "Sulfur Brick Wall" },
  { id: "sulfur_bricks", label: "Sulfur Bricks" },
  { id: "sulfur_double_slab", label: "Sulfur Double Slab" },
  { id: "sulfur_slab", label: "Sulfur Slab" },
  { id: "sulfur_spike", label: "Sulfur Spike" },
  { id: "sulfur_stairs", label: "Sulfur Stairs" },
  { id: "sulfur_wall", label: "Sulfur Wall" },
  { id: "suspicious_gravel", label: "Suspicious Gravel" },
  { id: "suspicious_sand", label: "Suspicious Sand" },
  { id: "suspicious_stew", label: "Suspicious Stew" },
  { id: "sweet_berries", label: "Sweet Berries" },
  { id: "sweet_berry_bush", label: "Sweet Berry Bush" },
  { id: "tall_dry_grass", label: "Tall Dry Grass" },
  { id: "target", label: "Target" },
  { id: "hardened_clay", label: "Terracotta" },
  { id: "stained_hardened_clay", label: "Terracotta" },
  { id: "mojang_banner_pattern", label: "Thing Banner Pattern" },
  { id: "tide_armor_trim_smithing_template", label: "Tide Armor Trim" },
  { id: "tinted_glass", label: "Tinted Glass" },
  { id: "tipped_arrow", label: "Tipped Arrow" },
  { id: "tnt", label: "TNT" },
  { id: "torch", label: "Torch" },
  { id: "torchflower", label: "Torchflower" },
  { id: "torchflower_crop", label: "Torchflower Crop" },
  { id: "torchflower_seeds", label: "Torchflower Seeds" },
  { id: "totem", label: "Totem of Undying" },
  { id: "trapped_chest", label: "Trapped Chest" },
  { id: "trial_key", label: "Trial Key" },
  { id: "trial_spawner", label: "Trial Spawner" },
  { id: "trident", label: "Trident" },
  { id: "tripwire_hook", label: "Tripwire Hook" },
  { id: "clownfish", label: "Tropical Fish" },
  { id: "tube_coral_wall_fan", label: "Tube Coral Wall Fan" },
  { id: "tuff", label: "Tuff" },
  { id: "tuff_brick_double_slab", label: "Tuff Brick Double Slab" },
  { id: "tuff_brick_slab", label: "Tuff Brick Slab" },
  { id: "tuff_brick_stairs", label: "Tuff Brick Stairs" },
  { id: "tuff_brick_wall", label: "Tuff Brick Wall" },
  { id: "tuff_bricks", label: "Tuff Bricks" },
  { id: "tuff_double_slab", label: "Tuff Double Slab" },
  { id: "tuff_slab", label: "Tuff Slab" },
  { id: "tuff_stairs", label: "Tuff Stairs" },
  { id: "tuff_wall", label: "Tuff Wall" },
  { id: "turtle_egg", label: "Turtle Egg" },
  { id: "turtle_shell_piece", label: "Turtle Scute" },
  { id: "turtle_helmet", label: "Turtle Shell" },
  { id: "twisting_vines", label: "Twisting Vines" },
  { id: "unpowered_comparator", label: "Unpowered Comparator" },
  { id: "unpowered_repeater", label: "Unpowered Repeater" },
  { id: "vault", label: "Vault" },
  { id: "verdant_froglight", label: "Verdant Froglight" },
  { id: "vex_armor_trim_smithing_template", label: "Vex Armor Trim" },
  { id: "vine", label: "Vines" },
  { id: "wall_banner", label: "Wall Banner" },
  { id: "wall_sign", label: "Wall Sign" },
  { id: "ward_armor_trim_smithing_template", label: "Ward Armor Trim" },
  { id: "warped_button", label: "Warped Button" },
  { id: "warped_door", label: "Warped Door" },
  { id: "warped_fence", label: "Warped Fence" },
  { id: "warped_fence_gate", label: "Warped Fence Gate" },
  { id: "warped_fungus", label: "Warped Fungus" },
  { id: "warped_fungus_on_a_stick", label: "Warped Fungus on a Stick" },
  { id: "warped_hanging_sign", label: "Warped Hanging Sign" },
  { id: "warped_hyphae", label: "Warped Hyphae" },
  { id: "warped_nylium", label: "Warped Nylium" },
  { id: "warped_planks", label: "Warped Planks" },
  { id: "warped_pressure_plate", label: "Warped Pressure Plate" },
  { id: "warped_shelf", label: "Warped Shelf" },
  { id: "warped_sign", label: "Warped Sign" },
  { id: "warped_standing_sign", label: "Warped Sign" },
  { id: "warped_wall_sign", label: "Warped Sign" },
  { id: "warped_double_slab", label: "Warped Slab" },
  { id: "warped_slab", label: "Warped Slab" },
  { id: "warped_stairs", label: "Warped Stairs" },
  { id: "warped_stem", label: "Warped Stem" },
  { id: "warped_trapdoor", label: "Warped Trapdoor" },
  { id: "warped_wart_block", label: "Warped Wart Block" },
  { id: "flowing_water", label: "Water" },
  { id: "water", label: "Water" },
  { id: "waxed_copper", label: "Waxed Block of Copper" },
  { id: "waxed_chiseled_copper", label: "Waxed Chiseled Copper" },
  { id: "waxed_copper_bars", label: "Waxed Copper Bars" },
  { id: "waxed_copper_bulb", label: "Waxed Copper Bulb" },
  { id: "waxed_copper_chain", label: "Waxed Copper Chain" },
  { id: "waxed_copper_chest", label: "Waxed Copper Chest" },
  { id: "waxed_copper_door", label: "Waxed Copper Door" },
  { id: "waxed_copper_golem_statue", label: "Waxed Copper Golem Statue" },
  { id: "waxed_copper_grate", label: "Waxed Copper Grate" },
  { id: "waxed_copper_lantern", label: "Waxed Copper Lantern" },
  { id: "waxed_copper_trapdoor", label: "Waxed Copper Trapdoor" },
  { id: "waxed_cut_copper", label: "Waxed Cut Copper" },
  { id: "waxed_double_cut_copper_slab", label: "Waxed Cut Copper Double Slab" },
  { id: "waxed_cut_copper_slab", label: "Waxed Cut Copper Slab" },
  { id: "waxed_cut_copper_stairs", label: "Waxed Cut Copper Stairs" },
  { id: "waxed_exposed_chiseled_copper", label: "Waxed Exposed Chiseled Copper" },
  { id: "waxed_exposed_copper", label: "Waxed Exposed Copper" },
  { id: "waxed_exposed_copper_bars", label: "Waxed Exposed Copper Bars" },
  { id: "waxed_exposed_copper_bulb", label: "Waxed Exposed Copper Bulb" },
  { id: "waxed_exposed_copper_chain", label: "Waxed Exposed Copper Chain" },
  { id: "waxed_exposed_copper_chest", label: "Waxed Exposed Copper Chest" },
  { id: "waxed_exposed_copper_door", label: "Waxed Exposed Copper Door" },
  { id: "waxed_exposed_copper_golem_statue", label: "Waxed Exposed Copper Golem Statue" },
  { id: "waxed_exposed_copper_grate", label: "Waxed Exposed Copper Grate" },
  { id: "waxed_exposed_copper_lantern", label: "Waxed Exposed Copper Lantern" },
  { id: "waxed_exposed_copper_trapdoor", label: "Waxed Exposed Copper Trapdoor" },
  { id: "waxed_exposed_cut_copper", label: "Waxed Exposed Cut Copper" },
  { id: "waxed_exposed_double_cut_copper_slab", label: "Waxed Exposed Cut Copper Double Slab" },
  { id: "waxed_exposed_cut_copper_slab", label: "Waxed Exposed Cut Copper Slab" },
  { id: "waxed_exposed_cut_copper_stairs", label: "Waxed Exposed Cut Copper Stairs" },
  { id: "waxed_exposed_lightning_rod", label: "Waxed Exposed Lightning Rod" },
  { id: "waxed_lightning_rod", label: "Waxed Lightning Rod" },
  { id: "waxed_oxidized_chiseled_copper", label: "Waxed Oxidized Chiseled Copper" },
  { id: "waxed_oxidized_copper", label: "Waxed Oxidized Copper" },
  { id: "waxed_oxidized_copper_bars", label: "Waxed Oxidized Copper Bars" },
  { id: "waxed_oxidized_copper_bulb", label: "Waxed Oxidized Copper Bulb" },
  { id: "waxed_oxidized_copper_chain", label: "Waxed Oxidized Copper Chain" },
  { id: "waxed_oxidized_copper_chest", label: "Waxed Oxidized Copper Chest" },
  { id: "waxed_oxidized_copper_door", label: "Waxed Oxidized Copper Door" },
  { id: "waxed_oxidized_copper_golem_statue", label: "Waxed Oxidized Copper Golem Statue" },
  { id: "waxed_oxidized_copper_grate", label: "Waxed Oxidized Copper Grate" },
  { id: "waxed_oxidized_copper_lantern", label: "Waxed Oxidized Copper Lantern" },
  { id: "waxed_oxidized_copper_trapdoor", label: "Waxed Oxidized Copper Trapdoor" },
  { id: "waxed_oxidized_cut_copper", label: "Waxed Oxidized Cut Copper" },
  { id: "waxed_oxidized_double_cut_copper_slab", label: "Waxed Oxidized Cut Copper Double Slab" },
  { id: "waxed_oxidized_cut_copper_slab", label: "Waxed Oxidized Cut Copper Slab" },
  { id: "waxed_oxidized_cut_copper_stairs", label: "Waxed Oxidized Cut Copper Stairs" },
  { id: "waxed_oxidized_lightning_rod", label: "Waxed Oxidized Lightning Rod" },
  { id: "waxed_weathered_chiseled_copper", label: "Waxed Weathered Chiseled Copper" },
  { id: "waxed_weathered_copper", label: "Waxed Weathered Copper" },
  { id: "waxed_weathered_copper_bars", label: "Waxed Weathered Copper Bars" },
  { id: "waxed_weathered_copper_bulb", label: "Waxed Weathered Copper Bulb" },
  { id: "waxed_weathered_copper_chain", label: "Waxed Weathered Copper Chain" },
  { id: "waxed_weathered_copper_chest", label: "Waxed Weathered Copper Chest" },
  { id: "waxed_weathered_copper_door", label: "Waxed Weathered Copper Door" },
  { id: "waxed_weathered_copper_golem_statue", label: "Waxed Weathered Copper Golem Statue" },
  { id: "waxed_weathered_copper_grate", label: "Waxed Weathered Copper Grate" },
  { id: "waxed_weathered_copper_lantern", label: "Waxed Weathered Copper Lantern" },
  { id: "waxed_weathered_copper_trapdoor", label: "Waxed Weathered Copper Trapdoor" },
  { id: "waxed_weathered_cut_copper", label: "Waxed Weathered Cut Copper" },
  { id: "waxed_weathered_double_cut_copper_slab", label: "Waxed Weathered Cut Copper Double Slab" },
  { id: "waxed_weathered_cut_copper_slab", label: "Waxed Weathered Cut Copper Slab" },
  { id: "waxed_weathered_cut_copper_stairs", label: "Waxed Weathered Cut Copper Stairs" },
  { id: "waxed_weathered_lightning_rod", label: "Waxed Weathered Lightning Rod" },
  { id: "wayfinder_armor_trim_smithing_template", label: "Wayfinder Armor Trim" },
  { id: "weathered_chiseled_copper", label: "Weathered Chiseled Copper" },
  { id: "weathered_copper", label: "Weathered Copper" },
  { id: "weathered_copper_bars", label: "Weathered Copper Bars" },
  { id: "weathered_copper_bulb", label: "Weathered Copper Bulb" },
  { id: "weathered_copper_chain", label: "Weathered Copper Chain" },
  { id: "weathered_copper_chest", label: "Weathered Copper Chest" },
  { id: "weathered_copper_door", label: "Weathered Copper Door" },
  { id: "weathered_copper_golem_statue", label: "Weathered Copper Golem Statue" },
  { id: "weathered_copper_grate", label: "Weathered Copper Grate" },
  { id: "weathered_copper_lantern", label: "Weathered Copper Lantern" },
  { id: "weathered_copper_trapdoor", label: "Weathered Copper Trapdoor" },
  { id: "weathered_cut_copper", label: "Weathered Cut Copper" },
  { id: "weathered_double_cut_copper_slab", label: "Weathered Cut Copper Double Slab" },
  { id: "weathered_cut_copper_slab", label: "Weathered Cut Copper Slab" },
  { id: "weathered_cut_copper_stairs", label: "Weathered Cut Copper Stairs" },
  { id: "weathered_lightning_rod", label: "Weathered Lightning Rod" },
  { id: "weeping_vines", label: "Weeping Vines" },
  { id: "wheat", label: "Wheat" },
  { id: "wheat_seeds", label: "Wheat Seeds" },
  { id: "white_candle", label: "White Candle" },
  { id: "white_harness", label: "White Harness" },
  { id: "wild_armor_trim_smithing_template", label: "Wild Armor Trim" },
  { id: "wildflowers", label: "Wildflowers" },
  { id: "wind_charge", label: "Wind Charge" },
  { id: "wither_rose", label: "Wither Rose" },
  { id: "wolf_armor", label: "Wolf Armor" },
  { id: "wooden_slab", label: "Wood Slab" },
  { id: "wooden_axe", label: "Wooden Axe" },
  { id: "wooden_hoe", label: "Wooden Hoe" },
  { id: "wooden_pickaxe", label: "Wooden Pickaxe" },
  { id: "planks", label: "Wooden Planks" },
  { id: "wooden_shovel", label: "Wooden Shovel" },
  { id: "wooden_spear", label: "Wooden Spear" },
  { id: "wooden_sword", label: "Wooden Sword" },
  { id: "wool", label: "Wool" },
  { id: "written_book", label: "Written Book" },
  { id: "yellow_candle", label: "Yellow Candle" },
  { id: "yellow_harness", label: "Yellow Harness" },
];

export const RconSection = () => {
  const [targetPlayer, setTargetPlayer] = useState('');
  const [item, setItem] = useState('diamond');
  const [amount, setAmount] = useState('64');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [x, setX] = useState('0');
  const [y, setY] = useState('64');
  const [z, setZ] = useState('0');
  const [whitelistOpen, setWhitelistOpen] = useState(false);
  const [whitelist, setWhitelist] = useState<Array<{ name: string; xuid: string }>>([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  const selectStyles = {
    select: {
      backgroundColor: 'rgba(184, 115, 51, 0.15)',
      border: '1px solid #b87333',
      color: '#d4a373',
      padding: '0.5rem',
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.95rem',
      borderRadius: '0.25rem',
      cursor: 'pointer'
    } as React.CSSProperties,
    option: {
      backgroundColor: '#0f0f0f',
      color: '#d4a373'
    } as React.CSSProperties
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const fetchWhitelist = async () => {
    try {
      const res = await fetch(`${API}/api/client/rcon/whitelist`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWhitelist(data.whitelist || []);
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    }
  };

  const giveItem = async () => {
    if (!targetPlayer.trim()) {
      setMessage('Enter a player name');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/client/rcon/give-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ player: targetPlayer, item, amount: parseInt(amount) || 1 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Gave ${amount} ${item} to ${targetPlayer}`);
        setMessageType('success');
      } else {
        setMessage(`✗ Error: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
      setMessageType('error');
    }
    setLoading(false);
  };

  const teleport = async () => {
    if (!targetPlayer.trim()) {
      setMessage('Enter a player name');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/client/rcon/teleport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ player: targetPlayer, x: parseInt(x) || 0, y: parseInt(y) || 64, z: parseInt(z) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Teleported ${targetPlayer} to (${x}, ${y}, ${z})`);
        setMessageType('success');
      } else {
        setMessage(`✗ Error: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
      setMessageType('error');
    }
    setLoading(false);
  };

  const restart = async () => {
    if (!window.confirm('Restart server? Players will be disconnected.')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/api/client/rcon/restart`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Server restarting in 10 seconds...');
        setMessageType('success');
      } else {
        setMessage(`✗ Error: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
      setMessageType('error');
    }
    setLoading(false);
  };

  const addToWhitelist = async () => {
    if (!newPlayer.trim()) {
      setMessage('Enter a player name');
      setMessageType('error');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(newPlayer)) {
      setMessage('Invalid username (3-16 chars: letters, numbers, underscore)');
      setMessageType('error');
      return;
    }
    setWhitelistLoading(true);
    try {
      const res = await fetch(`${API}/api/client/rcon/whitelist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: newPlayer })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Added ${newPlayer} to whitelist`);
        setMessageType('success');
        setNewPlayer('');
        setWhitelist(data.whitelist || []);
      } else {
        setMessage(`✗ ${data.message}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
      setMessageType('error');
    }
    setWhitelistLoading(false);
  };

  const removeFromWhitelist = async (username: string) => {
    setWhitelistLoading(true);
    try {
      const res = await fetch(`${API}/api/client/rcon/whitelist/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Removed ${username} from whitelist`);
        setMessageType('success');
        setWhitelist(data.whitelist || []);
      } else {
        setMessage(`✗ ${data.message}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
      setMessageType('error');
    }
    setWhitelistLoading(false);
  };

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(184,115,51,0.2)',
      borderRadius: '0.75rem',
      color: '#d4a373',
      maxWidth: '1200px'
    }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontFamily: "'Playfair Display', serif" }}>⚙️ Minecraft Server Control</h2>

      {/* Player Selection */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Target Player</label>
        <input
          type="text"
          value={targetPlayer}
          onChange={(e) => setTargetPlayer(e.target.value)}
          placeholder="Enter player name"
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184, 115, 51, 0.15)',
            border: '1px solid #b87333',
            color: '#d4a373',
            borderRadius: '0.25rem'
          }}
        />
      </div>

      {/* Give Item */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Give Item</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select
            value={item}
            onChange={(e) => setItem(e.target.value)}
            style={{ ...selectStyles.select, maxHeight: '200px' }}
          >
            {BEDROCK_ITEMS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Qty"
            min="1"
            max="64"
            style={{
              padding: '0.5rem',
              background: 'rgba(184, 115, 51, 0.15)',
              border: '1px solid #b87333',
              color: '#d4a373',
              borderRadius: '0.25rem'
            }}
          />
        </div>
        <button
          onClick={giveItem}
          disabled={loading || !targetPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid #b87333',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !targetPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !targetPlayer ? 0.6 : 1
          }}
        >
          Give Item
        </button>
      </div>

      {/* Teleport */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Teleport</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input type="number" placeholder="X" value={x} onChange={(e) => setX(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(184, 115, 51, 0.15)', border: '1px solid #b87333', color: '#d4a373', borderRadius: '0.25rem' }} />
          <input type="number" placeholder="Y" value={y} onChange={(e) => setY(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(184, 115, 51, 0.15)', border: '1px solid #b87333', color: '#d4a373', borderRadius: '0.25rem' }} />
          <input type="number" placeholder="Z" value={z} onChange={(e) => setZ(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(184, 115, 51, 0.15)', border: '1px solid #b87333', color: '#d4a373', borderRadius: '0.25rem' }} />
        </div>
        <button
          onClick={teleport}
          disabled={loading || !targetPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid #b87333',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !targetPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !targetPlayer ? 0.6 : 1
          }}
        >
          Teleport
        </button>
      </div>

      {/* Whitelist Management */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <button
          onClick={() => setWhitelistOpen(!whitelistOpen)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: 'none',
            color: '#d4a373',
            fontSize: '1rem',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: whitelistOpen ? '1rem' : '0'
          }}
        >
          <span>Whitelist Players</span>
          <span>{whitelistOpen ? '▼' : '▶'}</span>
        </button>

        {whitelistOpen && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Enter player name"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: 'rgba(184, 115, 51, 0.15)',
                  border: '1px solid #b87333',
                  color: '#d4a373',
                  borderRadius: '0.25rem'
                }}
              />
              <button
                onClick={addToWhitelist}
                disabled={whitelistLoading || !newPlayer.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(184,115,51,0.3)',
                  border: '1px solid #b87333',
                  color: '#d4a373',
                  borderRadius: '0.25rem',
                  cursor: whitelistLoading ? 'not-allowed' : 'pointer',
                  opacity: whitelistLoading || !newPlayer.trim() ? 0.6 : 1
                }}
              >
                Add
              </button>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {whitelist.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: '#996515' }}>No players whitelisted</p>
              ) : (
                whitelist.map((player) => (
                  <div key={player.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', marginBottom: '0.5rem', borderRadius: '0.25rem', fontSize: '0.9rem' }}>
                    <span>{player.name}</span>
                    <button
                      onClick={() => removeFromWhitelist(player.name)}
                      disabled={whitelistLoading}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(239,68,68,0.3)',
                        border: '1px solid rgba(239,68,68,0.5)',
                        color: '#ff6b6b',
                        borderRadius: '0.15rem',
                        cursor: whitelistLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Restart Server */}
      <button
        onClick={restart}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(153,101,21,0.4)',
          border: '1px solid #b87333',
          color: '#ff6b6b',
          borderRadius: '0.25rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontWeight: 'bold',
          marginBottom: '1rem'
        }}
      >
        ⚠️ Restart Server
      </button>

      {/* Messages */}
      {message && (
        <p style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(184,115,51,0.1)',
          borderRadius: '0.25rem',
          fontSize: '0.9rem',
          borderLeft: `3px solid ${messageType === 'success' ? '#22c55e' : '#ef4444'}`,
          color: messageType === 'success' ? '#22c55e' : '#ff6b6b'
        }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default RconSection;
