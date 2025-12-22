export interface OutdoorActivity {
  id: string;
  name: string;
  category: OutdoorCategory;
  icon: "sun" | "compass" | "activity" | "heart" | "zap" | "map" | "cloud" | "droplet" | "eye" | "target" | "feather" | "wind" | "star" | "music";
  points: number;
  duration: string;
  description: string;
  equipment?: string[];
}

export type OutdoorCategory =
  | "active_play"
  | "nature_exploration"
  | "sports"
  | "creative_outdoor"
  | "water_activities"
  | "adventure"
  | "relaxation"
  | "seasonal"
  | "social_games"
  | "fitness";

export const OUTDOOR_CATEGORIES: Record<OutdoorCategory, { name: string; icon: string; color: string }> = {
  active_play: { name: "Active Play", icon: "zap", color: "#EF4444" },
  nature_exploration: { name: "Nature Explorer", icon: "compass", color: "#10B981" },
  sports: { name: "Sports & Games", icon: "activity", color: "#3B82F6" },
  creative_outdoor: { name: "Creative Outside", icon: "sun", color: "#F59E0B" },
  water_activities: { name: "Water Fun", icon: "droplet", color: "#0EA5E9" },
  adventure: { name: "Adventure", icon: "map", color: "#8B5CF6" },
  relaxation: { name: "Chill Time", icon: "cloud", color: "#14B8A6" },
  seasonal: { name: "Seasonal Fun", icon: "star", color: "#EC4899" },
  social_games: { name: "Social Games", icon: "heart", color: "#6366F1" },
  fitness: { name: "Fitness", icon: "target", color: "#84CC16" },
};

