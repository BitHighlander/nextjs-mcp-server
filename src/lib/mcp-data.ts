import Redis from 'ioredis';

// Define types for session data
interface SessionData {
  controller?: ReadableStreamDefaultController;
  initialized?: boolean;
  [key: string]: unknown;
}

// Initialize Redis client
const redisUrl = process.env.REDIS_CONNECTION || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

// In-memory controller mapping for current server instance
const controllers = new Map<string, ReadableStreamDefaultController>();

// Session management with Redis
export const sessions = {
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redis.get(`session:${sessionId}`);
      if (!sessionData) return null;
      
      // Retrieve the parsed session data
      const parsedSession = JSON.parse(sessionData) as SessionData;
      
      // Add the controller from in-memory mapping if it exists
      if (controllers.has(sessionId)) {
        parsedSession.controller = controllers.get(sessionId);
      }
      
      return parsedSession;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },
  
  async set(sessionId: string, sessionData: SessionData): Promise<boolean> {
    try {
      // Store controller separately in memory since it can't be serialized
      if (sessionData.controller) {
        controllers.set(sessionId, sessionData.controller);
        
        // Create a copy of session data without the controller for Redis storage
        const serializableSession = { ...sessionData };
        delete serializableSession.controller;
        
        // Set with an expiration of 1 hour
        await redis.set(`session:${sessionId}`, JSON.stringify(serializableSession), 'EX', 3600);
      } else {
        // Store the session data as is
        await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', 3600);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },
  
  async delete(sessionId: string): Promise<boolean> {
    try {
      // Remove from both Redis and memory
      await redis.del(`session:${sessionId}`);
      controllers.delete(sessionId);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  },
  
  async keys(): Promise<string[]> {
    try {
      const keys = await redis.keys('session:*');
      return keys.map(key => key.replace('session:', ''));
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  },
  
  // For local development testing - check if both Redis and memory have the session
  async has(sessionId: string): Promise<boolean> {
    try {
      const exists = await redis.exists(`session:${sessionId}`);
      return exists === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
};

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