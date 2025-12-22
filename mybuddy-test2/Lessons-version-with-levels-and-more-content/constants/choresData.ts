export interface Chore {
  id: string;
  name: string;
  category: ChoreCategory;
  icon: "home" | "droplet" | "trash-2" | "shirt" | "coffee" | "tool" | "heart" | "book" | "sun" | "moon" | "star" | "check-circle" | "award";
  points: number;
  ageMin: number;
  description: string;
}

export type ChoreCategory = 
  | "personal_hygiene"
  | "bedroom"
  | "kitchen"
  | "laundry"
  | "cleaning"
  | "outdoor"
  | "pet_care"
  | "helping_family"
  | "organization"
  | "responsibility";

export const CHORE_CATEGORIES: Record<ChoreCategory, { name: string; icon: string; color: string }> = {
  personal_hygiene: { name: "Personal Hygiene", icon: "droplet", color: "#3B82F6" },
  bedroom: { name: "Bedroom", icon: "home", color: "#8B5CF6" },
  kitchen: { name: "Kitchen", icon: "coffee", color: "#F59E0B" },
  laundry: { name: "Laundry", icon: "shirt", color: "#EC4899" },
  cleaning: { name: "Cleaning", icon: "trash-2", color: "#10B981" },
  outdoor: { name: "Outdoor Chores", icon: "sun", color: "#84CC16" },
  pet_care: { name: "Pet Care", icon: "heart", color: "#EF4444" },
  helping_family: { name: "Helping Family", icon: "star", color: "#6366F1" },
  organization: { name: "Organization", icon: "book", color: "#14B8A6" },
  responsibility: { name: "Responsibility", icon: "award", color: "#D97706" },
};

