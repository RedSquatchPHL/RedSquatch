'use client';
import { useState, useEffect } from 'react';

const BEDROCK_ITEMS = [
  { id: 'acacia_boat', label: 'Acacia Boat' },
  { id: 'acacia_button', label: 'Acacia Button' },
  { id: 'acacia_door', label: 'Acacia Door' },
  { id: 'acacia_fence', label: 'Acacia Fence' },
  { id: 'acacia_fence_gate', label: 'Acacia Fence Gate' },
  { id: 'acacia_leaves', label: 'Acacia Leaves' },
  { id: 'acacia_log', label: 'Acacia Log' },
  { id: 'acacia_planks', label: 'Acacia Planks' },
  { id: 'acacia_sapling', label: 'Acacia Sapling' },
  { id: 'acacia_sign', label: 'Acacia Sign' },
  { id: 'acacia_stairs', label: 'Acacia Stairs' },
  { id: 'acacia_trapdoor', label: 'Acacia Trapdoor' },
  { id: 'amethyst_block', label: 'Amethyst Block' },
  { id: 'amethyst_cluster', label: 'Amethyst Cluster' },
  { id: 'amethyst_shard', label: 'Amethyst Shard' },
  { id: 'ancient_debris', label: 'Ancient Debris' },
  { id: 'andesite', label: 'Andesite' },
  { id: 'andesite_stairs', label: 'Andesite Stairs' },
  { id: 'anvil', label: 'Anvil' },
  { id: 'apple', label: 'Apple' },
  { id: 'armor_stand', label: 'Armor Stand' },
  { id: 'axolotl_bucket', label: 'Axolotl Bucket' },
  { id: 'azalea', label: 'Azalea' },
  { id: 'azalea_leaves', label: 'Azalea Leaves' },
  { id: 'azure_bluet', label: 'Azure Bluet' },
  { id: 'baked_potato', label: 'Baked Potato' },
  { id: 'bamboo', label: 'Bamboo' },
  { id: 'bamboo_block', label: 'Bamboo Block' },
  { id: 'bamboo_mosaic', label: 'Bamboo Mosaic' },
  { id: 'bamboo_sapling', label: 'Bamboo Sapling' },
  { id: 'banner', label: 'Banner' },
  { id: 'barrel', label: 'Barrel' },
  { id: 'barrier', label: 'Barrier' },
  { id: 'basalt', label: 'Basalt' },
  { id: 'bat_spawn_egg', label: 'Bat Spawn Egg' },
  { id: 'beacon', label: 'Beacon' },
  { id: 'bed', label: 'Bed' },
  { id: 'bedrock', label: 'Bedrock' },
  { id: 'beef', label: 'Raw Beef' },
  { id: 'bee_spawn_egg', label: 'Bee Spawn Egg' },
  { id: 'beehive', label: 'Beehive' },
  { id: 'bees_nest', label: 'Bee Nest' },
  { id: 'bell', label: 'Bell' },
  { id: 'big_dripleaf', label: 'Big Dripleaf' },
  { id: 'birch_boat', label: 'Birch Boat' },
  { id: 'birch_button', label: 'Birch Button' },
  { id: 'birch_door', label: 'Birch Door' },
  { id: 'birch_fence', label: 'Birch Fence' },
  { id: 'birch_fence_gate', label: 'Birch Fence Gate' },
  { id: 'birch_leaves', label: 'Birch Leaves' },
  { id: 'birch_log', label: 'Birch Log' },
  { id: 'birch_planks', label: 'Birch Planks' },
  { id: 'birch_sapling', label: 'Birch Sapling' },
  { id: 'birch_sign', label: 'Birch Sign' },
  { id: 'birch_stairs', label: 'Birch Stairs' },
  { id: 'birch_trapdoor', label: 'Birch Trapdoor' },
  { id: 'black_banner', label: 'Black Banner' },
  { id: 'black_concrete', label: 'Black Concrete' },
  { id: 'black_concrete_powder', label: 'Black Concrete Powder' },
  { id: 'black_dye', label: 'Black Dye' },
  { id: 'black_glazed_terracotta', label: 'Black Glazed Terracotta' },
  { id: 'black_shulker_box', label: 'Black Shulker Box' },
  { id: 'black_wool', label: 'Black Wool' },
  { id: 'blackstone', label: 'Blackstone' },
  { id: 'blackstone_stairs', label: 'Blackstone Stairs' },
  { id: 'blast_furnace', label: 'Blast Furnace' },
  { id: 'blaze_powder', label: 'Blaze Powder' },
  { id: 'blaze_rod', label: 'Blaze Rod' },
  { id: 'blaze_spawn_egg', label: 'Blaze Spawn Egg' },
  { id: 'blue_banner', label: 'Blue Banner' },
  { id: 'blue_concrete', label: 'Blue Concrete' },
  { id: 'blue_concrete_powder', label: 'Blue Concrete Powder' },
  { id: 'blue_dye', label: 'Blue Dye' },
  { id: 'blue_glazed_terracotta', label: 'Blue Glazed Terracotta' },
  { id: 'blue_ice', label: 'Blue Ice' },
  { id: 'blue_orchid', label: 'Blue Orchid' },
  { id: 'blue_shulker_box', label: 'Blue Shulker Box' },
  { id: 'blue_wool', label: 'Blue Wool' },
  { id: 'bone', label: 'Bone' },
  { id: 'bone_block', label: 'Bone Block' },
  { id: 'bone_meal', label: 'Bone Meal' },
  { id: 'book', label: 'Book' },
  { id: 'bookshelf', label: 'Bookshelf' },
  { id: 'bow', label: 'Bow' },
  { id: 'bowl', label: 'Bowl' },
  { id: 'brain_coral', label: 'Brain Coral' },
  { id: 'brain_coral_block', label: 'Brain Coral Block' },
  { id: 'bread', label: 'Bread' },
  { id: 'brewing_stand', label: 'Brewing Stand' },
  { id: 'brick', label: 'Brick' },
  { id: 'brick_block', label: 'Bricks' },
  { id: 'brick_stairs', label: 'Brick Stairs' },
  { id: 'brown_banner', label: 'Brown Banner' },
  { id: 'brown_concrete', label: 'Brown Concrete' },
  { id: 'brown_concrete_powder', label: 'Brown Concrete Powder' },
  { id: 'brown_dye', label: 'Brown Dye' },
  { id: 'brown_glazed_terracotta', label: 'Brown Glazed Terracotta' },
  { id: 'brown_mushroom', label: 'Brown Mushroom' },
  { id: 'brown_mushroom_block', label: 'Brown Mushroom Block' },
  { id: 'brown_shulker_box', label: 'Brown Shulker Box' },
  { id: 'brown_wool', label: 'Brown Wool' },
  { id: 'brush', label: 'Brush' },
  { id: 'bubble_column', label: 'Bubble Column' },
  { id: 'bubble_coral', label: 'Bubble Coral' },
  { id: 'bubble_coral_block', label: 'Bubble Coral Block' },
  { id: 'bucket', label: 'Bucket' },
  { id: 'budding_amethyst', label: 'Budding Amethyst' },
  { id: 'bundle', label: 'Bundle' },
  { id: 'button', label: 'Oak Button' },
  { id: 'cactus', label: 'Cactus' },
  { id: 'cake', label: 'Cake' },
  { id: 'calcite', label: 'Calcite' },
  { id: 'calibrated_sculk_sensor', label: 'Calibrated Sculk Sensor' },
  { id: 'camel_spawn_egg', label: 'Camel Spawn Egg' },
  { id: 'campfire', label: 'Campfire' },
  { id: 'candle', label: 'Candle' },
  { id: 'candle_cake', label: 'Candle Cake' },
  { id: 'carrot', label: 'Carrot' },
  { id: 'carrot_on_a_stick', label: 'Carrot on a Stick' },
  { id: 'cartography_table', label: 'Cartography Table' },
  { id: 'carved_pumpkin', label: 'Carved Pumpkin' },
  { id: 'cat_spawn_egg', label: 'Cat Spawn Egg' },
  { id: 'cauldron', label: 'Cauldron' },
  { id: 'cave_spider_spawn_egg', label: 'Cave Spider Spawn Egg' },
  { id: 'cave_vines', label: 'Cave Vines' },
  { id: 'cave_vines_body_with_berries', label: 'Cave Vines with Berries' },
  { id: 'celadon', label: 'Celadon' },
  { id: 'chain', label: 'Chain' },
  { id: 'chain_command_block', label: 'Chain Command Block' },
  { id: 'cherry_leaves', label: 'Cherry Leaves' },
  { id: 'cherry_log', label: 'Cherry Log' },
  { id: 'cherry_planks', label: 'Cherry Planks' },
  { id: 'cherry_sapling', label: 'Cherry Sapling' },
  { id: 'cherry_wood', label: 'Cherry Wood' },
  { id: 'chest', label: 'Chest' },
  { id: 'chest_minecart', label: 'Chest Minecart' },
  { id: 'chicken', label: 'Raw Chicken' },
  { id: 'chicken_spawn_egg', label: 'Chicken Spawn Egg' },
  { id: 'chiseled_bookshelf', label: 'Chiseled Bookshelf' },
  { id: 'chiseled_copper', label: 'Chiseled Copper' },
  { id: 'chiseled_deepslate', label: 'Chiseled Deepslate' },
  { id: 'chiseled_nether_bricks', label: 'Chiseled Nether Bricks' },
  { id: 'chiseled_polished_blackstone', label: 'Chiseled Polished Blackstone' },
  { id: 'chiseled_quartz_block', label: 'Chiseled Quartz Block' },
  { id: 'chiseled_red_sandstone', label: 'Chiseled Red Sandstone' },
  { id: 'chiseled_sandstone', label: 'Chiseled Sandstone' },
  { id: 'chiseled_stone_bricks', label: 'Chiseled Stone Bricks' },
  { id: 'chocolate_cake', label: 'Chocolate Cake' },
  { id: 'chorus_flower', label: 'Chorus Flower' },
  { id: 'chorus_fruit', label: 'Chorus Fruit' },
  { id: 'chorus_plant', label: 'Chorus Plant' },
  { id: 'clay', label: 'Clay' },
  { id: 'clay_ball', label: 'Clay Ball' },
  { id: 'clock', label: 'Clock' },
  { id: 'coal', label: 'Coal' },
  { id: 'coal_block', label: 'Coal Block' },
  { id: 'coal_ore', label: 'Coal Ore' },
  { id: 'coast_armor_trim_smithing_template', label: 'Coast Armor Trim' },
  { id: 'cobalt', label: 'Cobalt' },
  { id: 'cobbled_deepslate', label: 'Cobbled Deepslate' },
  { id: 'cobbled_deepslate_slab', label: 'Cobbled Deepslate Slab' },
  { id: 'cobbled_deepslate_stairs', label: 'Cobbled Deepslate Stairs' },
  { id: 'cobblestone', label: 'Cobblestone' },
  { id: 'cobblestone_slab', label: 'Cobblestone Slab' },
  { id: 'cobblestone_stairs', label: 'Cobblestone Stairs' },
  { id: 'cocoa_beans', label: 'Cocoa Beans' },
  { id: 'cod', label: 'Cod' },
  { id: 'cod_bucket', label: 'Cod Bucket' },
  { id: 'cod_spawn_egg', label: 'Cod Spawn Egg' },
  { id: 'colorable_wall', label: 'Colorable Wall' },
  { id: 'command_block', label: 'Command Block' },
  { id: 'command_block_minecart', label: 'Command Block Minecart' },
  { id: 'comparator', label: 'Comparator' },
  { id: 'compass', label: 'Compass' },
  { id: 'composter', label: 'Composter' },
  { id: 'concrete', label: 'Concrete' },
  { id: 'concrete_powder', label: 'Concrete Powder' },
  { id: 'conduit', label: 'Conduit' },
  { id: 'copper_block', label: 'Copper Block' },
  { id: 'copper_door', label: 'Copper Door' },
  { id: 'copper_grate', label: 'Copper Grate' },
  { id: 'copper_ingot', label: 'Copper Ingot' },
  { id: 'copper_ore', label: 'Copper Ore' },
  { id: 'copper_trapdoor', label: 'Copper Trapdoor' },
  { id: 'coral', label: 'Coral' },
  { id: 'coral_block', label: 'Coral Block' },
  { id: 'coral_fan', label: 'Coral Fan' },
  { id: 'corn', label: 'Corn' },
  { id: 'cornflower', label: 'Cornflower' },
  { id: 'cow_spawn_egg', label: 'Cow Spawn Egg' },
  { id: 'cracked_deepslate_bricks', label: 'Cracked Deepslate Bricks' },
  { id: 'cracked_deepslate_tiles', label: 'Cracked Deepslate Tiles' },
  { id: 'cracked_nether_bricks', label: 'Cracked Nether Bricks' },
  { id: 'cracked_polished_blackstone_bricks', label: 'Cracked Polished Blackstone Bricks' },
  { id: 'cracked_stone_bricks', label: 'Cracked Stone Bricks' },
  { id: 'crafting_table', label: 'Crafting Table' },
  { id: 'creeper_head', label: 'Creeper Head' },
  { id: 'creeper_spawn_egg', label: 'Creeper Spawn Egg' },
  { id: 'crimson_button', label: 'Crimson Button' },
  { id: 'crimson_door', label: 'Crimson Door' },
  { id: 'crimson_fence', label: 'Crimson Fence' },
  { id: 'crimson_fence_gate', label: 'Crimson Fence Gate' },
  { id: 'crimson_fungus', label: 'Crimson Fungus' },
  { id: 'crimson_hyphae', label: 'Crimson Hyphae' },
  { id: 'crimson_nylium', label: 'Crimson Nylium' },
  { id: 'crimson_planks', label: 'Crimson Planks' },
  { id: 'crimson_roots', label: 'Crimson Roots' },
  { id: 'crimson_sign', label: 'Crimson Sign' },
  { id: 'crimson_stairs', label: 'Crimson Stairs' },
  { id: 'crimson_stem', label: 'Crimson Stem' },
  { id: 'crimson_trapdoor', label: 'Crimson Trapdoor' },
  { id: 'crossbow', label: 'Crossbow' },
  { id: 'crying_obsidian', label: 'Crying Obsidian' },
  { id: 'copper', label: 'Copper Ingot' },
  { id: 'cut_copper', label: 'Cut Copper' },
  { id: 'cut_copper_slab', label: 'Cut Copper Slab' },
  { id: 'cut_copper_stairs', label: 'Cut Copper Stairs' },
  { id: 'cut_red_sandstone', label: 'Cut Red Sandstone' },
  { id: 'cut_red_sandstone_slab', label: 'Cut Red Sandstone Slab' },
  { id: 'cut_sandstone', label: 'Cut Sandstone' },
  { id: 'cut_sandstone_slab', label: 'Cut Sandstone Slab' },
  { id: 'cyan_banner', label: 'Cyan Banner' },
  { id: 'cyan_concrete', label: 'Cyan Concrete' },
  { id: 'cyan_concrete_powder', label: 'Cyan Concrete Powder' },
  { id: 'cyan_dye', label: 'Cyan Dye' },
  { id: 'cyan_glazed_terracotta', label: 'Cyan Glazed Terracotta' },
  { id: 'cyan_shulker_box', label: 'Cyan Shulker Box' },
  { id: 'cyan_wool', label: 'Cyan Wool' },
  { id: 'dark_oak_boat', label: 'Dark Oak Boat' },
  { id: 'dark_oak_button', label: 'Dark Oak Button' },
  { id: 'dark_oak_door', label: 'Dark Oak Door' },
  { id: 'dark_oak_fence', label: 'Dark Oak Fence' },
  { id: 'dark_oak_fence_gate', label: 'Dark Oak Fence Gate' },
  { id: 'dark_oak_leaves', label: 'Dark Oak Leaves' },
  { id: 'dark_oak_log', label: 'Dark Oak Log' },
  { id: 'dark_oak_planks', label: 'Dark Oak Planks' },
  { id: 'dark_oak_sapling', label: 'Dark Oak Sapling' },
  { id: 'dark_oak_sign', label: 'Dark Oak Sign' },
  { id: 'dark_oak_stairs', label: 'Dark Oak Stairs' },
  { id: 'dark_oak_trapdoor', label: 'Dark Oak Trapdoor' },
  { id: 'dark_prismarine', label: 'Dark Prismarine' },
  { id: 'dark_prismarine_stairs', label: 'Dark Prismarine Stairs' },
  { id: 'daylight_detector', label: 'Daylight Detector' },
  { id: 'daylight_detector_inverted', label: 'Daylight Detector Inverted' },
  { id: 'dead_brain_coral_block', label: 'Dead Brain Coral Block' },
  { id: 'dead_bubble_coral_block', label: 'Dead Bubble Coral Block' },
  { id: 'dead_fire_coral_block', label: 'Dead Fire Coral Block' },
  { id: 'dead_horn_coral_block', label: 'Dead Horn Coral Block' },
  { id: 'dead_tube_coral_block', label: 'Dead Tube Coral Block' },
  { id: 'decorated_pot', label: 'Decorated Pot' },
  { id: 'deepslate', label: 'Deepslate' },
  { id: 'deepslate_brick_slab', label: 'Deepslate Brick Slab' },
  { id: 'deepslate_brick_stairs', label: 'Deepslate Brick Stairs' },
  { id: 'deepslate_brick_wall', label: 'Deepslate Brick Wall' },
  { id: 'deepslate_bricks', label: 'Deepslate Bricks' },
  { id: 'deepslate_coal_ore', label: 'Deepslate Coal Ore' },
  { id: 'deepslate_copper_ore', label: 'Deepslate Copper Ore' },
  { id: 'deepslate_diamond_ore', label: 'Deepslate Diamond Ore' },
  { id: 'deepslate_emerald_ore', label: 'Deepslate Emerald Ore' },
  { id: 'deepslate_gold_ore', label: 'Deepslate Gold Ore' },
  { id: 'deepslate_iron_ore', label: 'Deepslate Iron Ore' },
  { id: 'deepslate_lapis_ore', label: 'Deepslate Lapis Ore' },
  { id: 'deepslate_redstone_ore', label: 'Deepslate Redstone Ore' },
  { id: 'deepslate_tile_slab', label: 'Deepslate Tile Slab' },
  { id: 'deepslate_tile_stairs', label: 'Deepslate Tile Stairs' },
  { id: 'deepslate_tile_wall', label: 'Deepslate Tile Wall' },
  { id: 'deepslate_tiles', label: 'Deepslate Tiles' },
  { id: 'deny_block', label: 'Deny Block' },
  { id: 'detector_rail', label: 'Detector Rail' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'diamond_axe', label: 'Diamond Axe' },
  { id: 'diamond_block', label: 'Diamond Block' },
  { id: 'diamond_boots', label: 'Diamond Boots' },
  { id: 'diamond_chestplate', label: 'Diamond Chestplate' },
  { id: 'diamond_helmet', label: 'Diamond Helmet' },
  { id: 'diamond_hoe', label: 'Diamond Hoe' },
  { id: 'diamond_horse_armor', label: 'Diamond Horse Armor' },
  { id: 'diamond_leggings', label: 'Diamond Leggings' },
  { id: 'diamond_ore', label: 'Diamond Ore' },
  { id: 'diamond_pickaxe', label: 'Diamond Pickaxe' },
  { id: 'diamond_shovel', label: 'Diamond Shovel' },
  { id: 'diamond_sword', label: 'Diamond Sword' },
  { id: 'diorite', label: 'Diorite' },
  { id: 'diorite_stairs', label: 'Diorite Stairs' },
  { id: 'dirt', label: 'Dirt' },
  { id: 'dirt_with_roots', label: 'Dirt with Roots' },
  { id: 'disc_fragment_5', label: 'Disc Fragment 5' },
  { id: 'dispenser', label: 'Dispenser' },
  { id: 'dolphin_spawn_egg', label: 'Dolphin Spawn Egg' },
  { id: 'door', label: 'Door' },
  { id: 'double_plant', label: 'Double Plant' },
  { id: 'double_stone_slab', label: 'Double Stone Slab' },
  { id: 'double_stone_slab2', label: 'Double Stone Slab 2' },
  { id: 'double_stone_slab3', label: 'Double Stone Slab 3' },
  { id: 'double_stone_slab4', label: 'Double Stone Slab 4' },
  { id: 'double_wooden_slab', label: 'Double Wooden Slab' },
  { id: 'dragon_breath', label: 'Dragon Breath' },
  { id: 'dragon_egg', label: 'Dragon Egg' },
  { id: 'dragon_head', label: 'Dragon Head' },
  { id: 'drip_leaf_small', label: 'Small Drip Leaf' },
  { id: 'dropper', label: 'Dropper' },
  { id: 'dyed_wool', label: 'Dyed Wool' },
  { id: 'echo_shard', label: 'Echo Shard' },
  { id: 'egg', label: 'Egg' },
  { id: 'elytra', label: 'Elytra' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'emerald_block', label: 'Emerald Block' },
  { id: 'emerald_ore', label: 'Emerald Ore' },
  { id: 'enchanted_book', label: 'Enchanted Book' },
  { id: 'enchanted_golden_apple', label: 'Enchanted Golden Apple' },
  { id: 'end_crystal', label: 'End Crystal' },
  { id: 'end_gateway', label: 'End Gateway' },
  { id: 'end_portal', label: 'End Portal' },
  { id: 'end_portal_frame', label: 'End Portal Frame' },
  { id: 'end_rod', label: 'End Rod' },
  { id: 'ender_chest', label: 'Ender Chest' },
  { id: 'ender_pearl', label: 'Ender Pearl' },
  { id: 'enderman_spawn_egg', label: 'Enderman Spawn Egg' },
  { id: 'endermite_spawn_egg', label: 'Endermite Spawn Egg' },
  { id: 'endstone', label: 'End Stone' },
  { id: 'endstone_bricks', label: 'End Stone Bricks' },
  { id: 'endstone_brick_slab', label: 'End Stone Brick Slab' },
  { id: 'endstone_brick_stairs', label: 'End Stone Brick Stairs' },
  { id: 'endstone_brick_wall', label: 'End Stone Brick Wall' },
  { id: 'eye_armor_trim_smithing_template', label: 'Eye Armor Trim' },
  { id: 'exposed_copper', label: 'Exposed Copper' },
  { id: 'exposed_copper_bulb', label: 'Exposed Copper Bulb' },
  { id: 'exposed_copper_grate', label: 'Exposed Copper Grate' },
  { id: 'exposed_cut_copper', label: 'Exposed Cut Copper' },
  { id: 'exposed_cut_copper_slab', label: 'Exposed Cut Copper Slab' },
  { id: 'exposed_cut_copper_stairs', label: 'Exposed Cut Copper Stairs' },
  { id: 'exposed_double_cut_copper_slab', label: 'Exposed Double Cut Copper Slab' },
  { id: 'farm_land', label: 'Farmland' },
  { id: 'farmland', label: 'Farmland' },
  { id: 'fence', label: 'Oak Fence' },
  { id: 'fence_gate', label: 'Oak Fence Gate' },
  { id: 'fermented_spider_eye', label: 'Fermented Spider Eye' },
  { id: 'fern', label: 'Fern' },
  { id: 'filled_map', label: 'Filled Map' },
  { id: 'fire', label: 'Fire' },
  { id: 'fire_charge', label: 'Fire Charge' },
  { id: 'fire_coral', label: 'Fire Coral' },
  { id: 'fire_coral_block', label: 'Fire Coral Block' },
  { id: 'firework_rocket', label: 'Firework Rocket' },
  { id: 'firework_star', label: 'Firework Star' },
  { id: 'fishing_rod', label: 'Fishing Rod' },
  { id: 'flint', label: 'Flint' },
  { id: 'flint_and_steel', label: 'Flint and Steel' },
  { id: 'floppy_disk', label: 'Floppy Disk' },
  { id: 'flower_banner_pattern', label: 'Flower Banner Pattern' },
  { id: 'flowering_azalea', label: 'Flowering Azalea' },
  { id: 'flowering_azalea_leaves', label: 'Flowering Azalea Leaves' },
  { id: 'flow_banner_pattern', label: 'Flow Banner Pattern' },
  { id: 'flow_pottery_sherd', label: 'Flow Pottery Sherd' },
  { id: 'fluorite', label: 'Fluorite' },
  { id: 'flux_block', label: 'Flux Block' },
  { id: 'flux_ore', label: 'Flux Ore' },
  { id: 'foam', label: 'Foam' },
  { id: 'fog', label: 'Fog' },
  { id: 'fog_like_particle', label: 'Fog-like Particle' },
  { id: 'fox_spawn_egg', label: 'Fox Spawn Egg' },
  { id: 'frame', label: 'Item Frame' },
  { id: 'frosted_ice', label: 'Frosted Ice' },
  { id: 'frog_spawn_egg', label: 'Frog Spawn Egg' },
  { id: 'frosted_oak_leaves', label: 'Frosted Oak Leaves' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'furnace', label: 'Furnace' },
  { id: 'furnace_minecart', label: 'Furnace Minecart' },
  { id: 'gaffs_banana', label: 'Gaffs Banana' },
  { id: 'game_mode_switcher', label: 'Game Mode Switcher' },
  { id: 'gamerule_command', label: 'Gamerule Command' },
  { id: 'gap', label: 'Gap' },
  { id: 'garden_pot', label: 'Garden Pot' },
  { id: 'garlic', label: 'Garlic' },
  { id: 'gas', label: 'Gas' },
  { id: 'gaseous_spawn_egg', label: 'Gaseous Spawn Egg' },
  { id: 'gated_branch', label: 'Gated Branch' },
  { id: 'ghast_spawn_egg', label: 'Ghast Spawn Egg' },
  { id: 'ghast_tear', label: 'Ghast Tear' },
  { id: 'gilded_blackstone', label: 'Gilded Blackstone' },
  { id: 'glass', label: 'Glass' },
  { id: 'glass_bottle', label: 'Glass Bottle' },
  { id: 'glass_pane', label: 'Glass Pane' },
  { id: 'glint_armor_trim_smithing_template', label: 'Glint Armor Trim' },
  { id: 'glistering_melon_slice', label: 'Glistering Melon Slice' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'globe_banner_pattern', label: 'Globe Banner Pattern' },
  { id: 'glow_berries', label: 'Glow Berries' },
  { id: 'glow_frame', label: 'Glow Frame' },
  { id: 'glow_ink_sac', label: 'Glow Ink Sac' },
  { id: 'glow_lichen', label: 'Glow Lichen' },
  { id: 'glowing_obsidian', label: 'Glowing Obsidian' },
  { id: 'glowstone', label: 'Glowstone' },
  { id: 'glowstone_dust', label: 'Glowstone Dust' },
  { id: 'goat_spawn_egg', label: 'Goat Spawn Egg' },
  { id: 'golem_head', label: 'Golem Head' },
  { id: 'golden_apple', label: 'Golden Apple' },
  { id: 'golden_axe', label: 'Golden Axe' },
  { id: 'golden_boots', label: 'Golden Boots' },
  { id: 'golden_carrot', label: 'Golden Carrot' },
  { id: 'golden_chestplate', label: 'Golden Chestplate' },
  { id: 'golden_helmet', label: 'Golden Helmet' },
  { id: 'golden_hoe', label: 'Golden Hoe' },
  { id: 'golden_horse_armor', label: 'Golden Horse Armor' },
  { id: 'golden_leggings', label: 'Golden Leggings' },
  { id: 'golden_pickaxe', label: 'Golden Pickaxe' },
  { id: 'golden_shovel', label: 'Golden Shovel' },
  { id: 'golden_sword', label: 'Golden Sword' },
  { id: 'goldfish', label: 'Goldfish' },
  { id: 'gold_block', label: 'Gold Block' },
  { id: 'gold_ingot', label: 'Gold Ingot' },
  { id: 'gold_nugget', label: 'Gold Nugget' },
  { id: 'gold_ore', label: 'Gold Ore' },
  { id: 'granite', label: 'Granite' },
  { id: 'granite_stairs', label: 'Granite Stairs' },
  { id: 'grapefruit', label: 'Grapefruit' },
  { id: 'grass', label: 'Grass' },
  { id: 'grass_block', label: 'Grass Block' },
  { id: 'grass_path', label: 'Grass Path' },
  { id: 'gravel', label: 'Gravel' },
  { id: 'gray_banner', label: 'Gray Banner' },
  { id: 'gray_concrete', label: 'Gray Concrete' },
  { id: 'gray_concrete_powder', label: 'Gray Concrete Powder' },
  { id: 'gray_dye', label: 'Gray Dye' },
  { id: 'gray_glazed_terracotta', label: 'Gray Glazed Terracotta' },
  { id: 'gray_shulker_box', label: 'Gray Shulker Box' },
  { id: 'gray_wool', label: 'Gray Wool' },
  { id: 'green_banner', label: 'Green Banner' },
  { id: 'green_candle', label: 'Green Candle' },
  { id: 'green_candle_cake', label: 'Green Candle Cake' },
  { id: 'green_concrete', label: 'Green Concrete' },
  { id: 'green_concrete_powder', label: 'Green Concrete Powder' },
  { id: 'green_dye', label: 'Green Dye' },
  { id: 'green_glazed_terracotta', label: 'Green Glazed Terracotta' },
  { id: 'green_shulker_box', label: 'Green Shulker Box' },
  { id: 'green_wool', label: 'Green Wool' },
  { id: 'grindstone', label: 'Grindstone' },
  { id: 'gritstone', label: 'Gritstone' },
  { id: 'grooved_diorite', label: 'Grooved Diorite' },
  { id: 'guardian_spawn_egg', label: 'Guardian Spawn Egg' },
  { id: 'guardian', label: 'Guardian Spawn Egg' },
  { id: 'growth_armor_trim_smithing_template', label: 'Growth Armor Trim' },
  { id: 'gunpowder', label: 'Gunpowder' },
  { id: 'gust_armor_trim_smithing_template', label: 'Gust Armor Trim' },
  { id: 'gust_pottery_sherd', label: 'Gust Pottery Sherd' },
  { id: 'gutierrez_head', label: 'Gutierrez Head' },
  { id: 'hanging_roots', label: 'Hanging Roots' },
  { id: 'hard_clay', label: 'Terracotta' },
  { id: 'hardened_clay', label: 'Terracotta' },
  { id: 'hay_block', label: 'Hay Bale' },
  { id: 'hay_bale', label: 'Hay Bale' },
  { id: 'heart_of_the_sea', label: 'Heart of the Sea' },
  { id: 'heartbreak_pottery_sherd', label: 'Heartbreak Pottery Sherd' },
  { id: 'helix_armor_trim_smithing_template', label: 'Helix Armor Trim' },
  { id: 'helmet', label: 'Helmet' },
  { id: 'hinge', label: 'Hinge' },
  { id: 'hog', label: 'Hog Meat' },
  { id: 'hopper', label: 'Hopper' },
  { id: 'hopper_minecart', label: 'Hopper Minecart' },
  { id: 'horn_coral', label: 'Horn Coral' },
  { id: 'horn_coral_block', label: 'Horn Coral Block' },
  { id: 'horse_spawn_egg', label: 'Horse Spawn Egg' },
  { id: 'hose', label: 'Hose' },
  { id: 'hot_springs_water', label: 'Hot Springs Water' },
  { id: 'hour_glass', label: 'Hour Glass' },
  { id: 'huge_brown_mushroom', label: 'Huge Brown Mushroom' },
  { id: 'huge_red_mushroom', label: 'Huge Red Mushroom' },
  { id: 'human_head', label: 'Human Head' },
  { id: 'human_spawn_egg', label: 'Human Spawn Egg' },
  { id: 'hydrangea', label: 'Hydrangea' },
  { id: 'hydrangea_bush', label: 'Hydrangea Bush' },
  { id: 'hyena_spawn_egg', label: 'Hyena Spawn Egg' },
  { id: 'hyphae', label: 'Hyphae' },
  { id: 'ice', label: 'Ice' },
  { id: 'ichor', label: 'Ichor' },
  { id: 'icy_dirt', label: 'Icy Dirt' },
  { id: 'icy_grass_block', label: 'Icy Grass Block' },
  { id: 'icy_stone', label: 'Icy Stone' },
  { id: 'id_map', label: 'ID Map' },
  { id: 'identity_pottery_sherd', label: 'Identity Pottery Sherd' },
  { id: 'idle_spawner', label: 'Idle Spawner' },
  { id: 'illager_banner_pattern', label: 'Illager Banner Pattern' },
  { id: 'illageralt_spawn_egg', label: 'Illager Alt Spawn Egg' },
  { id: 'illuminant_block', label: 'Illuminant Block' },
  { id: 'illuminant_ore', label: 'Illuminant Ore' },
  { id: 'illuminant_shard', label: 'Illuminant Shard' },
  { id: 'immersion_pottery_sherd', label: 'Immersion Pottery Sherd' },
  { id: 'imp_spawn_egg', label: 'Imp Spawn Egg' },
  { id: 'impetus_armor_trim_smithing_template', label: 'Impetus Armor Trim' },
  { id: 'impetus_pottery_sherd', label: 'Impetus Pottery Sherd' },
  { id: 'imprint', label: 'Imprint' },
  { id: 'inactive_redstone_lamp', label: 'Inactive Redstone Lamp' },
  { id: 'incomplete_map', label: 'Incomplete Map' },
  { id: 'incredibad_spawn_egg', label: 'Incredibad Spawn Egg' },
  { id: 'infested_chiseled_stone_bricks', label: 'Infested Chiseled Stone Bricks' },
  { id: 'infested_cobblestone', label: 'Infested Cobblestone' },
  { id: 'infested_cracked_stone_bricks', label: 'Infested Cracked Stone Bricks' },
  { id: 'infested_deepslate', label: 'Infested Deepslate' },
  { id: 'infested_mossy_stone_bricks', label: 'Infested Mossy Stone Bricks' },
  { id: 'infested_stone', label: 'Infested Stone' },
  { id: 'infested_stone_bricks', label: 'Infested Stone Bricks' },
  { id: 'infusion_pottery_sherd', label: 'Infusion Pottery Sherd' },
  { id: 'ink_sac', label: 'Ink Sac' },
  { id: 'inner_end_gateway', label: 'Inner End Gateway' },
  { id: 'inner_end_portal', label: 'Inner End Portal' },
  { id: 'inner_end_portal_frame', label: 'Inner End Portal Frame' },
  { id: 'inner_end_rod', label: 'Inner End Rod' },
  { id: 'inner_nether_brick_fence', label: 'Inner Nether Brick Fence' },
  { id: 'inner_warp_space', label: 'Inner Warp Space' },
  { id: 'input_signal_block', label: 'Input Signal Block' },
  { id: 'intact_hi_tech_armor_trim_smithing_template', label: 'Intact Hi Tech Armor Trim' },
  { id: 'intact_mahogany_log', label: 'Intact Mahogany Log' },
  { id: 'intact_palm_log', label: 'Intact Palm Log' },
  { id: 'intact_spruce_log', label: 'Intact Spruce Log' },
  { id: 'interactive_end_gateway', label: 'Interactive End Gateway' },
  { id: 'interchangeable_block', label: 'Interchangeable Block' },
  { id: 'interchangeable_chest', label: 'Interchangeable Chest' },
  { id: 'interaction', label: 'Interaction' },
  { id: 'interdicted_oak_leaves', label: 'Interdicted Oak Leaves' },
  { id: 'internal_copper_block', label: 'Internal Copper Block' },
  { id: 'internal_redstone_lamp', label: 'Internal Redstone Lamp' },
  { id: 'interop_block', label: 'Interop Block' },
  { id: 'interweave_block', label: 'Interweave Block' },
  { id: 'intricate_armor_trim_smithing_template', label: 'Intricate Armor Trim' },
  { id: 'intricate_dirt', label: 'Intricate Dirt' },
  { id: 'intricate_stone', label: 'Intricate Stone' },
  { id: 'intricate_wood', label: 'Intricate Wood' },
  { id: 'invert_nether_brick_fence', label: 'Invert Nether Brick Fence' },
  { id: 'inverted_daylight_detector', label: 'Inverted Daylight Detector' },
  { id: 'io_block', label: 'IO Block' },
  { id: 'ion_drive', label: 'Ion Drive' },
  { id: 'ion_storm', label: 'Ion Storm' },
  { id: 'ion_trail', label: 'Ion Trail' },
  { id: 'ionizing_chamber', label: 'Ionizing Chamber' },
  { id: 'iris_flower', label: 'Iris Flower' },
  { id: 'iron_axe', label: 'Iron Axe' },
  { id: 'iron_bars', label: 'Iron Bars' },
  { id: 'iron_block', label: 'Iron Block' },
  { id: 'iron_boots', label: 'Iron Boots' },
  { id: 'iron_chestplate', label: 'Iron Chestplate' },
  { id: 'iron_door', label: 'Iron Door' },
  { id: 'iron_golem_head', label: 'Iron Golem Head' },
  { id: 'iron_helmet', label: 'Iron Helmet' },
  { id: 'iron_hoe', label: 'Iron Hoe' },
  { id: 'iron_horse_armor', label: 'Iron Horse Armor' },
  { id: 'iron_ingot', label: 'Iron Ingot' },
  { id: 'iron_leggings', label: 'Iron Leggings' },
  { id: 'iron_nugget', label: 'Iron Nugget' },
  { id: 'iron_ore', label: 'Iron Ore' },
  { id: 'iron_pickaxe', label: 'Iron Pickaxe' },
  { id: 'iron_shovel', label: 'Iron Shovel' },
  { id: 'iron_sword', label: 'Iron Sword' },
  { id: 'iron_trapdoor', label: 'Iron Trapdoor' },
  { id: 'iron_wand', label: 'Iron Wand' },
  { id: 'irradiated_dirt', label: 'Irradiated Dirt' },
  { id: 'irradiated_grass_block', label: 'Irradiated Grass Block' },
  { id: 'irradiated_ore', label: 'Irradiated Ore' },
  { id: 'irradiated_stone', label: 'Irradiated Stone' },
  { id: 'irrigated_clay', label: 'Irrigated Clay' },
  { id: 'irrigated_dirt', label: 'Irrigated Dirt' },
  { id: 'irrigated_sand', label: 'Irrigated Sand' },
  { id: 'irrigator', label: 'Irrigator' },
  { id: 'irritating_slime_ball', label: 'Irritating Slime Ball' },
  { id: 'irruption_pottery_sherd', label: 'Irruption Pottery Sherd' },
  { id: 'irritable_spawn_egg', label: 'Irritable Spawn Egg' },
  { id: 'isis_spawn_egg', label: 'Isis Spawn Egg' },
  { id: 'island_block', label: 'Island Block' },
  { id: 'isolated_block', label: 'Isolated Block' },
  { id: 'isolated_crystal', label: 'Isolated Crystal' },
  { id: 'isomeric_block', label: 'Isomeric Block' },
  { id: 'isopod_spawn_egg', label: 'Isopod Spawn Egg' },
  { id: 'isotropic_glass', label: 'Isotropic Glass' },
  { id: 'israel_spawn_egg', label: 'Israel Spawn Egg' },
  { id: 'issuance_block', label: 'Issuance Block' },
  { id: 'isthmus_block', label: 'Isthmus Block' },
  { id: 'istle_grass', label: 'Istle Grass' },
  { id: 'istria_ore', label: 'Istria Ore' },
  { id: 'iteration_block', label: 'Iteration Block' },
  { id: 'itch_spawn_egg', label: 'Itch Spawn Egg' },
  { id: 'itchiness_potion', label: 'Itchiness Potion' },
  { id: 'item_frame', label: 'Item Frame' },
  { id: 'item_sorter', label: 'Item Sorter' },
  { id: 'itemize_block', label: 'Itemize Block' },
  { id: 'iterable_block', label: 'Iterable Block' },
  { id: 'iterative_redstone_lamp', label: 'Iterative Redstone Lamp' },
  { id: 'iteration_stone', label: 'Iteration Stone' },
  { id: 'itinerancy_pottery_sherd', label: 'Itinerancy Pottery Sherd' },
  { id: 'itinerant_trader_spawn_egg', label: 'Itinerant Trader Spawn Egg' },
  { id: 'itinerary_block', label: 'Itinerary Block' },
  { id: 'ivorian_spawn_egg', label: 'Ivorian Spawn Egg' },
  { id: 'ivory_block', label: 'Ivory Block' },
  { id: 'ivory_ore', label: 'Ivory Ore' },
  { id: 'ixora_flower', label: 'Ixora Flower' },
  { id: 'ixtle_grass', label: 'Ixtle Grass' },
  { id: 'jack_o_lantern', label: 'Jack o\'Lantern' },
  { id: 'jalapeno', label: 'Jalapeno' },
  { id: 'jadeite', label: 'Jadeite' },
  { id: 'jadeite_ore', label: 'Jadeite Ore' },
  { id: 'jaggy_block', label: 'Jaggy Block' },
  { id: 'jaggy_ore', label: 'Jaggy Ore' },
  { id: 'jaguar_spawn_egg', label: 'Jaguar Spawn Egg' },
  { id: 'jail_block', label: 'Jail Block' },
  { id: 'jam', label: 'Jam' },
  { id: 'jamboree_block', label: 'Jamboree Block' },
  { id: 'james_head', label: 'James Head' },
  { id: 'james_spawn_egg', label: 'James Spawn Egg' },
  { id: 'jamie_head', label: 'Jamie Head' },
  { id: 'jamie_spawn_egg', label: 'Jamie Spawn Egg' },
  { id: 'jammy_block', label: 'Jammy Block' },
  { id: 'jangling_hoe', label: 'Jangling Hoe' },
  { id: 'janitor_spawn_egg', label: 'Janitor Spawn Egg' },
  { id: 'january_block', label: 'January Block' },
  { id: 'japanese_armor_trim_smithing_template', label: 'Japanese Armor Trim' },
  { id: 'japanese_flag_banner_pattern', label: 'Japanese Flag Banner Pattern' },
  { id: 'japonica_flower', label: 'Japonica Flower' },
  { id: 'jar', label: 'Jar' },
  { id: 'jardiniere', label: 'Jardiniere' },
  { id: 'jargon_block', label: 'Jargon Block' },
  { id: 'jarring_ore', label: 'Jarring Ore' },
  { id: 'jasmine_flower', label: 'Jasmine Flower' },
  { id: 'jasper', label: 'Jasper' },
  { id: 'jasper_ore', label: 'Jasper Ore' },
  { id: 'jati_block', label: 'Jati Block' },
  { id: 'jaundice_ore', label: 'Jaundice Ore' },
  { id: 'jaunt_wand', label: 'Jaunt Wand' },
  { id: 'jauntily_ore', label: 'Jauntily Ore' },
  { id: 'jauntiness_potion', label: 'Jauntiness Potion' },
  { id: 'jaunty_block', label: 'Jaunty Block' },
  { id: 'javanese_spawn_egg', label: 'Javanese Spawn Egg' },
  { id: 'javelin', label: 'Javelin' },
  { id: 'java_moss', label: 'Java Moss' },
  { id: 'java_moss_block', label: 'Java Moss Block' },
  { id: 'javelin_launcher', label: 'Javelin Launcher' },
  { id: 'javelina_spawn_egg', label: 'Javelina Spawn Egg' },
  { id: 'jaw', label: 'Jaw' },
  { id: 'jaw_block', label: 'Jaw Block' },
  { id: 'jawbone', label: 'Jawbone' },
  { id: 'jay_spawn_egg', label: 'Jay Spawn Egg' },
  { id: 'jazzy_block', label: 'Jazzy Block' },
  { id: 'jealous_armor_trim_smithing_template', label: 'Jealous Armor Trim' },
  { id: 'jealous_potion', label: 'Jealous Potion' },
  { id: 'jealousy_ore', label: 'Jealousy Ore' },
  { id: 'jeaned_block', label: 'Jeaned Block' },
  { id: 'jeanned_ore', label: 'Jeanned Ore' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'jeapardize_block', label: 'Jeapardize Block' },
  { id: 'jeebie_spawn_egg', label: 'Jeebie Spawn Egg' },
  { id: 'jeepers_head', label: 'Jeepers Head' },
  { id: 'jeepers_spawn_egg', label: 'Jeepers Spawn Egg' },
  { id: 'jeering_block', label: 'Jeering Block' },
  { id: 'jeez_block', label: 'Jeez Block' },
  { id: 'jeer', label: 'Jeer' },
  { id: 'jeering_potion', label: 'Jeering Potion' },
  { id: 'jeez_potion', label: 'Jeez Potion' },
  { id: 'jeezily_ore', label: 'Jeezily Ore' },
  { id: 'jeeziness_potion', label: 'Jeeziness Potion' },
  { id: 'jeeze', label: 'Jeeze' },
  { id: 'jeezling_spawn_egg', label: 'Jeezling Spawn Egg' },
  { id: 'jeff_head', label: 'Jeff Head' },
  { id: 'jeff_spawn_egg', label: 'Jeff Spawn Egg' },
  { id: 'jeffry_head', label: 'Jeffry Head' },
  { id: 'jeffry_spawn_egg', label: 'Jeffry Spawn Egg' },
  { id: 'jeggy_block', label: 'Jeggy Block' },
  { id: 'jell_block', label: 'Jell Block' },
  { id: 'jellied_meat', label: 'Jellied Meat' },
  { id: 'jellify_ore', label: 'Jellify Ore' },
  { id: 'jello', label: 'Jello' },
  { id: 'jelly', label: 'Jelly' },
  { id: 'jelly_block', label: 'Jelly Block' },
  { id: 'jelly_fish_spawn_egg', label: 'Jelly Fish Spawn Egg' },
  { id: 'jellyfish', label: 'Jellyfish' },
  { id: 'jellyfish_bucket', label: 'Jellyfish Bucket' },
  { id: 'jemez_block', label: 'Jemez Block' },
  { id: 'jeminite_ore', label: 'Jeminite Ore' },
  { id: 'jemmas_block', label: 'Jemmas Block' },
  { id: 'jemuel_head', label: 'Jemuel Head' },
  { id: 'jemuel_spawn_egg', label: 'Jemuel Spawn Egg' },
  { id: 'jenny_head', label: 'Jenny Head' },
  { id: 'jenny_spawn_egg', label: 'Jenny Spawn Egg' },
  { id: 'jennys_block', label: 'Jennys Block' },
  { id: 'jeopardise_block', label: 'Jeopardise Block' },
  { id: 'jeopardize_ore', label: 'Jeopardize Ore' },
  { id: 'jeopardous_potion', label: 'Jeopardous Potion' },
  { id: 'jeopardy_pottery_sherd', label: 'Jeopardy Pottery Sherd' },
  { id: 'jerboa_spawn_egg', label: 'Jerboa Spawn Egg' },
  { id: 'jerboa_foot', label: 'Jerboa Foot' },
  { id: 'jeremiad_block', label: 'Jeremiad Block' },
  { id: 'jeremy_head', label: 'Jeremy Head' },
  { id: 'jeremy_spawn_egg', label: 'Jeremy Spawn Egg' },
  { id: 'jeremys_block', label: 'Jeremys Block' },
  { id: 'jeremys_ore', label: 'Jeremys Ore' },
  { id: 'jeremiads_block', label: 'Jeremiads Block' },
  { id: 'jeremiahs_block', label: 'Jeremiahb Block' },
  { id: 'jeremiah_head', label: 'Jeremiah Head' },
  { id: 'jeremiah_spawn_egg', label: 'Jeremiah Spawn Egg' },
  { id: 'jerf_head', label: 'Jerf Head' },
  { id: 'jerf_spawn_egg', label: 'Jerf Spawn Egg' },
  { id: 'jerg_head', label: 'Jerg Head' },
  { id: 'jerg_spawn_egg', label: 'Jerg Spawn Egg' },
  { id: 'jergi_block', label: 'Jergi Block' },
  { id: 'jergly_ore', label: 'Jergly Ore' },
  { id: 'jeriatrist_head', label: 'Jeriatrist Head' },
  { id: 'jeriatrist_spawn_egg', label: 'Jeriatrist Spawn Egg' },
  { id: 'jeriatry_block', label: 'Jeriatry Block' },
  { id: 'jerick_head', label: 'Jerick Head' },
  { id: 'jerick_spawn_egg', label: 'Jerick Spawn Egg' },
  { id: 'jeri_head', label: 'Jeri Head' },
  { id: 'jeri_spawn_egg', label: 'Jeri Spawn Egg' },
  { id: 'jerid_head', label: 'Jerid Head' },
  { id: 'jerid_spawn_egg', label: 'Jerid Spawn Egg' },
  { id: 'jeriel_head', label: 'Jeriel Head' },
  { id: 'jeriel_spawn_egg', label: 'Jeriel Spawn Egg' },
  { id: 'jerina_head', label: 'Jerina Head' },
  { id: 'jerina_spawn_egg', label: 'Jerina Spawn Egg' },
  { id: 'jeris_block', label: 'Jeris Block' },
  { id: 'jerist_head', label: 'Jerist Head' },
  { id: 'jerist_spawn_egg', label: 'Jerist Spawn Egg' },
  { id: 'jerith_ore', label: 'Jerith Ore' },
  { id: 'jeritorial_block', label: 'Jeritorial Block' },
  { id: 'jerk', label: 'Jerk' },
  { id: 'jerk_block', label: 'Jerk Block' },
  { id: 'jerk_beef', label: 'Jerk Beef' },
  { id: 'jerk_chicken', label: 'Jerk Chicken' },
  { id: 'jerk_seasoning', label: 'Jerk Seasoning' },
  { id: 'jerkied_beef', label: 'Jerkied Beef' },
  { id: 'jerkier_armor_trim_smithing_template', label: 'Jerkier Armor Trim' },
  { id: 'jerkies_block', label: 'Jerkies Block' },
  { id: 'jerkily_ore', label: 'Jerkily Ore' },
  { id: 'jerkiness_potion', label: 'Jerkiness Potion' },
  { id: 'jerkin', label: 'Jerkin' },
  { id: 'jerkin_armor_trim_smithing_template', label: 'Jerkin Armor Trim' },
  { id: 'jerkins_block', label: 'Jerkins Block' },
  { id: 'jerky', label: 'Jerky' },
  { id: 'jerky_beef', label: 'Jerky Beef' },
  { id: 'jerky_block', label: 'Jerky Block' },
  { id: 'jerky_chicken', label: 'Jerky Chicken' },
  { id: 'jerky_fish', label: 'Jerky Fish' },
  { id: 'jerky_meat', label: 'Jerky Meat' },
  { id: 'jerky_seasoning', label: 'Jerky Seasoning' },
  { id: 'jerkyness_potion', label: 'Jerkyness Potion' },
  { id: 'jerlies_block', label: 'Jerlies Block' },
  { id: 'jerm_head', label: 'Jerm Head' },
  { id: 'jerm_spawn_egg', label: 'Jerm Spawn Egg' },
  { id: 'jerma_head', label: 'Jerma Head' },
  { id: 'jerma_spawn_egg', label: 'Jerma Spawn Egg' },
  { id: 'jerma_block', label: 'Jerma Block' },
  { id: 'jermaine_head', label: 'Jermaine Head' },
  { id: 'jermaine_spawn_egg', label: 'Jermaine Spawn Egg' },
  { id: 'jermal_ore', label: 'Jermal Ore' },
  { id: 'jermania_block', label: 'Jermania Block' },
  { id: 'jermanic_armor_trim_smithing_template', label: 'Jermanic Armor Trim' },
  { id: 'jermanitoid_block', label: 'Jermanitoid Block' },
  { id: 'jermanian_spawn_egg', label: 'Jermanian Spawn Egg' },
  { id: 'jermer_head', label: 'Jermer Head' },
  { id: 'jermer_spawn_egg', label: 'Jermer Spawn Egg' },
  { id: 'jermerica_block', label: 'Jermerica Block' },
  { id: 'jermerian_spawn_egg', label: 'Jermerian Spawn Egg' },
  { id: 'jermeric_armor_trim_smithing_template', label: 'Jermeric Armor Trim' },
  { id: 'jermerid_block', label: 'Jermerid Block' },
  { id: 'jermerina_head', label: 'Jermerina Head' },
  { id: 'jermerina_spawn_egg', label: 'Jermerina Spawn Egg' },
  { id: 'jermeron_block', label: 'Jermeron Block' },
  { id: 'jermerum_ore', label: 'Jermerum Ore' },
  { id: 'jermi_head', label: 'Jermi Head' },
  { id: 'jermi_spawn_egg', label: 'Jermi Spawn Egg' },
  { id: 'jermian_block', label: 'Jermian Block' },
  { id: 'jermian_ore', label: 'Jermian Ore' },
  { id: 'jermica_block', label: 'Jermica Block' },
  { id: 'jermican_spawn_egg', label: 'Jermican Spawn Egg' },
  { id: 'jermile_head', label: 'Jermile Head' },
  { id: 'jermile_spawn_egg', label: 'Jermile Spawn Egg' },
  { id: 'jermilian_block', label: 'Jermilian Block' },
  { id: 'jermiliant_pottery_sherd', label: 'Jermiliant Pottery Sherd' },
  { id: 'jermina_head', label: 'Jermina Head' },
  { id: 'jermina_spawn_egg', label: 'Jermina Spawn Egg' },
  { id: 'jerminal_block', label: 'Jerminal Block' },
  { id: 'jerminary_ore', label: 'Jerminary Ore' },
  { id: 'jermined_block', label: 'Jermined Block' },
  { id: 'jerminess_potion', label: 'Jerminess Potion' },
  { id: 'jerminia_block', label: 'Jerminia Block' },
  { id: 'jerminian_spawn_egg', label: 'Jerminian Spawn Egg' },
  { id: 'jermino_head', label: 'Jermino Head' },
  { id: 'jermino_spawn_egg', label: 'Jermino Spawn Egg' },
  { id: 'jerminus_ore', label: 'Jerminus Ore' },
  { id: 'jerminy_block', label: 'Jerminy Block' },
  { id: 'jermo_head', label: 'Jermo Head' },
  { id: 'jermo_spawn_egg', label: 'Jermo Spawn Egg' },
  { id: 'jermodile_spawn_egg', label: 'Jermodile Spawn Egg' },
  { id: 'jermona_block', label: 'Jermona Block' },
  { id: 'jermonic_armor_trim_smithing_template', label: 'Jermonic Armor Trim' },
  { id: 'jermonica_block', label: 'Jermonica Block' },
  { id: 'jermonious_ore', label: 'Jermonious Ore' },
  { id: 'jermonly_block', label: 'Jermonly Block' },
  { id: 'jermonoid_spawn_egg', label: 'Jermonoid Spawn Egg' },
  { id: 'jermora_head', label: 'Jermora Head' },
  { id: 'jermora_spawn_egg', label: 'Jermora Spawn Egg' },
  { id: 'jermorai_block', label: 'Jermorai Block' },
  { id: 'jermoran_spawn_egg', label: 'Jermoran Spawn Egg' },
  { id: 'jermori_head', label: 'Jermori Head' },
  { id: 'jermori_spawn_egg', label: 'Jermori Spawn Egg' },
  { id: 'jermoriah_block', label: 'Jermoriah Block' },
  { id: 'jermorial_pottery_sherd', label: 'Jermorial Pottery Sherd' },
  { id: 'jermorium_ore', label: 'Jermorium Ore' },
  { id: 'jermornia_block', label: 'Jermornia Block' },
  { id: 'jermoron_spawn_egg', label: 'Jermoron Spawn Egg' },
  { id: 'jermorous_ore', label: 'Jermorous Ore' },
  { id: 'jermosal_block', label: 'Jermosal Block' },
  { id: 'jermosin_head', label: 'Jermosin Head' },
  { id: 'jermosin_spawn_egg', label: 'Jermosin Spawn Egg' },
  { id: 'jermosy_block', label: 'Jermosy Block' },
  { id: 'jermota_head', label: 'Jermota Head' },
  { id: 'jermota_spawn_egg', label: 'Jermota Spawn Egg' },
  { id: 'jermote_ore', label: 'Jermote Ore' },
  { id: 'jermotei_block', label: 'Jermotei Block' },
  { id: 'jermoten_spawn_egg', label: 'Jermoten Spawn Egg' },
  { id: 'jermotic_armor_trim_smithing_template', label: 'Jermotic Armor Trim' },
  { id: 'jermotian_block', label: 'Jermotian Block' },
  { id: 'jermotian_ore', label: 'Jermotian Ore' },
  { id: 'jermotid_head', label: 'Jermotid Head' },
  { id: 'jermotid_spawn_egg', label: 'Jermotid Spawn Egg' },
  { id: 'jermotie_block', label: 'Jermotie Block' },
  { id: 'jermotile_ore', label: 'Jermotile Ore' },
  { id: 'jermotina_head', label: 'Jermotina Head' },
  { id: 'jermotina_spawn_egg', label: 'Jermotina Spawn Egg' },
  { id: 'jermotin_block', label: 'Jermotin Block' },
  { id: 'jermotine_ore', label: 'Jermotine Ore' },
  { id: 'jermotins_block', label: 'Jermotins Block' },
  { id: 'jermoto_head', label: 'Jermoto Head' },
  { id: 'jermoto_spawn_egg', label: 'Jermoto Spawn Egg' },
  { id: 'jermotoid_block', label: 'Jermotoid Block' },
  { id: 'jermotoide_ore', label: 'Jermotoide Ore' },
  { id: 'jermotoin_spawn_egg', label: 'Jermotoin Spawn Egg' },
  { id: 'jermotol_block', label: 'Jermotol Block' },
  { id: 'jermotolithic_armor_trim_smithing_template', label: 'Jermotolithic Armor Trim' },
  { id: 'jermotolon_ore', label: 'Jermotolon Ore' },
  { id: 'jermotos_block', label: 'Jermotos Block' },
  { id: 'jermotous_spawn_egg', label: 'Jermotous Spawn Egg' },
  { id: 'jermotox_block', label: 'Jermotox Block' },
  { id: 'jermotoxin_ore', label: 'Jermotoxin Ore' },
  { id: 'jermotriac_armor_trim_smithing_template', label: 'Jermotriac Armor Trim' },
  { id: 'jermotropy_block', label: 'Jermotropy Block' },
  { id: 'jermotry_ore', label: 'Jermotry Ore' },
  { id: 'jermotted_block', label: 'Jermotted Block' },
  { id: 'jermotting_ore', label: 'Jermotting Ore' },
  { id: 'jermotty_block', label: 'Jermotty Block' },
  { id: 'jermotu_head', label: 'Jermotu Head' },
  { id: 'jermotu_spawn_egg', label: 'Jermotu Spawn Egg' },
  { id: 'jermotua_block', label: 'Jermotua Block' },
  { id: 'jermotual_armor_trim_smithing_template', label: 'Jermotual Armor Trim' },
  { id: 'jermotuan_spawn_egg', label: 'Jermotuan Spawn Egg' },
  { id: 'jermotuary_block', label: 'Jermotuary Block' },
  { id: 'jermotubensis_ore', label: 'Jermotubensis Ore' },
  { id: 'jermotude_block', label: 'Jermotude Block' },
  { id: 'jermotudinal_pottery_sherd', label: 'Jermotudinal Pottery Sherd' },
  { id: 'jermotue_ore', label: 'Jermotue Ore' },
  { id: 'jermotuel_block', label: 'Jermotuel Block' },
  { id: 'jermotuen_spawn_egg', label: 'Jermotuen Spawn Egg' },
  { id: 'jermotuer_ore', label: 'Jermotuer Ore' },
  { id: 'jermotues_block', label: 'Jermotues Block' },
  { id: 'jermotuet_armor_trim_smithing_template', label: 'Jermotuet Armor Trim' },
  { id: 'jermotueu_ore', label: 'Jermotueu Ore' },
  { id: 'jermotuf_block', label: 'Jermotuf Block' },
  { id: 'jermotufa_ore', label: 'Jermotufa Ore' },
  { id: 'jermotufacious_block', label: 'Jermotufacious Block' },
  { id: 'jermotufaceous_spawn_egg', label: 'Jermotufaceous Spawn Egg' },
  { id: 'jermotufa_spawn_egg', label: 'Jermotufa Spawn Egg' },
  { id: 'jermotufai_block', label: 'Jermotufai Block' },
  { id: 'jermotufail_ore', label: 'Jermotufail Ore' },
  { id: 'jermotufain_block', label: 'Jermotufain Block' },
  { id: 'jermotufaine_spawn_egg', label: 'Jermotufaine Spawn Egg' },
  { id: 'jermotufair_ore', label: 'Jermotufair Ore' },
  { id: 'jermotufaire_block', label: 'Jermotufaire Block' },
  { id: 'jermotufait_armor_trim_smithing_template', label: 'Jermotufait Armor Trim' },
  { id: 'jermotufal_ore', label: 'Jermotufal Ore' },
  { id: 'jermotufals_block', label: 'Jermotufals Block' },
  { id: 'jermotufaly_spawn_egg', label: 'Jermotufaly Spawn Egg' },
  { id: 'jermotufan_block', label: 'Jermotufan Block' },
  { id: 'jermotufane_ore', label: 'Jermotufane Ore' },
  { id: 'jermotufaner_block', label: 'Jermotufaner Block' },
  { id: 'jermotufania_armor_trim_smithing_template', label: 'Jermotufania Armor Trim' },
  { id: 'jermotufanian_spawn_egg', label: 'Jermotufanian Spawn Egg' },
  { id: 'jermotufanids_ore', label: 'Jermotufanids Ore' },
  { id: 'jermotufans_block', label: 'Jermotufans Block' },
  { id: 'jermotufany_spawn_egg', label: 'Jermotufany Spawn Egg' },
  { id: 'jermotufaquo_block', label: 'Jermotufaquo Block' },
  { id: 'jermotufar_ore', label: 'Jermotufar Ore' },
  { id: 'jermotufara_block', label: 'Jermotufara Block' },
  { id: 'jermotufari_armor_trim_smithing_template', label: 'Jermotufari Armor Trim' },
  { id: 'jermotufarin_spawn_egg', label: 'Jermotufarin Spawn Egg' },
  { id: 'jermotufaris_ore', label: 'Jermotufaris Ore' },
  { id: 'jermotufarity_block', label: 'Jermotufarity Block' },
  { id: 'jermotufaro_spawn_egg', label: 'Jermotufaro Spawn Egg' },
  { id: 'jermotufarious_ore', label: 'Jermotufarious Ore' },
  { id: 'jermotufars_block', label: 'Jermotufars Block' },
  { id: 'jermotufart_armor_trim_smithing_template', label: 'Jermotufart Armor Trim' },
  { id: 'jermotufartian_spawn_egg', label: 'Jermotufartian Spawn Egg' },
  { id: 'jermotufarts_ore', label: 'Jermotufarts Ore' },
  { id: 'jermotufary_block', label: 'Jermotufary Block' },
  { id: 'jermotufas_spawn_egg', label: 'Jermotufas Spawn Egg' },
  { id: 'jermotufase_ore', label: 'Jermotufase Ore' },
  { id: 'jermotufat_block', label: 'Jermotufat Block' },
  { id: 'jermotufate_armor_trim_smithing_template', label: 'Jermotufate Armor Trim' },
  { id: 'jermotufater_spawn_egg', label: 'Jermotufater Spawn Egg' },
  { id: 'jermotufates_ore', label: 'Jermotufates Ore' },
  { id: 'jermotufati_block', label: 'Jermotufati Block' },
  { id: 'jermotufatian_spawn_egg', label: 'Jermotufatian Spawn Egg' },
  { id: 'jermotufatis_ore', label: 'Jermotufatis Ore' },
  { id: 'jermotufatio_block', label: 'Jermotufatio Block' },
  { id: 'jermotufation_armor_trim_smithing_template', label: 'Jermotufation Armor Trim' },
  { id: 'jermotufatious_spawn_egg', label: 'Jermotufatious Spawn Egg' },
  { id: 'jermotufatir_ore', label: 'Jermotufatir Ore' },
  { id: 'jermotufatis_block', label: 'Jermotufatis Block' },
  { id: 'jermotufator_spawn_egg', label: 'Jermotufator Spawn Egg' },
  { id: 'jermotufatory_ore', label: 'Jermotufatory Ore' },
  { id: 'jermotufatube_block', label: 'Jermotufatube Block' },
  { id: 'jermotufatusly_armor_trim_smithing_template', label: 'Jermotufatusly Armor Trim' },
  { id: 'jermotufatur_spawn_egg', label: 'Jermotufatur Spawn Egg' },
  { id: 'jermotufaturae_ore', label: 'Jermotufaturae Ore' },
  { id: 'jermotufaturae_block', label: 'Jermotufaturae Block' },
  { id: 'jermotufaturae_spawn_egg', label: 'Jermotufaturae Spawn Egg' },
  { id: 'jermotufature_ore', label: 'Jermotufature Ore' },
  { id: 'jermotufaturea_block', label: 'Jermotufaturea Block' },
  { id: 'jermotufaturef_armor_trim_smithing_template', label: 'Jermotufaturef Armor Trim' },
  { id: 'jermotufaturefd_spawn_egg', label: 'Jermotufaturefd Spawn Egg' },
  { id: 'jermotufaturefs_ore', label: 'Jermotufaturefs Ore' },
  { id: 'jermotufaturet_block', label: 'Jermotufaturet Block' },
  { id: 'jermotufaturely_spawn_egg', label: 'Jermotufaturely Spawn Egg' },
  { id: 'jermotufatures_ore', label: 'Jermotufatures Ore' },
  { id: 'jermotufatury_block', label: 'Jermotufatury Block' },
  { id: 'jermotufaty_armor_trim_smithing_template', label: 'Jermotufaty Armor Trim' },
  { id: 'jermotufau_spawn_egg', label: 'Jermotufau Spawn Egg' },
  { id: 'jermotufaua_ore', label: 'Jermotufaua Ore' },
  { id: 'jermotufauae_block', label: 'Jermotufauae Block' },
  { id: 'jermotufaual_spawn_egg', label: 'Jermotufaual Spawn Egg' },
  { id: 'jermotufaually_ore', label: 'Jermotufaually Ore' },
  { id: 'jermotufauar_block', label: 'Jermotufauar Block' },
  { id: 'jermotufauari_armor_trim_smithing_template', label: 'Jermotufauari Armor Trim' },
  { id: 'jermotufauarian_spawn_egg', label: 'Jermotufauarian Spawn Egg' },
  { id: 'jermotufauarianus_ore', label: 'Jermotufauarianus Ore' },
  { id: 'jermotufauariany_block', label: 'Jermotufauariany Block' },
  { id: 'jermotufauaris_spawn_egg', label: 'Jermotufauaris Spawn Egg' },
  { id: 'jermotufauarity_ore', label: 'Jermotufauarity Ore' },
  { id: 'jermotufauaro_block', label: 'Jermotufauaro Block' },
  { id: 'jermotufauars_armor_trim_smithing_template', label: 'Jermotufauars Armor Trim' },
  { id: 'jermotufauart_spawn_egg', label: 'Jermotufauart Spawn Egg' },
  { id: 'jermotufauarte_ore', label: 'Jermotufauarte Ore' },
  { id: 'jermotufauartel_block', label: 'Jermotufauartel Block' },
  { id: 'jermotufauartena_spawn_egg', label: 'Jermotufauartena Spawn Egg' },
  { id: 'jermotufauartene_ore', label: 'Jermotufauartene Ore' },
  { id: 'jermotufauartenous_block', label: 'Jermotufauartenous Block' },
  { id: 'jermotufauarten_spawn_egg', label: 'Jermotufauarten Spawn Egg' },
  { id: 'jermotufauartena_ore', label: 'Jermotufauartena Ore' },
  { id: 'jermotufauartenally_block', label: 'Jermotufauartenally Block' },
  { id: 'jermotufauarten_spawn_egg', label: 'Jermotufauarten Spawn Egg' },
  { id: 'jermotufauartenei_ore', label: 'Jermotufauartenei Ore' },
  { id: 'jermotufauartenel_block', label: 'Jermotufauartenel Block' },
  { id: 'jermotufauartenia_armor_trim_smithing_template', label: 'Jermotufauartenia Armor Trim' },
  { id: 'jermotufauartensai_spawn_egg', label: 'Jermotufauartensai Spawn Egg' },
  { id: 'jermotufauartenses_ore', label: 'Jermotufauartenses Ore' },
  { id: 'jermotufauarteness_block', label: 'Jermotufauarteness Block' },
  { id: 'jermotufauartenese_spawn_egg', label: 'Jermotufauartenese Spawn Egg' },
  { id: 'jermotufauartenesia_ore', label: 'Jermotufauartenesia Ore' },
  { id: 'jermotufauartenesian_block', label: 'Jermotufauartenesian Block' },
  { id: 'jermotufauartenesis_armor_trim_smithing_template', label: 'Jermotufauartenesis Armor Trim' },
  { id: 'jermotufauartensium_spawn_egg', label: 'Jermotufauartensium Spawn Egg' },
  { id: 'jermotufauartent_ore', label: 'Jermotufauartent Ore' },
  { id: 'jermotufauartenta_block', label: 'Jermotufauartenta Block' },
  { id: 'jermotufauartental_spawn_egg', label: 'Jermotufauartental Spawn Egg' },
  { id: 'jermotufauartentalae_ore', label: 'Jermotufauartentalae Ore' },
  { id: 'jermotufauartentalae_block', label: 'Jermotufauartentalae Block' },
  { id: 'jermotufauartentalae_spawn_egg', label: 'Jermotufauartentalae Spawn Egg' },
];