export const ALL_OUTDOOR_ACTIVITIES: OutdoorActivity[] = [
  { id: "tag", name: "Play Tag", category: "active_play", icon: "zap", points: 20, duration: "15-30 min", description: "Classic game of tag with friends or family" },
  { id: "hide_seek", name: "Hide and Seek", category: "active_play", icon: "eye", points: 20, duration: "20-40 min", description: "Find the best hiding spots!" },
  { id: "red_light", name: "Red Light Green Light", category: "active_play", icon: "zap", points: 15, duration: "15-20 min", description: "Freeze when you hear red light!" },
  { id: "simon_says", name: "Simon Says", category: "active_play", icon: "zap", points: 15, duration: "10-20 min", description: "Follow the leader's commands" },
  { id: "jump_rope", name: "Jump Rope", category: "active_play", icon: "activity", points: 25, duration: "15-30 min", description: "Practice your jump rope skills", equipment: ["jump rope"] },
  { id: "hula_hoop", name: "Hula Hoop", category: "active_play", icon: "activity", points: 20, duration: "15-20 min", description: "Keep the hoop spinning!", equipment: ["hula hoop"] },
  { id: "hopscotch", name: "Hopscotch", category: "active_play", icon: "target", points: 20, duration: "15-30 min", description: "Hop through the squares", equipment: ["chalk"] },
  { id: "frisbee", name: "Play Frisbee", category: "active_play", icon: "target", points: 20, duration: "20-30 min", description: "Throw and catch the disc", equipment: ["frisbee"] },
  { id: "balloon_games", name: "Balloon Games", category: "active_play", icon: "wind", points: 15, duration: "15-20 min", description: "Keep the balloon in the air", equipment: ["balloons"] },
  { id: "obstacle_course", name: "Obstacle Course", category: "active_play", icon: "zap", points: 30, duration: "20-40 min", description: "Run through a backyard obstacle course" },

  { id: "nature_walk", name: "Nature Walk", category: "nature_exploration", icon: "compass", points: 25, duration: "30-60 min", description: "Explore and observe nature" },
  { id: "bird_watching", name: "Bird Watching", category: "nature_exploration", icon: "eye", points: 20, duration: "20-40 min", description: "Spot and identify different birds" },
  { id: "bug_hunt", name: "Bug Hunt", category: "nature_exploration", icon: "eye", points: 20, duration: "20-30 min", description: "Find and observe insects" },
  { id: "leaf_collect", name: "Collect Leaves", category: "nature_exploration", icon: "feather", points: 15, duration: "20-30 min", description: "Gather different types of leaves" },
  { id: "rock_collect", name: "Rock Collecting", category: "nature_exploration", icon: "map", points: 15, duration: "20-30 min", description: "Find interesting rocks" },
  { id: "cloud_watch", name: "Cloud Watching", category: "nature_exploration", icon: "cloud", points: 15, duration: "15-30 min", description: "Find shapes in the clouds" },
  { id: "stargazing", name: "Stargazing", category: "nature_exploration", icon: "star", points: 25, duration: "30-60 min", description: "Look at the stars at night" },
  { id: "plant_flowers", name: "Plant Flowers", category: "nature_exploration", icon: "sun", points: 25, duration: "30-45 min", description: "Plant seeds or flowers", equipment: ["seeds", "soil", "pot"] },
  { id: "nature_journal", name: "Nature Journal", category: "nature_exploration", icon: "feather", points: 20, duration: "20-30 min", description: "Draw or write about nature", equipment: ["notebook", "pencil"] },
  { id: "scavenger_hunt", name: "Nature Scavenger Hunt", category: "nature_exploration", icon: "map", points: 30, duration: "30-45 min", description: "Find items on your nature list" },

  { id: "soccer", name: "Play Soccer", category: "sports", icon: "activity", points: 30, duration: "30-60 min", description: "Kick the ball around", equipment: ["soccer ball"] },
  { id: "basketball", name: "Play Basketball", category: "sports", icon: "activity", points: 30, duration: "30-60 min", description: "Shoot some hoops", equipment: ["basketball", "hoop"] },
  { id: "baseball_catch", name: "Play Catch", category: "sports", icon: "activity", points: 20, duration: "15-30 min", description: "Throw and catch a ball", equipment: ["ball", "gloves"] },
  { id: "tennis", name: "Play Tennis", category: "sports", icon: "activity", points: 30, duration: "30-60 min", description: "Hit the ball over the net", equipment: ["racket", "tennis ball"] },
  { id: "badminton", name: "Play Badminton", category: "sports", icon: "activity", points: 25, duration: "20-40 min", description: "Hit the birdie back and forth", equipment: ["rackets", "shuttlecock"] },
  { id: "golf", name: "Mini Golf", category: "sports", icon: "activity", points: 25, duration: "30-60 min", description: "Practice putting", equipment: ["putter", "golf ball"] },
  { id: "football", name: "Throw Football", category: "sports", icon: "activity", points: 25, duration: "20-40 min", description: "Practice throwing a football", equipment: ["football"] },
  { id: "kickball", name: "Play Kickball", category: "sports", icon: "activity", points: 25, duration: "30-45 min", description: "Like baseball but with kicking", equipment: ["kickball"] },
  { id: "volleyball", name: "Play Volleyball", category: "sports", icon: "activity", points: 30, duration: "30-60 min", description: "Bump, set, spike!", equipment: ["volleyball", "net"] },
  { id: "t_ball", name: "T-Ball Practice", category: "sports", icon: "activity", points: 25, duration: "20-40 min", description: "Practice hitting off a tee", equipment: ["bat", "ball", "tee"] },

  { id: "chalk_art", name: "Sidewalk Chalk Art", category: "creative_outdoor", icon: "sun", points: 20, duration: "30-60 min", description: "Create colorful art on pavement", equipment: ["sidewalk chalk"] },
  { id: "bubble_blowing", name: "Blow Bubbles", category: "creative_outdoor", icon: "wind", points: 15, duration: "15-30 min", description: "Make giant bubbles!", equipment: ["bubble solution", "wand"] },
  { id: "kite_flying", name: "Fly a Kite", category: "creative_outdoor", icon: "wind", points: 25, duration: "30-60 min", description: "Let your kite soar high", equipment: ["kite"] },
  { id: "sand_castle", name: "Build Sand Castle", category: "creative_outdoor", icon: "sun", points: 25, duration: "30-60 min", description: "Create a sand masterpiece", equipment: ["bucket", "shovel"] },
  { id: "mud_pies", name: "Make Mud Pies", category: "creative_outdoor", icon: "sun", points: 15, duration: "20-30 min", description: "Get messy with mud creations" },
  { id: "paint_rocks", name: "Paint Rocks", category: "creative_outdoor", icon: "sun", points: 20, duration: "30-45 min", description: "Decorate rocks with paint", equipment: ["rocks", "paint", "brushes"] },
  { id: "nature_craft", name: "Nature Craft", category: "creative_outdoor", icon: "feather", points: 25, duration: "30-45 min", description: "Make art with nature items" },
  { id: "outdoor_music", name: "Outdoor Music", category: "creative_outdoor", icon: "music", points: 20, duration: "20-30 min", description: "Make music outside", equipment: ["instruments"] },
  { id: "photography", name: "Nature Photography", category: "creative_outdoor", icon: "eye", points: 20, duration: "20-40 min", description: "Take photos of nature" },
  { id: "fort_building", name: "Build a Fort", category: "creative_outdoor", icon: "map", points: 30, duration: "45-90 min", description: "Construct an outdoor fort" },

  { id: "swimming", name: "Go Swimming", category: "water_activities", icon: "droplet", points: 35, duration: "30-90 min", description: "Swim in a pool or lake" },
  { id: "sprinkler", name: "Run Through Sprinklers", category: "water_activities", icon: "droplet", points: 20, duration: "20-30 min", description: "Cool off in the sprinklers" },
  { id: "water_balloon", name: "Water Balloon Fight", category: "water_activities", icon: "droplet", points: 25, duration: "20-30 min", description: "Have a splash battle", equipment: ["water balloons"] },
  { id: "water_guns", name: "Water Gun Fun", category: "water_activities", icon: "droplet", points: 25, duration: "20-40 min", description: "Have a water gun battle", equipment: ["water guns"] },
  { id: "slip_slide", name: "Slip and Slide", category: "water_activities", icon: "droplet", points: 30, duration: "30-45 min", description: "Slide across wet plastic", equipment: ["slip and slide"] },
  { id: "fishing", name: "Go Fishing", category: "water_activities", icon: "droplet", points: 30, duration: "60-120 min", description: "Try to catch some fish", equipment: ["fishing rod", "bait"] },
  { id: "boat_ride", name: "Boat Ride", category: "water_activities", icon: "droplet", points: 30, duration: "30-90 min", description: "Go for a boat ride" },
  { id: "paddling", name: "Kayak/Canoe", category: "water_activities", icon: "droplet", points: 35, duration: "45-90 min", description: "Paddle on the water" },

  { id: "hiking", name: "Go Hiking", category: "adventure", icon: "map", points: 35, duration: "60-180 min", description: "Explore trails and paths" },
  { id: "camping", name: "Backyard Camping", category: "adventure", icon: "map", points: 40, duration: "Overnight", description: "Camp in the backyard", equipment: ["tent", "sleeping bag"] },
  { id: "geocaching", name: "Geocaching", category: "adventure", icon: "map", points: 35, duration: "45-90 min", description: "Find hidden treasures using GPS" },
  { id: "tree_climbing", name: "Climb a Tree", category: "adventure", icon: "compass", points: 25, duration: "15-30 min", description: "Safely climb a tree" },
  { id: "treasure_hunt", name: "Treasure Hunt", category: "adventure", icon: "map", points: 30, duration: "30-60 min", description: "Follow clues to find treasure" },
  { id: "explore_park", name: "Explore a New Park", category: "adventure", icon: "compass", points: 30, duration: "45-90 min", description: "Visit and explore a new park" },
  { id: "bike_ride", name: "Bike Ride", category: "adventure", icon: "activity", points: 30, duration: "30-60 min", description: "Go on a bike adventure", equipment: ["bike", "helmet"] },
  { id: "scooter", name: "Scooter Ride", category: "adventure", icon: "activity", points: 25, duration: "20-40 min", description: "Ride your scooter", equipment: ["scooter", "helmet"] },
  { id: "skateboard", name: "Skateboarding", category: "adventure", icon: "activity", points: 30, duration: "30-60 min", description: "Practice skateboard tricks", equipment: ["skateboard", "helmet", "pads"] },
  { id: "roller_skating", name: "Roller Skating", category: "adventure", icon: "activity", points: 30, duration: "30-60 min", description: "Skate around", equipment: ["skates", "helmet", "pads"] },

  { id: "hammock", name: "Relax in Hammock", category: "relaxation", icon: "cloud", points: 15, duration: "20-40 min", description: "Swing in a hammock", equipment: ["hammock"] },
  { id: "read_outside", name: "Read Outside", category: "relaxation", icon: "cloud", points: 20, duration: "30-60 min", description: "Read a book outdoors", equipment: ["book"] },
  { id: "picnic", name: "Have a Picnic", category: "relaxation", icon: "sun", points: 25, duration: "45-90 min", description: "Eat a meal outside", equipment: ["blanket", "food"] },
  { id: "mindful_walk", name: "Mindful Walk", category: "relaxation", icon: "cloud", points: 20, duration: "15-30 min", description: "Walk slowly and notice everything" },
  { id: "listen_nature", name: "Listen to Nature", category: "relaxation", icon: "feather", points: 15, duration: "10-20 min", description: "Sit quietly and listen" },
  { id: "yoga_outside", name: "Outdoor Yoga", category: "relaxation", icon: "cloud", points: 25, duration: "20-40 min", description: "Do yoga in the fresh air" },
  { id: "nap_outside", name: "Nap Outside", category: "relaxation", icon: "cloud", points: 15, duration: "20-40 min", description: "Take a peaceful outdoor nap" },

  { id: "snow_angels", name: "Make Snow Angels", category: "seasonal", icon: "star", points: 15, duration: "10-20 min", description: "Leave your mark in the snow" },
  { id: "snowman", name: "Build a Snowman", category: "seasonal", icon: "star", points: 25, duration: "30-60 min", description: "Create a snowy friend" },
  { id: "sledding", name: "Go Sledding", category: "seasonal", icon: "star", points: 30, duration: "30-60 min", description: "Slide down snowy hills", equipment: ["sled"] },
  { id: "snowball_fight", name: "Snowball Fight", category: "seasonal", icon: "star", points: 20, duration: "20-30 min", description: "Friendly snow battle" },
  { id: "ice_skating", name: "Ice Skating", category: "seasonal", icon: "star", points: 35, duration: "45-90 min", description: "Glide on the ice", equipment: ["ice skates"] },
  { id: "fall_leaves", name: "Jump in Leaves", category: "seasonal", icon: "feather", points: 20, duration: "15-30 min", description: "Play in the fall leaves" },
  { id: "pumpkin_patch", name: "Visit Pumpkin Patch", category: "seasonal", icon: "star", points: 30, duration: "60-120 min", description: "Pick out pumpkins" },
  { id: "spring_flowers", name: "Find Spring Flowers", category: "seasonal", icon: "feather", points: 20, duration: "20-40 min", description: "Look for new blooms" },

  { id: "four_square", name: "Four Square", category: "social_games", icon: "heart", points: 25, duration: "20-40 min", description: "Bounce the ball in squares", equipment: ["ball"] },
  { id: "duck_duck_goose", name: "Duck Duck Goose", category: "social_games", icon: "heart", points: 15, duration: "15-30 min", description: "Classic circle game" },
  { id: "capture_flag", name: "Capture the Flag", category: "social_games", icon: "map", points: 30, duration: "30-60 min", description: "Team strategy game", equipment: ["flags"] },
  { id: "freeze_dance", name: "Freeze Dance", category: "social_games", icon: "music", points: 20, duration: "15-30 min", description: "Dance and freeze!", equipment: ["music player"] },
  { id: "relay_race", name: "Relay Races", category: "social_games", icon: "zap", points: 25, duration: "20-40 min", description: "Team relay competitions" },
  { id: "sardines", name: "Sardines", category: "social_games", icon: "heart", points: 20, duration: "20-40 min", description: "Reverse hide and seek" },
  { id: "mother_may_i", name: "Mother May I", category: "social_games", icon: "heart", points: 15, duration: "15-25 min", description: "Ask permission to move forward" },
  { id: "marco_polo", name: "Marco Polo", category: "social_games", icon: "droplet", points: 20, duration: "20-30 min", description: "Pool game of sound" },

  { id: "running", name: "Go Running", category: "fitness", icon: "target", points: 30, duration: "15-45 min", description: "Run around the neighborhood" },
  { id: "walking", name: "Take a Walk", category: "fitness", icon: "target", points: 20, duration: "20-40 min", description: "Walk around the block" },
  { id: "jumping_jacks", name: "Jumping Jacks", category: "fitness", icon: "zap", points: 15, duration: "10-15 min", description: "Do jumping jacks" },
  { id: "push_ups", name: "Push-Ups", category: "fitness", icon: "target", points: 15, duration: "10-15 min", description: "Do push-ups outside" },
  { id: "stretching", name: "Outdoor Stretching", category: "fitness", icon: "target", points: 15, duration: "10-20 min", description: "Stretch in the fresh air" },
  { id: "dance_party", name: "Outdoor Dance Party", category: "fitness", icon: "music", points: 25, duration: "20-40 min", description: "Dance outside", equipment: ["music player"] },
  { id: "jogging", name: "Go Jogging", category: "fitness", icon: "target", points: 25, duration: "20-40 min", description: "Jog around the neighborhood" },
  { id: "sports_drills", name: "Sports Drills", category: "fitness", icon: "activity", points: 25, duration: "20-40 min", description: "Practice sports skills" },
];

export function getActivitiesByCategory(category: OutdoorCategory): OutdoorActivity[] {
  return ALL_OUTDOOR_ACTIVITIES.filter(activity => activity.category === category);
}
