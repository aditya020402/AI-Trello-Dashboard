# Chat AI Feature Guide

## Overview

The Chat AI feature allows users to interact with an AI assistant (powered by OpenAI's GPT-3.5-turbo) while working on cards/issues in the board. The chat widget appears as a floating button in the bottom-right corner of the screen and provides contextual assistance for selected cards.

## Features

- **Card-Aware Chat**: Select any card on the board and chat about it with AI
- **Persistent Context**: The AI understands the card's title, description, and status
- **Smart Suggestions**: Ask the AI to:
  - Summarize the issue
  - Rewrite descriptions in better words
  - Break content into actionable points
  - Suggest improvements
  - Extract key information

## Setup Instructions

### Backend Configuration

1. **Install OpenAI Package**

   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**

   Copy `.env.example` to `.env` and add your OpenAI API key:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add:

   ```env
   OPENAI_API_KEY=sk-your_actual_api_key_here
   ```

3. **Get OpenAI API Key**
   - Go to [OpenAI's API Keys page](https://platform.openai.com/api-keys)
   - Create a new API key
   - Keep it secure and never commit it to version control

### Frontend

No additional setup needed! The frontend already has all required dependencies (lucide-react, axios, react).

## Usage

### For End Users

1. **Navigate to a Board**
   - Click on any board to open it

2. **Select a Card**
   - Hover over any card in your board
   - Click the **Message icon** (💬) button that appears on the card
   - Or open the chat widget and interact with cards

3. **Start Chatting**
   - The chat widget opens in the bottom-right corner
   - The selected card's information is displayed at the top
   - Type your question or request in the input field
   - Press Enter or click the Send button
   - The AI will respond with helpful suggestions

4. **Example Prompts**
   - "Summarize this issue"
   - "Rewrite the description to be more professional"
   - "Break this down into actionable steps"
   - "What are the key requirements?"
   - "Suggest improvements for this task"

## API Endpoints

The backend provides the following chat endpoints:

### POST `/api/chat/card/:cardId`

Sends a message about a specific card to the AI.

**Request Body:**

```json
{
  "message": "Summarize this issue",
  "cardContent": {
    "title": "Card Title",
    "description": "Card Description",
    "status": "In Progress"
  }
}
```

**Response:**

```json
{
  "success": true,
  "response": "AI's response here..."
}
```

### POST `/api/chat`

General chat endpoint for custom message chains.

**Request Body:**

```json
{
  "messages": [
    { "role": "user", "content": "Your message here" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

## Component Structure

### Frontend Components

**ChatWidget** (`frontend/src/components/ChatWidget.jsx`)

- Main chat interface component
- Handles message display and user input
- Manages chat state and API communication

**CardItem** (Updated)

- Now includes a chat button (message icon)
- Triggers card selection for the chat widget

**ListColumn** (Updated)

- Passes `onSelectCard` callback to CardItem components

**BoardPage** (Updated)

- Manages selected card state
- Renders ChatWidget with selected card data

### Backend Routes

**Chat Router** (`backend/routes/chat.js`)

- Handles OpenAI API integration
- Manages chat requests with card context
- Error handling and validation

## Features in Detail

### Chat Widget UI

- **Floating Button**: Appears as a purple gradient circle in bottom-right
- **Chat Interface**: Clean, modern chat bubble design
- **Message History**: Shows conversation with user messages and AI responses
- **Card Context**: Displays current card title and description excerpt
- **Loading States**: Shows spinner while AI is thinking
- **Clear Chat**: Button to reset conversation
- **Responsive**: Adapts to different screen sizes

### Smart Features

- Automatic scroll to latest message
- Loading indicator during API calls
- Error handling with user-friendly messages
- Message removal on failed requests
- Prevents sending empty messages

## Configuration Options

### Customizing the Model

To use a different OpenAI model, edit `backend/routes/chat.js`:

```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4", // Change to gpt-4 or other models
  messages: messages,
  temperature: 0.7, // Adjust creativity (0-2)
  max_tokens: 1000, // Adjust response length
});
```

Available models:

- `gpt-3.5-turbo` (default, faster and cheaper)
- `gpt-4` (more capable, higher cost)
- `gpt-4-turbo` (faster than gpt-4)

## Troubleshooting

### Chat Not Working

1. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` is set in `.env`
   - Restart the backend server

2. **"Please select a card first"**
   - Click the message button on a card to select it
   - Wait for the chat widget to open

3. **API Errors**
   - Check your OpenAI API key is valid
   - Verify you have sufficient credits
   - Check OpenAI's status page

### Performance Issues

- If responses are slow, check your internet connection
- OpenAI rate limits: Default is 3,500 requests per minute
- Consider adjusting `max_tokens` for shorter responses

## Security Notes

⚠️ **Important:**

- Never commit `.env` files to version control
- Keep API keys in CI/CD secrets only
- Use environment variables for all sensitive data
- Consider rate limiting on the backend for production

## Cost Considerations

OpenAI API usage is billed per token:

- ~4 characters = 1 token
- Estimate: 1000 tokens ≈ $0.001 for gpt-3.5-turbo
- Monitor usage in [OpenAI dashboard](https://platform.openai.com/account/usage/overview)

## Future Enhancements

Potential improvements:

- Save chat history to database
- Suggest specific improvements based on card metadata
- Voice input for accessibility
- Export suggestions to card description
- Batch processing for multiple cards
- Custom system prompts per workspace
- Chat analytics and insights

## Support

For issues with:

- **OpenAI API**: Check [OpenAI docs](https://platform.openai.com/docs)
- **Frontend**: Review React and Vite documentation
- **Backend**: Check Express.js and Node.js guides

## License

This feature uses OpenAI's API and is subject to OpenAI's Terms of Service.
