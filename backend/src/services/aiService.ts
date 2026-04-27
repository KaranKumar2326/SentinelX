import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const aiService = {
  /**
   * Generates a high-precision data incident diagnosis and fix using Llama 3 on Groq.
   */
  async analyzeIncident(context: {
    type: string;
    entityName: string;
    description: string;
    impact: any;
    errorDetails?: string;
  }) {
    if (!process.env.GROQ_API_KEY) {
      return { 
        diagnosis: "AI not configured. Falling back to deterministic logic.",
        suggestedFix: "-- Add GROQ_API_KEY for AI remediation scripts"
      };
    }

    try {
      const prompt = `
        You are SentinelX AI, a senior data reliability engineer. 
        Analyze the following data incident from our OpenMetadata catalog.

        INCIDENT CONTEXT:
        - Entity: ${context.entityName}
        - Failure Type: ${context.type}
        - Raw Error: ${context.description}
        - Business Impact: ${context.impact?.queryImpact24h} queries and ${context.impact?.estimatedUsers} users.

        GOAL:
        1. Provide a professional, concise diagnosis of the ROOT CAUSE.
        2. Provide a specific SQL or CLI fix script to resolve this issue.

        FORMAT:
        Return a JSON object exactly like this:
        {
          "diagnosis": "...",
          "suggestedFix": "..."
        }
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(chatCompletion.choices[0].message.content || '{}');
      return {
        diagnosis: response.diagnosis || "No diagnosis generated.",
        suggestedFix: response.suggestedFix || "-- No fix generated."
      };
    } catch (error: any) {
      console.error('[GROQ AI ERROR]', error);
      return {
        diagnosis: "Groq AI analysis failed. " + error.message,
        suggestedFix: "-- Manual intervention required"
      };
    }
  }
};
