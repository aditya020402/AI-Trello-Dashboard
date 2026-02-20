const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const ragService = require('./ragService');

// Initialize OpenAI model
let llm;
try {
  // Hardcoded API key
  const apiKey = 
  
  if (!apiKey) {
    console.warn('[Agent Orchestrator] OPENAI_API_KEY not available');
    llm = null;
  } else {
    llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      openAIApiKey: 
    });
    console.log('[Agent Orchestrator] LLM initialized successfully with hardcoded API key');
  }
} catch (err) {
  console.error('[Agent Orchestrator] Failed to initialize LLM:', err.message);
  llm = null;
}

if (!llm) {
  throw new Error('OpenAI LLM is required but could not be initialized. Please check your OPENAI_API_KEY environment variable.');
}

/**
 * Ticket Creation Agent - Handles new ticket creation
 */
async function ticketCreationAgent(state) {
  const userRequest = state.messages[state.messages.length - 1]?.content || '';
  const boardContext = state.selectedCards?.length > 0 
    ? `Current cards: ${state.selectedCards.map(c => c.title).join(', ')}` 
    : '';

  const systemPrompt = `You are a ticket creation specialist. Based on the user's request, generate a well-structured ticket.
Respond in JSON: {"title": "...", "description": "...", "suggestedList": "...", "priority": "..."}`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Create ticket from: "${userRequest}" ${boardContext}`),
  ];

  const response = await llm.invoke(messages);
  const ticketData = JSON.parse(response.content.trim());
  console.log('[Ticket Agent] Generated ticket:', ticketData.title);
  return { type: 'ticket_creation', data: ticketData };
}

/**
 * Update Agent - Handles ticket updates/edits
 */
async function updateAgent(state) {
  const userRequest = state.messages[state.messages.length - 1]?.content || '';
  const targetCard = state.selectedCards?.[0];

  if (!targetCard) {
    throw new Error('Please select a single card to update');
  }

  const systemPrompt = `Suggest improvements to this ticket. Respond in JSON: {"title": "...", "description": "...", "reasoning": "..."}`;
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Current: ${targetCard.title}\n${targetCard.description}\n\nRequest: ${userRequest}`),
  ];

  const response = await llm.invoke(messages);
  const updateData = JSON.parse(response.content.trim());
  console.log('[Update Agent] Generated updates for:', targetCard.title);
  return { type: 'ticket_update', data: updateData, cardId: targetCard.id };
}

/**
 * Summarize & Prioritize Agent - Analyzes and prioritizes tickets
 */
async function summarizePrioritizeAgent(state) {
  const userRequest = state.messages[state.messages.length - 1]?.content || '';
  const cards = state.selectedCards || [];

  if (cards.length === 0) {
    throw new Error('Please select at least one card to analyze');
  }

  const systemPrompt = `Analyze these tickets and provide a summary with priority recommendations. Be concise and actionable.`;
  const cardsText = cards.map((c, i) => 
    `${i + 1}. ${c.title} (${c.status || c.listName || 'No status'})\n   ${c.description || ''}`
  ).join('\n\n');

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`${userRequest}\n\nTickets:\n${cardsText}`),
  ];

  const response = await llm.invoke(messages);
  console.log('[Summarize Agent] Analyzed', cards.length, 'cards');
  return { type: 'analysis', response: response.content };
}

/**
 * Knowledge Agent - Handles domain knowledge queries using RAG
 */
async function knowledgeAgent(state) {
  const userQuestion = state.messages[state.messages.length - 1]?.content || '';

  if (!state.ragConfigId) {
    const systemPrompt = `You are a helpful assistant. Answer the user's question based on general knowledge.`;
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuestion),
    ];
    const response = await llm.invoke(messages);
    console.log('[Knowledge Agent] Answered without RAG');
    return { type: 'knowledge', response: response.content, sources: [] };
  }

  console.log('[Knowledge Agent] Querying RAG knowledge base');
  const ragResult = await ragService.answerQuestion(state.ragConfigId, userQuestion);
  console.log('[Knowledge Agent] RAG response received with', ragResult.sources?.length || 0, 'sources');
  return { type: 'knowledge', response: ragResult.answer, sources: ragResult.sources };
}

