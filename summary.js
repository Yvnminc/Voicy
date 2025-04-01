// summary.js - Handles generating meeting summaries via OpenRouter API
require('dotenv').config();
const fetch = require('node-fetch');

class SummaryGenerator {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!this.apiKey) {
      console.warn('Warning: OPENROUTER_API_KEY not found in environment variables');
    }
  }

  /**
   * Generate a summary of the meeting transcript
   * @param {string} transcript - The full meeting transcript
   * @param {Object} options - Options for generating the summary
   * @param {string} options.language - The language of the transcript (default: 'en')
   * @param {string} options.style - Summary style: 'concise', 'detailed', or 'bullets' (default: 'concise')
   * @param {number} options.maxLength - Maximum length of summary in characters (default: 500)
   * @returns {Promise<string>} The generated summary
   */
  async generateSummary(transcript, options = {}) {
    const { 
      language = 'en', 
      style = 'concise',
      maxLength = 500
    } = options;

    if (!transcript || transcript.trim().length === 0) {
      return 'No transcript content to summarize.';
    }

    try {
      console.log(`Generating summary for transcript (${transcript.length} chars)...`);
      
      let prompt;
      switch(style) {
        case 'detailed':
          prompt = `Generate a comprehensive summary of this meeting transcript, highlighting main topics, decisions, and action items. Language: ${language}`;
          break;
        case 'bullets':
          prompt = `Create a bullet-point summary of the key points from this meeting transcript. Focus on decisions made, action items, and important information. Language: ${language}`;
          break;
        case 'concise':
        default:
          prompt = `Create a concise summary (max ${maxLength} characters) of this meeting transcript. Focus on the most important information. Language: ${language}`;
          break;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://voicy-app.com', // Replace with your actual domain in production
          'X-Title': 'Voicy Meeting Summarizer'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-sonnet', // Using Claude for good summarization capabilities
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant that generates clear, accurate summaries of meeting transcripts. Focus on extracting key information and action items.'
            },
            { 
              role: 'user', 
              content: `${prompt}\n\nTranscript:\n${transcript}`
            }
          ],
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenRouter API error:', errorData);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Unexpected API response format');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating summary:', error);
      return `Error generating summary: ${error.message}`;
    }
  }
}

module.exports = new SummaryGenerator(); 