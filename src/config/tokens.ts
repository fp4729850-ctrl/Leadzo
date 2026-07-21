export const TOKEN_COSTS = {
  // Chat / Messages
  BASIC_TEXT_REPLY: 1, // Basic AI response (e.g., standard customer query)
  ADVANCED_TEXT_REPLY: 5, // Complex reasoning or GPT-4 level response
  
  // File / Media Processing
  IMAGE_ANALYSIS: 5, // Reading an image sent by the customer (Vision API)
  VOICE_PROCESSING: 3, // Converting voice notes to text and processing
  
  // Advanced Features
  KNOWLEDGE_BASE_SEARCH: 2, // Searching through custom uploaded PDFs/Docs (RAG)
  BROADCAST_MESSAGE: 1, // Sending bulk promotional messages (cost per user)
  
  // Free actions
  HUMAN_HANDOFF: 0, // Pausing AI to chat manually
};

export type TokenAction = keyof typeof TOKEN_COSTS;