export const ALL_CHORES: Chore[] = [
  { id: "brush_teeth_morning", name: "Brush teeth (morning)", category: "personal_hygiene", icon: "droplet", points: 10, ageMin: 3, description: "Brush your teeth after waking up" },
  { id: "brush_teeth_night", name: "Brush teeth (night)", category: "personal_hygiene", icon: "droplet", points: 10, ageMin: 3, description: "Brush your teeth before bed" },
  { id: "wash_hands", name: "Wash hands regularly", category: "personal_hygiene", icon: "droplet", points: 5, ageMin: 3, description: "Wash hands before meals and after bathroom" },
  { id: "take_bath", name: "Take a bath/shower", category: "personal_hygiene", icon: "droplet", points: 15, ageMin: 4, description: "Get clean with a bath or shower" },
  { id: "comb_hair", name: "Comb/brush hair", category: "personal_hygiene", icon: "droplet", points: 5, ageMin: 4, description: "Keep your hair neat and tidy" },
  { id: "get_dressed", name: "Get dressed by yourself", category: "personal_hygiene", icon: "shirt", points: 10, ageMin: 4, description: "Pick out and put on your clothes" },
  { id: "wash_face", name: "Wash face", category: "personal_hygiene", icon: "droplet", points: 5, ageMin: 4, description: "Wash your face in the morning" },
  { id: "clip_nails", name: "Clip fingernails", category: "personal_hygiene", icon: "tool", points: 10, ageMin: 8, description: "Keep nails trimmed and clean" },
  { id: "floss_teeth", name: "Floss teeth", category: "personal_hygiene", icon: "droplet", points: 10, ageMin: 6, description: "Floss between your teeth" },
  { id: "apply_deodorant", name: "Apply deodorant", category: "personal_hygiene", icon: "droplet", points: 5, ageMin: 10, description: "Stay fresh with deodorant" },

  { id: "make_bed", name: "Make your bed", category: "bedroom", icon: "home", points: 15, ageMin: 4, description: "Make your bed every morning" },
  { id: "put_away_clothes", name: "Put away clothes", category: "bedroom", icon: "shirt", points: 15, ageMin: 4, description: "Put clean clothes in drawers or closet" },
  { id: "pick_up_toys", name: "Pick up toys", category: "bedroom", icon: "home", points: 10, ageMin: 3, description: "Put toys back where they belong" },
  { id: "clean_room", name: "Clean your room", category: "bedroom", icon: "home", points: 25, ageMin: 6, description: "Tidy up your entire room" },
  { id: "organize_bookshelf", name: "Organize bookshelf", category: "bedroom", icon: "book", points: 15, ageMin: 6, description: "Arrange books neatly on the shelf" },
  { id: "dust_furniture", name: "Dust furniture", category: "bedroom", icon: "home", points: 15, ageMin: 8, description: "Dust your dresser and nightstand" },
  { id: "vacuum_room", name: "Vacuum your room", category: "bedroom", icon: "home", points: 20, ageMin: 8, description: "Vacuum the floor in your room" },
  { id: "change_sheets", name: "Change bed sheets", category: "bedroom", icon: "home", points: 20, ageMin: 10, description: "Put clean sheets on your bed" },
  { id: "organize_closet", name: "Organize closet", category: "bedroom", icon: "home", points: 25, ageMin: 10, description: "Keep your closet neat and organized" },
  { id: "clean_under_bed", name: "Clean under bed", category: "bedroom", icon: "home", points: 15, ageMin: 8, description: "Clean out from under your bed" },

  { id: "set_table", name: "Set the table", category: "kitchen", icon: "coffee", points: 15, ageMin: 5, description: "Set plates and utensils for meals" },
  { id: "clear_table", name: "Clear the table", category: "kitchen", icon: "coffee", points: 15, ageMin: 5, description: "Clear dishes after eating" },
  { id: "rinse_dishes", name: "Rinse dishes", category: "kitchen", icon: "coffee", points: 10, ageMin: 6, description: "Rinse dishes before loading" },
  { id: "load_dishwasher", name: "Load dishwasher", category: "kitchen", icon: "coffee", points: 20, ageMin: 8, description: "Load dirty dishes into dishwasher" },
  { id: "unload_dishwasher", name: "Unload dishwasher", category: "kitchen", icon: "coffee", points: 20, ageMin: 8, description: "Put clean dishes away" },
  { id: "wash_dishes", name: "Wash dishes by hand", category: "kitchen", icon: "coffee", points: 25, ageMin: 10, description: "Wash dishes in the sink" },
  { id: "wipe_counters", name: "Wipe counters", category: "kitchen", icon: "coffee", points: 10, ageMin: 6, description: "Clean kitchen counters" },
  { id: "sweep_kitchen", name: "Sweep kitchen floor", category: "kitchen", icon: "coffee", points: 15, ageMin: 8, description: "Sweep the kitchen floor" },
  { id: "mop_kitchen", name: "Mop kitchen floor", category: "kitchen", icon: "coffee", points: 25, ageMin: 12, description: "Mop the kitchen floor" },
  { id: "empty_trash_kitchen", name: "Empty kitchen trash", category: "kitchen", icon: "trash-2", points: 15, ageMin: 8, description: "Take out the kitchen garbage" },
  { id: "put_groceries", name: "Put away groceries", category: "kitchen", icon: "coffee", points: 15, ageMin: 6, description: "Help put groceries away" },
  { id: "make_breakfast", name: "Make simple breakfast", category: "kitchen", icon: "coffee", points: 20, ageMin: 10, description: "Prepare a simple breakfast" },
  { id: "make_lunch", name: "Pack your lunch", category: "kitchen", icon: "coffee", points: 20, ageMin: 10, description: "Pack your own lunch" },
  { id: "clean_microwave", name: "Clean microwave", category: "kitchen", icon: "coffee", points: 15, ageMin: 10, description: "Wipe out the microwave" },
  { id: "clean_fridge", name: "Clean out fridge", category: "kitchen", icon: "coffee", points: 25, ageMin: 12, description: "Help clean the refrigerator" },

  { id: "put_dirty_laundry", name: "Put dirty clothes in hamper", category: "laundry", icon: "shirt", points: 10, ageMin: 4, description: "Put dirty clothes in the laundry basket" },
  { id: "sort_laundry", name: "Sort laundry", category: "laundry", icon: "shirt", points: 15, ageMin: 8, description: "Sort clothes by color" },
  { id: "load_washer", name: "Load washing machine", category: "laundry", icon: "shirt", points: 15, ageMin: 10, description: "Put clothes in the washer" },
  { id: "transfer_dryer", name: "Transfer to dryer", category: "laundry", icon: "shirt", points: 10, ageMin: 10, description: "Move clothes from washer to dryer" },
  { id: "fold_laundry", name: "Fold laundry", category: "laundry", icon: "shirt", points: 20, ageMin: 8, description: "Fold clean clothes neatly" },
  { id: "put_away_laundry", name: "Put away laundry", category: "laundry", icon: "shirt", points: 15, ageMin: 6, description: "Put folded clothes in drawers" },
  { id: "match_socks", name: "Match socks", category: "laundry", icon: "shirt", points: 10, ageMin: 5, description: "Pair up matching socks" },
  { id: "hang_clothes", name: "Hang up clothes", category: "laundry", icon: "shirt", points: 15, ageMin: 8, description: "Hang clothes in the closet" },
  { id: "iron_clothes", name: "Iron clothes", category: "laundry", icon: "shirt", points: 25, ageMin: 14, description: "Iron wrinkled clothes" },

  { id: "dust_living_room", name: "Dust living room", category: "cleaning", icon: "home", points: 20, ageMin: 8, description: "Dust furniture in the living room" },
  { id: "vacuum_living_room", name: "Vacuum living room", category: "cleaning", icon: "home", points: 25, ageMin: 10, description: "Vacuum the living room" },
  { id: "clean_bathroom_sink", name: "Clean bathroom sink", category: "cleaning", icon: "droplet", points: 15, ageMin: 8, description: "Wipe down the bathroom sink" },
  { id: "clean_bathroom_mirror", name: "Clean bathroom mirror", category: "cleaning", icon: "droplet", points: 10, ageMin: 8, description: "Clean the bathroom mirror" },
  { id: "clean_toilet", name: "Clean toilet", category: "cleaning", icon: "droplet", points: 25, ageMin: 12, description: "Clean the toilet bowl and seat" },
  { id: "empty_trash_bathroom", name: "Empty bathroom trash", category: "cleaning", icon: "trash-2", points: 10, ageMin: 6, description: "Empty the bathroom wastebasket" },
  { id: "empty_trash_bedroom", name: "Empty bedroom trash", category: "cleaning", icon: "trash-2", points: 10, ageMin: 6, description: "Empty the bedroom wastebasket" },
  { id: "take_out_trash", name: "Take trash to curb", category: "cleaning", icon: "trash-2", points: 20, ageMin: 10, description: "Take trash cans to the curb" },
  { id: "bring_trash_back", name: "Bring trash cans back", category: "cleaning", icon: "trash-2", points: 15, ageMin: 10, description: "Bring empty trash cans back" },
  { id: "clean_windows", name: "Clean windows", category: "cleaning", icon: "home", points: 25, ageMin: 12, description: "Wash the windows" },
  { id: "sweep_floors", name: "Sweep floors", category: "cleaning", icon: "home", points: 20, ageMin: 8, description: "Sweep the floors" },
  { id: "mop_floors", name: "Mop floors", category: "cleaning", icon: "home", points: 30, ageMin: 12, description: "Mop the floors" },

  { id: "water_plants", name: "Water plants", category: "outdoor", icon: "sun", points: 15, ageMin: 5, description: "Water indoor or outdoor plants" },
  { id: "pull_weeds", name: "Pull weeds", category: "outdoor", icon: "sun", points: 25, ageMin: 8, description: "Pull weeds from the garden" },
  { id: "rake_leaves", name: "Rake leaves", category: "outdoor", icon: "sun", points: 30, ageMin: 8, description: "Rake leaves in the yard" },
  { id: "sweep_porch", name: "Sweep porch/patio", category: "outdoor", icon: "sun", points: 15, ageMin: 8, description: "Sweep the porch or patio" },
  { id: "wash_car", name: "Help wash car", category: "outdoor", icon: "sun", points: 30, ageMin: 10, description: "Help wash the family car" },
  { id: "mow_lawn", name: "Mow the lawn", category: "outdoor", icon: "sun", points: 40, ageMin: 14, description: "Mow the grass" },
  { id: "shovel_snow", name: "Shovel snow", category: "outdoor", icon: "sun", points: 35, ageMin: 12, description: "Shovel snow from walkways" },
  { id: "pick_up_yard", name: "Pick up yard", category: "outdoor", icon: "sun", points: 20, ageMin: 6, description: "Pick up sticks and trash in yard" },
  { id: "get_mail", name: "Get the mail", category: "outdoor", icon: "sun", points: 10, ageMin: 6, description: "Bring in the mail" },
  { id: "bring_in_packages", name: "Bring in packages", category: "outdoor", icon: "sun", points: 10, ageMin: 8, description: "Bring packages inside" },

  { id: "feed_pet", name: "Feed pet", category: "pet_care", icon: "heart", points: 15, ageMin: 5, description: "Feed the family pet" },
  { id: "water_pet", name: "Give pet fresh water", category: "pet_care", icon: "heart", points: 10, ageMin: 5, description: "Fill pet's water bowl" },
  { id: "walk_dog", name: "Walk the dog", category: "pet_care", icon: "heart", points: 25, ageMin: 10, description: "Take the dog for a walk" },
  { id: "brush_pet", name: "Brush pet", category: "pet_care", icon: "heart", points: 15, ageMin: 8, description: "Brush your pet's fur" },
  { id: "clean_litter_box", name: "Clean litter box", category: "pet_care", icon: "heart", points: 25, ageMin: 12, description: "Scoop the cat's litter box" },
  { id: "clean_fish_tank", name: "Clean fish tank", category: "pet_care", icon: "heart", points: 30, ageMin: 10, description: "Help clean the fish tank" },
  { id: "play_with_pet", name: "Play with pet", category: "pet_care", icon: "heart", points: 15, ageMin: 4, description: "Spend time playing with pet" },
  { id: "clean_pet_area", name: "Clean pet's area", category: "pet_care", icon: "heart", points: 20, ageMin: 8, description: "Clean pet bed or cage" },

  { id: "help_sibling", name: "Help younger sibling", category: "helping_family", icon: "star", points: 20, ageMin: 6, description: "Help a younger sibling with something" },
  { id: "read_to_sibling", name: "Read to younger sibling", category: "helping_family", icon: "book", points: 20, ageMin: 7, description: "Read a book to a younger sibling" },
  { id: "help_cook", name: "Help cook dinner", category: "helping_family", icon: "coffee", points: 25, ageMin: 10, description: "Help prepare dinner" },
  { id: "carry_groceries", name: "Carry groceries", category: "helping_family", icon: "star", points: 15, ageMin: 8, description: "Help carry in groceries" },
  { id: "answer_door", name: "Answer the door politely", category: "helping_family", icon: "star", points: 10, ageMin: 8, description: "Answer the door properly" },
  { id: "answer_phone", name: "Answer the phone politely", category: "helping_family", icon: "star", points: 10, ageMin: 8, description: "Answer the phone properly" },
  { id: "run_errands", name: "Help with errands", category: "helping_family", icon: "star", points: 25, ageMin: 12, description: "Help run family errands" },
  { id: "babysit", name: "Help babysit", category: "helping_family", icon: "star", points: 35, ageMin: 12, description: "Help watch younger siblings" },

  { id: "organize_backpack", name: "Organize backpack", category: "organization", icon: "book", points: 15, ageMin: 6, description: "Keep your backpack organized" },
  { id: "organize_desk", name: "Organize desk", category: "organization", icon: "book", points: 15, ageMin: 8, description: "Keep your desk clean and organized" },
  { id: "organize_toys", name: "Organize toys", category: "organization", icon: "home", points: 20, ageMin: 5, description: "Sort and organize your toys" },
  { id: "prepare_clothes", name: "Prepare tomorrow's clothes", category: "organization", icon: "shirt", points: 10, ageMin: 6, description: "Pick out clothes for tomorrow" },
  { id: "pack_bag", name: "Pack bag for school", category: "organization", icon: "book", points: 15, ageMin: 6, description: "Pack your school bag" },
  { id: "maintain_calendar", name: "Update calendar", category: "organization", icon: "book", points: 10, ageMin: 10, description: "Keep track of schedule" },

  { id: "do_homework", name: "Complete homework", category: "responsibility", icon: "book", points: 30, ageMin: 6, description: "Finish all your homework" },
  { id: "practice_instrument", name: "Practice instrument", category: "responsibility", icon: "award", points: 25, ageMin: 6, description: "Practice your musical instrument" },
  { id: "read_30_min", name: "Read for 30 minutes", category: "responsibility", icon: "book", points: 25, ageMin: 6, description: "Read a book for 30 minutes" },
  { id: "be_on_time", name: "Be ready on time", category: "responsibility", icon: "award", points: 15, ageMin: 5, description: "Be ready when it's time to go" },
  { id: "say_please_thanks", name: "Use manners", category: "responsibility", icon: "star", points: 10, ageMin: 3, description: "Say please and thank you" },
  { id: "no_screen_limit", name: "Follow screen time limits", category: "responsibility", icon: "award", points: 20, ageMin: 5, description: "Stay within screen time limits" },
  { id: "go_bed_on_time", name: "Go to bed on time", category: "responsibility", icon: "moon", points: 15, ageMin: 4, description: "Go to bed when told" },
  { id: "wake_up_alarm", name: "Wake up to alarm", category: "responsibility", icon: "sun", points: 15, ageMin: 8, description: "Wake up with your alarm" },
  { id: "be_kind", name: "Do something kind", category: "responsibility", icon: "heart", points: 20, ageMin: 4, description: "Do a random act of kindness" },
  { id: "no_complaining", name: "Complete task without complaining", category: "responsibility", icon: "award", points: 15, ageMin: 5, description: "Do chores without whining" },
];

export function getChoresByAge(age: number): Chore[] {
  return ALL_CHORES.filter(chore => chore.ageMin <= age);
}

export function getChoresByCategory(category: ChoreCategory): Chore[] {
  return ALL_CHORES.filter(chore => chore.category === category);
}