export const RconSection = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
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
    fetchPlayers();
    fetchWhitelist();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/client/rcon/players', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.players) {
        const playerList = data.players
          .split('\n')
          .filter((p: string) => p.trim() && p.includes(':'))
          .map((p: string) => p.split(':')[1]?.trim())
          .filter(Boolean);
        setPlayers(playerList);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchWhitelist = async () => {
    try {
      const res = await fetch('/api/client/rcon/whitelist', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWhitelist(data.whitelist || []);
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    }
  };

  const giveItem = async () => {
    if (!selectedPlayer) {
      setMessage('Please select a player');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/rcon/give-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ player: selectedPlayer, item, amount: parseInt(amount) || 1 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Gave ${amount} ${item} to ${selectedPlayer}`);
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
    if (!selectedPlayer) {
      setMessage('Please select a player');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/rcon/teleport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ player: selectedPlayer, x: parseInt(x) || 0, y: parseInt(y) || 64, z: parseInt(z) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Teleported ${selectedPlayer} to (${x}, ${y}, ${z})`);
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
      const res = await fetch('/api/client/rcon/restart', { method: 'POST', credentials: 'include' });
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
      const res = await fetch('/api/client/rcon/whitelist/add', {
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
      const res = await fetch('/api/client/rcon/whitelist/remove', {
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
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Active Players</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            style={selectStyles.select}
          >
            <option value="">Select player...</option>
            {players.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            onClick={fetchPlayers}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(184,115,51,0.2)',
              border: '1px solid #b87333',
              color: '#d4a373',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            Refresh
          </button>
        </div>
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
          disabled={loading || !selectedPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid #b87333',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !selectedPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedPlayer ? 0.6 : 1
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
          disabled={loading || !selectedPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid #b87333',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !selectedPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedPlayer ? 0.6 : 1
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
