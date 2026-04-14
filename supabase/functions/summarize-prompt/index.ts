import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const prompt = rawBody?.prompt;
    
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required (max 500 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Summarizing prompt:', prompt);

    const systemPrompt = `You are a smart heading generator for a places discovery app. Given a user's search intent, create 4 concise section headings (MAXIMUM 4 words each) that summarize their intent naturally.

Rules:
- Each heading must be 4 words or fewer
- Be concise and natural sounding
- Focus on the user's core intent
- Don't echo the full prompt
- Use action words or descriptive phrases

Examples:
- "I want a romantic dinner with wine" → topPicks: "Romantic Wine Spots"
- "cheap eats near me" → topPicks: "Budget-Friendly Eats"
- "coffee shop to work" → topPicks: "Work-Friendly Cafes"
- "fun bars with friends" → topPicks: "Social Bar Scene"

Return JSON only, no explanation.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `User search: "${prompt}"

Generate 4 headings as JSON:
{
  "topPicks": "main heading (max 4 words)",
  "coreIntent": "activity focus (max 4 words)", 
  "secondary": "vibe/atmosphere (max 4 words)",
  "similar": "related suggestions (max 4 words)"
}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limited by AI gateway');
        return new Response(
          JSON.stringify({ error: 'Rate limited, please try again' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required for AI gateway');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response, handling potential markdown code blocks
    let headings;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      headings = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated headings:', headings);

    return new Response(
      JSON.stringify({ headings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