/**
 * General Chat Agent - Handles general card-related questions
 */
async function generalChatAgent(state) {
  const userMessage = state.messages[state.messages.length - 1]?.content || '';
  const cards = state.selectedCards || [];

  const systemPrompt = `You are a helpful AI assistant for a project management board. Answer questions about the selected cards.`;
  const cardsContext = cards.length > 0
    ? `Selected cards:\n${cards.map(c => `- ${c.title}: ${c.description || 'No description'}`).join('\n')}`
    : 'No cards selected';

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`${cardsContext}\n\nQuestion: ${userMessage}`),
  ];

  const response = await llm.invoke(messages);
  console.log('[General Chat Agent] Responded to general query');
  return { type: 'chat', response: response.content };
}

/**
 * Intent Classification - Pure AI-based routing (NO keyword fallback)
 */
async function classifyIntent(userMessage) {
  const systemPrompt = `You are an intelligent router agent. Analyze the user's request and classify their intent.

1. CREATE_TICKET - User wants to create a new ticket/issue/task
2. UPDATE_TICKET - User wants to update/edit an existing ticket
3. SUMMARIZE_PRIORITIZE - User wants to summarize or prioritize tasks
4. KNOWLEDGE - User is asking about project documentation/architecture
5. GENERAL_CHAT - General questions

Respond with ONLY the category name. No explanation.`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Classify this request: "${userMessage}"`),
  ];

  const response = await llm.invoke(messages);
  const intent = response.content.trim().toUpperCase();
  
  // Validate intent
  const validIntents = ['CREATE_TICKET', 'UPDATE_TICKET', 'SUMMARIZE_PRIORITIZE', 'KNOWLEDGE', 'GENERAL_CHAT'];
  if (!validIntents.includes(intent)) {
    throw new Error(`Invalid intent classification from AI: ${intent}. Expected one of: ${validIntents.join(', ')}`);
  }
  return intent;
}

/**
 * Main orchestrator function - Routes to specialized agents
 * Pure AI-based flow with no fallbacks
 * @param {Object} params
 * @param {string} params.userMessage - The user's message
 * @param {Array} params.selectedCards - Array of selected card objects
 * @param {number} params.workspaceId - Workspace ID for RAG access
 * @param {number} params.ragConfigId - RAG config ID if available
 * @returns {Promise<Object>} Agent result
 */
async function orchestrate({ userMessage, selectedCards = [], workspaceId = null, ragConfigId = null }) {
  console.log('[Orchestrator] 🎯 Processing request:', userMessage.substring(0, 50) + '...');
  
  // Step 1: Classify intent (AI-only, no fallback)
  const intent = await classifyIntent(userMessage);
  console.log('[Orchestrator] 📌 Classified intent as:', intent);

  // Step 2: Route to appropriate agent
  let agentResult;
  switch (intent) {
    case 'CREATE_TICKET':
      console.log('[Orchestrator] → Routing to Ticket Creation Agent');
      agentResult = await ticketCreationAgent({
        messages: [{ role: 'user', content: userMessage }],
        selectedCards,
      });
      break;

    case 'UPDATE_TICKET':
      console.log('[Orchestrator] → Routing to Update Agent');
      agentResult = await updateAgent({
        messages: [{ role: 'user', content: userMessage }],
        selectedCards,
      });
      break;

    case 'SUMMARIZE_PRIORITIZE':
      console.log('[Orchestrator] → Routing to Summarize/Prioritize Agent');
      agentResult = await summarizePrioritizeAgent({
        messages: [{ role: 'user', content: userMessage }],
        selectedCards,
      });
      break;

    case 'KNOWLEDGE':
      console.log('[Orchestrator] → Routing to Knowledge Agent');
      agentResult = await knowledgeAgent({
        messages: [{ role: 'user', content: userMessage }],
        ragConfigId,
      });
      break;

    case 'GENERAL_CHAT':
    default:
      console.log('[Orchestrator] → Routing to General Chat Agent');
      agentResult = await generalChatAgent({
        messages: [{ role: 'user', content: userMessage }],
        selectedCards,
      });
  }

  console.log('[Orchestrator] ✅ Completed with result type:', agentResult?.type);
  return agentResult;
}

module.exports = {
  orchestrate,
};
