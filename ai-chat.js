require('dotenv').config();
const fetch = require('node-fetch');

/**
 * AI Chat module for Voicy
 * Handles interactions with LLM API for content-aware responses
 */
class AIChat {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!this.apiKey) {
      console.warn('Warning: OPENROUTER_API_KEY not found in environment variables');
    }
  }

  /**
   * Generate a response to a user question based on transcript content
   * @param {string} transcriptContent - The transcript content to use as context
   * @param {string} userQuestion - The user's question
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The AI-generated response
   */
  async generateResponse(transcriptContent, userQuestion, options = {}) {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    if (!transcriptContent || !userQuestion) {
      throw new Error('Both transcript content and user question are required');
    }

    // Construct the messages array for the chat API
    const messages = [
      {
        role: 'system',
        content: 'You are an AI assistant that helps analyze and answer questions about conversation transcripts. Provide concise, accurate responses based only on the information in the transcript.'
      },
      {
        role: 'user',
        content: `Here is a transcript of a conversation:\n\n${transcriptContent}\n\nBased on this transcript, please answer the following question: ${userQuestion}`
      }
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://voicy-app.com', // Replace with your actual domain in production
          'X-Title': 'Voicy AI Chat'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // Using Claude for good QA capabilities with lower latency
          messages: messages,
          max_tokens: options.maxTokens || 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }
}

module.exports = new AIChat(); 