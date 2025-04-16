// Store active SSE sessions
export const sessions = new Map();

// House data
export const house = {
  description: "A lovely house with 5 rooms",
  rooms: [
    { id: 1, name: "Living Room", description: "A spacious room with a fireplace", hasItems: true, items: ["book", "remote"] },
    { id: 2, name: "Kitchen", description: "Modern kitchen with island", hasItems: true, items: ["key_to_bedroom", "apple"] },
    { id: 3, name: "Bedroom", description: "Master bedroom with bay windows", requiresKey: "key_to_bedroom", hasItems: true, items: ["pillow", "key_to_bathroom"] },
    { id: 4, name: "Bathroom", description: "Full bathroom with shower and tub", requiresKey: "key_to_bathroom", hasItems: true, items: ["soap", "key_to_secret_room"] },
    { id: 5, name: "Secret Room", description: "Password protected room", requiresPassword: true, requiresKey: "key_to_secret_room", hasItems: true, items: ["treasure"] }
  ],
  outside: {
    description: "You're standing outside a beautiful house. There's a front door leading inside."
  }
};

// Resources for the house
export const resources = {
  'house_layout': {
    id: 'house_layout',
    name: 'House Layout',
    description: 'A diagram of the house layout showing all rooms and connections',
    content: `
    House Layout:
    ┌─────────────┐     ┌─────────────┐
    │             │     │             │
    │  Bedroom    │────►│  Bathroom   │
    │   (3)       │     │   (4)       │
    │             │     │             │
    └─────┬───────┘     └─────┬───────┘
          │                   │
          ▼                   ▼
    ┌─────────────┐     ┌─────────────┐
    │             │     │             │
    │  Living Room│────►│  Kitchen    │
    │   (1)       │     │   (2)       │
    │             │     │             │
    └─────┬───────┘     └─────────────┘
          │
          ▼
    ┌─────────────┐
    │             │
    │ Secret Room │
    │   (5)       │
    │             │
    └─────────────┘
    `
  },
  'navigation_guide': {
    id: 'navigation_guide',
    name: 'Navigation Guide',
    description: 'Instructions on how to move between rooms',
    content: `
    Navigation Guide:
    
    1. To enter the house from outside, use 'house.enterHouse'
    2. To move between rooms, use 'house.goToRoom' with the room ID
    3. To go back to the previous room, use 'house.goBack'
    4. To exit the house, use 'house.goOutside'
    
    Room Access Requirements:
    - Bedroom (3): Requires "key_to_bedroom" from the Kitchen
    - Bathroom (4): Requires "key_to_bathroom" from the Bedroom
    - Secret Room (5): Requires "key_to_secret_room" from the Bathroom AND the password
    
    To get the password, use the 'getPassword' tool.
    To use the password, use 'house.usePassword' when in front of room 5.
    `
  },
  'house_history': {
    id: 'house_history',
    name: 'House History',
    description: 'The story and background of the mysterious house',
    content: `
    House History:
    
    This house was built in 1897 by the eccentric inventor Dr. Maxwell Blackwood. 
    
    Legend says that Dr. Blackwood hid his most valuable invention in the secret room, 
    accessible only to those who could solve his series of puzzles spread throughout the house.
    
    Many have tried to reach the secret room, but few have succeeded in finding all the 
    keys and discovering the password needed to enter.
    
    The house has remained untouched for decades, waiting for someone clever enough to 
    unlock its mysteries.
    `
  },
  'item_guide': {
    id: 'item_guide',
    name: 'Item Guide',
    description: 'Information about items that can be found in the house',
    content: `
    Item Guide:
    
    - book: Found in the Living Room. An old journal with clues about the house.
    - remote: Found in the Living Room. Seems to control something.
    - key_to_bedroom: Found in the Kitchen. Unlocks the Bedroom door.
    - apple: Found in the Kitchen. Looks fresh despite the house's age.
    - pillow: Found in the Bedroom. Comfy but ordinary.
    - key_to_bathroom: Found in the Bedroom. Unlocks the Bathroom door.
    - soap: Found in the Bathroom. Smells like lavender.
    - key_to_secret_room: Found in the Bathroom. Unlocks the Secret Room door.
    - treasure: Found in the Secret Room. Dr. Blackwood's greatest invention!
    
    To pick up an item, use 'game.pickupItem' with the item name.
    `
  }
};

// Game state (persistent between requests)
export const gameState = {
  currentLocation: "outside", // "outside" or room id (1-5)
  inventory: [],
  visited: ["outside"],
  previousLocation: null
}; 