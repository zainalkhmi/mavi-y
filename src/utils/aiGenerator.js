
/**
 * Helper to get the API key from storage if not provided
 */
export const getStoredApiKey = (providedKey) => {
    if (providedKey) return providedKey;
    return localStorage.getItem('gemini_api_key') || '';
};

/**
 * Generates content for a work instruction manual step using Google Gemini API.
 * @param {string} taskName - The name of the task/step.
 * @param {string} model - The specific model to use (optional).
 * @param {string} imageData - Base64 image data (optional).
 * @param {string} language - The target language (default: 'English').
 * @returns {Promise<{description: string, keyPoints: string, safety: string}>}
 */
export const generateManualContent = async (taskName, apiKey = null, model = null, imageData = null, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    let prompt = "";
    if (imageData) {
        prompt = `
        You are an industrial engineering expert analyzing a video frame of a work step.
        For the task "${taskName || 'Unnamed Step'}", look at the provided image and generate the following in JSON format:
        1. "description": A clear, concise, professional description of the action being performed in the image (max 2 sentences). Describe EXACTLY what the hands/operator are doing.
        2. "keyPoints": 2-3 critical quality or efficiency observations based on the visual evidence (e.g. "Grip type", "Part orientation").
        3. "safety": 1-2 important safety or ergonomic warnings based on the image (e.g. "PPE missing", "Awkward posture").
        
        CRITICAL INSTRUCTION: The output content MUST be written in ${language}.
        
        Example output format:
        {
            "description": "The operator is tightening the bolt using a torque wrench with the right hand while stabilizing the part with the left.",
            "keyPoints": "Vertical grip used, Check torque setting",
            "safety": "Safety glasses required, Watch pinch points"
        }
        `;
    } else {
        prompt = `
        You are an industrial engineering expert creating a Work Instruction Manual.
        For the task "${taskName}", provide the following in JSON format ONLY:
        1. "description": A clear, concise, professional description of the action (max 2 sentences).
        2. "keyPoints": 2-3 critical quality or efficiency points (comma separated).
        3. "safety": 1-2 important safety or ergonomic warnings (comma separated).
        
        CRITICAL INSTRUCTION: The output content MUST be written in ${language}.
        
        Example output format:
        {
            "description": "Pick up the part with the left hand and orient it for assembly.",
            "keyPoints": "Ensure firm grip, Check for burrs",
            "safety": "Wear gloves, Avoid sharp edges"
        }
        `;
    }

    return await callAIProvider(prompt, apiKey, model, true, imageData);
};

/**
 * Analyzes a Value Stream Map for bottlenecks and waste.
 * @param {object} flowData - { nodes, edges, metrics }
 * @param {string} apiKey
 * @returns {Promise<string>} AI analysis and recommendations
 */
export const analyzeVSM = async (flowData, apiKey, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) throw new Error("API Key missing");

    const prompt = `
        You are a Lean Manufacturing Sensei. Analyze the following Value Stream Map (VSM) data.
        
        **VSM METRICS:**
        - Total Cycle Time: ${flowData.metrics.totalCT}s
        - Total Value-Added Time: ${flowData.metrics.totalVA}s
        - Total Lead Time: ${flowData.metrics.totalLT}s
        - Process Efficiency: ${flowData.metrics.efficiency}%
        
        **VSM STRUCTURE:**
        Nodes: ${JSON.stringify(flowData.nodes.map(n => ({ type: n.type, name: n.data.name, ct: n.data.ct, inventory: n.data.amount })))}
        
        **INSTRUCTIONS:**
        1. Identify the primary BOTTLENECK.
        2. Identify sources of WASTE (Muda) such as high inventory or low VA/LT ratio.
        3. Provide 3 specific LEAN IMPROVEMENT recommendations.
        4. Format the response in clear Markdown.
        5. Use **${language}**.
    `;

    return await callAIProvider(prompt, keyToUse, null, false);
};

/**
 * Improves existing content for grammar, clarity, and tone.
 * @param {object} content - { description, keyPoints, safety }
 * @param {string} apiKey - The Google Gemini API Key.
 * @param {string} model - The specific model to use (optional).
 * @returns {Promise<{description: string, keyPoints: string, safety: string}>}
 */
export const improveManualContent = async (content, apiKey, model = null) => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    const prompt = `
        You are a grammar and spelling editor.
        
        CRITICAL RULES:
        1. **PRESERVE THE ORIGINAL LANGUAGE** - If input is in Indonesian, output MUST be in Indonesian. If English, output in English. NEVER translate.
        2. **ONLY FIX GRAMMAR AND SPELLING** - Do NOT add new information, details, or explanations
        3. **KEEP THE SAME LENGTH** - Do not make sentences longer or shorter
        4. **KEEP THE SAME MEANING** - Only fix errors, do not change the content
        5. Fix: capitalization, punctuation, spelling mistakes, grammar errors
        6. Do NOT add: extra words, technical terms, or additional details
        
        Input Data:
        Description: "${content.description || ''}"
        Key Points: "${content.keyPoints || ''}"
        Safety: "${content.safety || ''}"
 
        Output the corrected text (SAME LANGUAGE, SAME LENGTH, SAME MEANING) in JSON format:
        {
            "description": "Grammar-corrected description",
            "keyPoints": "Grammar-corrected key points",
            "safety": "Grammar-corrected safety"
        }
        
        If a field is empty, return it as empty string "".
    `;

    console.log('AI Improve Request:', { content, model });
    const result = await callAIProvider(prompt, keyToUse, model);
    console.log('AI Improve Response:', result);
    return result;
};

/**
 * Generates a comprehensive Kaizen Report based on project data.
 * @param {object} context - Project data (measurements, metrics, etc.)
 * @param {string} apiKey - The Google Gemini API Key.
 * @param {string} model - The specific model to use (optional).
 * @param {string} language - The target language for the report (default: 'English').
 * @returns {Promise<string>} Markdown formatted report
 */
export const generateKaizenReport = async (context, apiKey, model = null, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    // Format context data for the prompt
    const metrics = context.metrics || {};
    const elements = context.elements || [];

    const elementsList = elements.map((el, i) =>
        `- ${el.elementName} (${el.therblig}): ${el.duration.toFixed(2)}s [${el.valueAdded ? 'VA' : 'NVA'}]`
    ).join('\n');

    const prompt = `
        You are a Senior Industrial Engineer and Lean Six Sigma Black Belt.
        Generate a "Kaizen Report" (Continuous Improvement Report) for the following process data.

        **Project Context:**
        - Project Name: ${context.projectName || 'N/A'}
        - Total Cycle Time: ${metrics.totalCycleTime ? metrics.totalCycleTime.toFixed(2) : 'N/A'} s
        - Value Added Ratio: ${metrics.valueAddedRatio ? (metrics.valueAddedRatio * 100).toFixed(1) : 'N/A'}%
        - Efficiency Score: ${metrics.efficiencyScore ? (metrics.efficiencyScore * 100).toFixed(1) : 'N/A'}%
        - Productivity Index: ${metrics.productivityIndex ? metrics.productivityIndex.toFixed(2) : 'N/A'}

        **Process Elements:**
        ${elementsList}

        **Instructions:**
        Create a professional, actionable report in Markdown format. 
        The report MUST be written in **${language}**.
        
        Structure the report exactly as follows (translate headers to ${language}):

        # 🚀 Kaizen Report: [Project Name]

        ## 📊 Executive Summary
        [Brief summary of current performance and main issues]

        ## 🗑️ Waste Identification (Muda)
        [Identify specific non-value-added activities from the element list. Group them by 7 Wastes if applicable.]

        ## 💡 Improvement Recommendations
        [Specific, actionable steps to reduce cycle time and improve efficiency. Suggest ECRS (Eliminate, Combine, Rearrange, Simplify) actions.]

        ## 📈 Projected Benefits
        [Estimate potential time savings or efficiency gains if recommendations are implemented]

        ---
        *Generated by Motion Study AI*
    `;

    console.log('Generating Kaizen Report...');
    return await callAIProvider(prompt, keyToUse, model, false); // Expect text/markdown, not JSON
};

/**
 * Optimizes the layout of workstations based on flow data (Spaghetti Chart).
 * @param {Array} nodes - Current nodes {name, x, y}
 * @param {Array} flowData - Connections {from, to, count}
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<Array>} Optimized nodes with new x,y coordinates
 */
export const generateLayoutOptimization = async (nodes, flowData, apiKey, model = null) => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) throw new Error("API Key is missing. Please configure it in AI Settings.");

    const nodesList = nodes.map(n => n.name).join(', ');
    const flowList = flowData.map(f => `${f.from} -> ${f.to} (${f.count} times)`).join('\n');

    const prompt = `
        You are a Facility Layout Optimization Expert.
        
        **Objective:**
        Optimize the 2D layout of workstations to MINIMIZE total travel distance based on the flow frequency.
        
        **Constraints:**
        1. Canvas Size: Width 1000px, Height 600px.
        2. Padding: Keep nodes at least 50px from edges.
        3. Spacing: Keep nodes at least 100px apart to avoid overlap.
        4. Grouping: High-frequency connections MUST be placed closer together.
        5. Flow: Try to create a logical flow (e.g., U-shape, L-shape, or straight line) if applicable.
        
        **Input Data:**
        Nodes: ${nodesList}
        
        Flow Frequency (From -> To):
        ${flowList}
        
        **Output:**
        Return ONLY a valid JSON ARRAY of objects. Do not include any markdown formatting, code blocks, or explanations.
        Example format:
        [
            { "name": "Station A", "x": 150, "y": 300, "reason": "Central hub" },
            ...
        ]
    `;

    console.log('Generating Layout Optimization...');
    return await callAIProvider(prompt, keyToUse, model, true); // Expect JSON
};

/**
 * Validates the API Key and returns the list of available models.
 * @param {string} apiKey 
 * @returns {Promise<string[]>} List of available model names
 */
export const validateApiKey = async (apiKey) => {
    // For validation, we might want to explicitly require the key passed in, 
    // but consistency says we could fallback. 
    // However, validation is usually for a specific NEW key. 
    // Let's keep existing logic but allow fallback if called without arg (though unlikely for validation).
    // Trim whitespace from key to avoid simple copy-paste errors
    const keyToUse = (apiKey || localStorage.getItem('gemini_api_key') || '').trim();
    if (!keyToUse) throw new Error("API Key is missing");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Handle cases where json parse fails
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.models) {
            return [];
        }

        // Filter for models that support generateContent
        return data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', ''));

    } catch (error) {
        console.error("API Validation Error:", error);
        if (error.message === 'Failed to fetch') {
            throw new Error("Network Error: Could not connect to Google Gemini API. Please check your internet connection and disable any Ad Blockers or VPNs that might differ traffic.");
        }
        throw error;
    }
};

import { helpContent } from './helpContent';

// Helper to strip HTML/JSX tags for AI context
const getPlainHelpText = () => {
    let text = "APPLICATION USER GUIDE:\n\n";
    Object.entries(helpContent).forEach(([key, value]) => {
        // Simple regex to strip tags, could be improved but sufficient for context
        const cleanContent = JSON.stringify(value.content)
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\\n/g, ' ')
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
        text += `FEATURE: ${value.title}\n${cleanContent}\n\n`;
    });
    return text;
};

/**
 * Chat with AI for Industrial Engineering analysis
 * @param {string} userMessage - User's question or message
 * @param {object} context - Measurement data context (elements, project info, etc.)
 * @param {array} chatHistory - Previous chat messages for context
 * @param {string} apiKey - The Google Gemini API Key
 * @param {string} model - The specific model to use (optional)
 * @returns {Promise<string>} AI response
 */
export const chatWithAI = async (userMessage, context = {}, chatHistory = [], apiKey, model = null) => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    // Build context summary from multi-module data
    let contextSummary = "";

    // 1. Measurement Data
    if (context.elements && context.elements.length > 0) {
        const totalTime = context.elements.reduce((sum, el) => sum + (el.duration || 0), 0);
        const elementList = context.elements.map((el, i) =>
            `${i + 1}. ${el.elementName || 'Unnamed'} (${el.therblig || 'N/A'}) - ${(el.duration || 0).toFixed(2)}s`
        ).join('\n');

        contextSummary += `
[Module: Time Study]
- Project: ${context.projectName || 'Unnamed Project'}
- Total Elements: ${context.elements.length}
- Total Cycle Time: ${totalTime.toFixed(2)} seconds
- Elements:
${elementList}
`;
    }

    // 2. Workstation Layout Data (from TherbligAnalysis)
    if (context.workstation) {
        const { objects = [], metrics = {} } = context.workstation;
        contextSummary += `
[Module: Workstation Layout]
- Objects in Digital Twin: ${objects.length} (${objects.map(o => o.name).join(', ')})
- Total Travel Distance: ${metrics.totalDistance || 'N/A'} units
- Efficiency Score: ${metrics.efficiencyScore || 'N/A'}
- Reach Zone Analysis: ${metrics.reachAnalysis || 'N/A'}
`;
    }

    // 3. Ergonomics Data (from ErgonomicAnalysis)
    if (context.ergonomics) {
        const { mode = 'RULA', scores = {}, riskLevel = 'N/A' } = context.ergonomics;
        contextSummary += `
[Module: Ergonomics]
- Analysis Mode: ${mode}
- Risk Level: ${riskLevel}
- Specific Scores: ${Object.entries(scores).map(([k, v]) => `${k}: ${v}`).join(', ')}
`;
    }

    // 4. Productivity Metrics (from AnalysisDashboard)
    if (context.metrics) {
        contextSummary += `
[Module: Productivity Analytics]
- OEE: ${context.metrics.oee || 'N/A'}%
- Efficiency: ${context.metrics.efficiency || 'N/A'}%
- Takt Status: ${context.metrics.taktStatus || 'N/A'}
- Productivity Index: ${context.metrics.productivityIndex || 'N/A'}
`;
    }

    // 5. VSM Data (from ValueStreamMap)
    if (context.vsm) {
        const processNodes = context.vsm.nodes?.filter(n => n.type === 'process') || [];
        const processDetails = processNodes.map(n =>
            `- Node: ${n.data.label || n.data.name} [Type: ${n.data.processType || 'Normal'}]
  * CT: ${n.data.ct || 0}s (${n.data.pcsPerHour || (n.data.ct > 0 ? Math.round(3600 / n.data.ct) : 0)} pcs/hr)
  * CO: ${n.data.co || 0}s, Uptime: ${n.data.uptime || 0}%, OEE: ${n.data.performance || 0}%
  * VA: ${n.data.va || 0}s, Yield: ${n.data.yield || 0}%, Ops/Shifts: ${n.data.operators || 1}
  * Shift Pattern: ${n.data.shiftPattern || 1} shifts, Overtime: ${n.data.overtimeAllowed ? 'Yes' : 'No'}
  * Cost: $${n.data.costPerUnit || 0}/unit, Holding: $${n.data.holdingCostPerDay || 0}/day`
        ).join('\n');

        const inventoryNodes = context.vsm.nodes?.filter(n => n.type === 'inventory') || [];
        const inventoryDetails = inventoryNodes.map(n =>
            `- Inventory: ${n.data.label || n.data.name}
  * Amount: ${n.data.amount || 0} ${n.data.unit || 'pcs'}
  * Time: ${n.data.time || 0} days
  * Safety Stock: ${n.data.safetyStock || 0}, Reorder Point: ${n.data.reorderPoint || 0}`
        ).join('\n');

        contextSummary += `
[Module: Value Stream Map]
- Total Lead Time: ${context.vsm.metrics?.totalLT || 'N/A'}s
- Efficiency: ${context.vsm.metrics?.efficiency || 'N/A'}%
- Calculated Takt Time: ${context.vsm.metrics?.calculatedTakt || 'N/A'}s
- Bottleneck Candidate: ${context.vsm.bottleneck || 'N/A'}
- Process Nodes:
${processDetails || 'None'}
- Inventory Nodes:
${inventoryDetails || 'None'}
`;
    }

    // Get Application Knowledge Base
    const appKnowledge = getPlainHelpText();

    // Get provider settings
    const provider = localStorage.getItem('ai_provider') || 'gemini';
    const baseUrl = localStorage.getItem('ai_base_url') || '';

    // Build chat history context
    let historyContext = "";
    if (chatHistory.length > 0) {
        historyContext = "\n\nPrevious conversation:\n" +
            chatHistory.slice(-5).map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n');
    }

    let prompt;

    // OVERRIDE: If a custom system prompt is provided in context (e.g. for Studio Model), use it exclusively.
    // This allows creating isolated personas without polluting with general app knowledge.
    if (context.systemPrompt) {
        prompt = `
            ${context.systemPrompt}

            **HISTORY:**
            ${historyContext}
            
            **USER MESSAGE:** 
            ${userMessage}
            
            Respond directly without JSON formatting.
        `;
    } else {
        // DEFAULT MAVI PERSONA
        const promptContextSummary = contextSummary; // use the one built above

        const prompt = `
            You are "Mavi", an expert Industrial Engineer and the official assistant for the "Motion Study Application".
            
            **YOUR KNOWLEDGE BASE (How this app works):**
            ${appKnowledge}
    
            **CURRENT ANALYSIS CONTEXT:**
            ${promptContextSummary}
            
            **HISTORY:**
            ${historyContext}
            
            **USER QUESTION:** 
            ${userMessage}
            
            **INSTRUCTIONS:**
            1. Always answer based on the "Application User Guide" if the user asks about features.
            2. If asked about Industrial Engineering (Time Study, Line Balancing, etc.), use your general expert knowledge.
            3. Be helpful, professional, and concise.
            4. Provide specific recommendations based on the measurement data if available.
            5. Respond in the SAME LANGUAGE as the user (Indonesian or English).
            
            Respond directly without JSON formatting.
        `;
        // Assignment to outer var
    }

    // Re-assign explicitly because I split the if/else block awkwardly above? 
    // Wait, I can just define 'prompt' inside the else block and have 'let prompt' outside?
    // Let's rewrite the block cleanly.

    if (context.systemPrompt) {
        prompt = `
        ${context.systemPrompt}

        **HISTORY:**
        ${historyContext}
        
        **USER MESSAGE:** 
        ${userMessage}
        
        Respond directly without JSON formatting.
        `;
    } else {
        prompt = `
            You are "Mavi", an expert Industrial Engineer and the official assistant for the "Motion Study Application".
            
            **YOUR KNOWLEDGE BASE (How this app works):**
            ${appKnowledge}
    
            **CURRENT ANALYSIS CONTEXT:**
            ${contextSummary}
            
            **HISTORY:**
            ${historyContext}
            
            **USER QUESTION:** 
            ${userMessage}
            
            **INSTRUCTIONS:**
            1. **FORMATTING IS CRITICAL:**
               - Use **Bold** for key terms and menu names.
               - Use \`Code Blocks\` for values or specific inputs.
               - Use **Bullet Points** or **Numbered Lists** for steps. NEVER use long paragraphs.
               - Use ### Headings to separate sections.
            
            2. **COACHING ROLE:**
               - Do not just explain "what" a feature is. Explain **"HOW"** to use it step-by-step.
               - Guide the user like a mentor (Coach).
               - If the user asks about a menu, look up the "Cara Pakai" in your Knowledge Base and explain it clearly.

            3. **KNOWLEDGE BASE:**
               - Always answer based on the "Application User Guide" if the user asks about features.
               - If asked about Industrial Engineering (Time Study, Line Balancing, etc.), use your general expert knowledge.

            4. **TONE & LANGUAGE:**
               - Be helpful, professional, and concise.
               - Respond in the SAME LANGUAGE as the user (Indonesian or English).

            Respond in clean **Markdown** format.
        `;
    }

    console.log('AI Chat Request:', { userMessage, context: contextSummary });

    try {
        if (provider === 'gemini') {
            const modelToUse = model || localStorage.getItem('gemini_model') || 'gemini-1.5-flash-002';
            const aiResponse = await callGemini(prompt, keyToUse, modelToUse, false);
            console.log('AI Chat Response:', aiResponse);
            return aiResponse;
        } else {
            // OpenAI Compatible Chat
            const modelToUse = model || (provider === 'openai' ? 'gpt-3.5-turbo' : localStorage.getItem(`${provider}_model`)) || localStorage.getItem('gemini_model') || 'gpt-3.5-turbo';
            return await callOpenAICompatible(prompt, keyToUse, modelToUse, baseUrl, false);
        }


    } catch (error) {
        console.error('AI Chat Error:', error);
        throw error;
    }
};

/**
 * Main entry point for AI calls. Routes to specific provider.
 */
const callAIProvider = async (prompt, apiKey, specificModel = null, expectJson = true, imageData = null) => {
    const provider = localStorage.getItem('ai_provider') || 'gemini';
    const baseUrl = localStorage.getItem('ai_base_url') || '';
    const keyToUse = getStoredApiKey(apiKey);

    // Default models if not specified
    let model = specificModel;
    if (!model) {
        if (provider === 'gemini') {
            model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-002';
        } else {
            model = localStorage.getItem(`${provider}_model`) || localStorage.getItem('gemini_model') || 'gpt-3.5-turbo';
        }
    }

    if (provider === 'gemini') {
        return await callGemini(prompt, keyToUse, model, expectJson, imageData);
    } else {
        // OpenAI compatible currently doesn't support image in this helper, could be added later
        return await callOpenAICompatible(prompt, keyToUse, model, baseUrl, expectJson);
    }
}

/**
 * Validates the API Key and returns the list of available models for non-Gemini providers.
 */
export const validateOpenAICompatibleKey = async (apiKey, baseUrl) => {
    const url = baseUrl ? `${baseUrl}/models` : 'https://api.openai.com/v1/models';
    const keyToUse = (apiKey || localStorage.getItem('openai_api_key') || '').trim();

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${keyToUse}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        if (data.data) {
            return data.data.map(m => m.id);
        }
        return [];
    } catch (error) {
        console.error("OpenAI Models Fetch Error:", error);
        throw error;
    }
};

/**
 * Generic handler for OpenAI-compatible APIs (OpenAI, Grok, Qwen, DeepSeek, LocalAI)
 */
const callOpenAICompatible = async (prompt, apiKey, model, baseUrl, expectJson = true) => {
    const url = baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const keyToUse = getStoredApiKey(apiKey);

    console.log(`Calling OpenAI Compatible API: ${url} with model ${model}`);

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToUse}`
        };

        // Add OpenRouter specific headers
        if (url.includes('openrouter.ai')) {
            headers['HTTP-Referer'] = 'https://motion-study-app.com'; // Replace with your actual site URL
            headers['X-Title'] = 'Motion Study Application';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "You are a helpful assistant. Respond in JSON format if requested." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error("No response generated");
        }

        let text = data.choices[0].message.content;

        // Clean up markdown code blocks if present (same as Gemini handler)
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Try parsing as JSON if it looks like JSON
        // Match either {...} or [...]
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (expectJson) {
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    // If parse fails but we expected JSON, we might want to throw or just return text.
                    return text;
                }
            }
        }

        return text;

    } catch (error) {
        console.error("OpenAI Compatible API Error:", error);
        throw error;
    }
};

const callGemini = async (prompt, apiKey, specificModel = null, expectJson = true, imageData = null) => {
    // Standardize model names to ensure we aren't sending bad strings
    const cleanModel = (m) => m ? m.replace('models/', '') : null;

    // Priority list:
    // 1. specificModel (if provided)
    // 2. gemini-1.5-flash (Fast, assume stable)
    // 3. gemini-1.5-pro (Higher quality, fallback if flash fails?) - No, usually flash is the fallback for pro.
    // 4. gemini-pro (Old reliable)

    // If specificModel is provided, we try it first.
    // If it fails, we fall back to 'gemini-1.5-flash' (unless specificModel was already flash).

    let modelsToTry = [];
    if (specificModel) {
        modelsToTry.push(cleanModel(specificModel));
    }

    // Always add efficient fallbacks if they aren't already the first choice
    const fallbacks = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-002', 'gemini-1.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-pro-002', 'gemini-2.0-flash-exp'];

    for (const fb of fallbacks) {
        if (!modelsToTry.includes(fb)) modelsToTry.push(fb);
    }


    let lastError = null;
    const keyToUse = getStoredApiKey(apiKey);

    for (const model of modelsToTry) {
        try {
            console.log(`Attempting AI generation with model: ${model}`);

            // Build parts
            const parts = [{ text: prompt }];
            if (imageData) {
                // Remove header if present (data:image/jpeg;base64,)
                const base64Data = imageData.split(',')[1] || imageData;
                parts.unshift({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: parts
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn(`Model ${model} failed with status ${response.status}:`, errorData);

                // If 404 (Not Found) or 400 (Bad Request), it's likely a model name issue. Try next.
                // If 403 (Permission) or 429 (Quota), it might be key/quota related, but we can still try a cheaper model (like flash) just in case.
                lastError = new Error(errorData.error?.message || `Model ${model} failed`);
                continue;
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No content generated");
            }
            let text = data.candidates[0].content.parts[0].text;

            // Clean up the text to remove markdown code blocks if present
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            if (!expectJson) {
                return text;
            }

            // Extract JSON from the text
            const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
            if (jsonMatch) {
                let jsonText = jsonMatch[0];
                // Sanitize control characters
                jsonText = jsonText
                    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, '')
                    .replace(/\t/g, ' ');

                try {
                    return JSON.parse(jsonText);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    throw new Error("Invalid JSON format from AI: " + e.message);
                }
            } else {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    // console.error('Failed to parse AI response:', text); // Optional logging
                    throw new Error("Invalid response format from AI - no valid JSON found");
                }
            }

        } catch (error) {
            console.error(`AI Generation Error (${model}):`, error);
            lastError = error;
            // Continue to next model in list
        }
    }

    throw lastError || new Error("AI generation failed. Please check your API Key and network connection.");
};
/**
 * Uploads a file (video/image) to Google Gemini File API for processing.
 * @param {File} file - The file object to upload.
 * @param {string} apiKey - API Key.
 * @returns {Promise<string>} The file URI (e.g., "https://generativelanguage.googleapis.com/v1beta/files/...")
 */
export const uploadFileToGemini = async (file, apiKey) => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) throw new Error("API Key is missing.");

    // Ensure we have a display name (Blobs might not have .name)
    const displayName = file.name || `video_${Date.now()}`;
    const contentType = file.type || 'video/mp4'; // Default to mp4 if unknown

    console.log(`Starting Gemini upload for: ${displayName} (${contentType}, ${file.size} bytes)`);

    // 1. Start Resumable Upload
    const startUploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${keyToUse}`;

    try {
        // Initial request to get the upload URL
        const startResponse = await fetch(startUploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': file.size.toString(),
                'X-Goog-Upload-Header-Content-Type': contentType,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { display_name: displayName } })
        });

        if (!startResponse.ok) {
            let errorMessage = '';
            try {
                const errorData = await startResponse.json();
                errorMessage = errorData.error?.message || startResponse.statusText;
            } catch (e) {
                errorMessage = startResponse.statusText || `Status: ${startResponse.status}`;
            }
            throw new Error(`Failed to initiate upload: ${errorMessage}`);
        }

        const uploadUrl = startResponse.headers.get('x-goog-upload-url');
        if (!uploadUrl) {
            throw new Error("Failed to retrieve upload URL from headers. Check if your API key has File API access enabled.");
        }

        console.log("Upload URL obtained, sending bytes...");

        // 2. Upload the actual bytes
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': file.size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            body: file
        });

        if (!uploadResponse.ok) {
            let errorMessage = '';
            try {
                const errorData = await uploadResponse.json();
                errorMessage = errorData.error?.message || uploadResponse.statusText;
            } catch (e) {
                errorMessage = uploadResponse.statusText || `Status: ${uploadResponse.status}`;
            }
            throw new Error(`Failed to upload file content: ${errorMessage}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log("Upload successful:", uploadResult.file.uri);
        return uploadResult.file.uri;

    } catch (error) {
        console.error("Gemini Upload Error:", error);
        if (error.message === 'Failed to fetch') {
            throw new Error("Network Error: Could not connect to Gemini File API. This might be due to an ad-blocker or network restriction.");
        }
        throw error;
    }
};

/**
 * Chat with AI using a Video context (Gemini 1.5 Pro/Flash).
 */
export const chatWithVideo = async (userMessage, fileUri, chatHistory = [], apiKey) => {
    const keyToUse = getStoredApiKey(apiKey);

    // Priority list of models to try
    const userModel = localStorage.getItem('gemini_model');
    let models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-002', 'gemini-1.5-pro-latest', 'gemini-1.5-pro-002', 'gemini-1.5-flash'];

    // If user has a specific model setting, try that FIRST
    if (userModel) {
        const cleanUserModel = userModel.replace('models/', '');
        models = [cleanUserModel, ...models.filter(m => m !== cleanUserModel)];
    }

    let lastError = null;

    for (const model of models) {
        try {
            console.log(`Video Chat: Attempting with model ${model}`);

            const parts = [
                { text: userMessage },
                {
                    file_data: {
                        mime_type: "video/mp4", // generic fallback
                        file_uri: fileUri
                    }
                }
            ];

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.warn(`Model ${model} failed:`, err);
                throw new Error(err.error?.message || `Model ${model} failed`);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error("Empty response from AI");
            }

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastError = error;
            // Continue to next model
        }
    }

    throw lastError || new Error("All video models failed. Please check API Key.");
};

/**
 * Generates structured content from a video using Gemini (Generic Handler).
 */
const generateVideoContent = async (prompt, fileUri, apiKey, expectJson = true) => {
    const keyToUse = getStoredApiKey(apiKey);
    const userModel = localStorage.getItem('gemini_model');
    let models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-002', 'gemini-1.5-pro-latest', 'gemini-1.5-pro-002', 'gemini-1.5-flash'];

    if (userModel) {
        const cleanUserModel = userModel.replace('models/', '');
        models = [cleanUserModel, ...models.filter(m => m !== cleanUserModel)];
    }

    let lastError = null;

    for (const model of models) {
        try {
            console.log(`Video Gen: Attempting with model ${model}`);

            const parts = [
                { text: prompt },
                {
                    file_data: {
                        mime_type: "video/mp4",
                        file_uri: fileUri
                    }
                }
            ];

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.warn(`Model ${model} failed:`, err);
                throw new Error(err.error?.message || `Model ${model} failed`);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error("Empty response from AI");
            }

            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            if (expectJson) {
                const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                if (jsonMatch) {
                    try {
                        return JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.warn("JSON Parse failed, returning text");
                    }
                }
            }

            return text;

        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("All video models failed. Please check API Key.");
};

/**
 * Analyzes video to automatically generate timeline elements.
 */
export const generateElementsFromVideo = async (fileUri, apiKey) => {
    const prompt = `
        You are an expert Industrial Engineer analyzing a video for a Time and Motion Study.
        
        Task:
        1. Break down the video into distinct, sequential WORK ELEMENTS (steps).
        2. For each element, provide the start time, end time, and a clear description.
        3. Classify each element as "Value-added", "Non value-added", or "Waste".
        
        Output format: JSON ARRAY of objects.
        [
            {
                "elementName": "Description of the step (e.g., Reach for bolt)",
                "startTime": 0.0,
                "endTime": 2.5,
                "duration": 2.5,
                "category": "Value-added" (or "Non value-added" or "Waste"),
                "therblig": "TE" (Transport Empty) - Optional Therblig code
            }
        ]
        
        Important:
        - Ensure timestamps are accurate (in seconds).
        - Cover the entire duration of the video if possible.
        - The sequence should be logical.
    `;

    return await generateVideoContent(prompt, fileUri, apiKey, true);
};

/**
 * Performs a Deep Kaizen Analysis on a video using Gemini.
 * Identifies waste, provides specific recommendations, and finds ergonomic issues.
 */
export const generateKaizenAnalysis = async (fileUri, apiKey) => {
    const prompt = `
        You are a world-class Industrial Engineer and Kaizen Sensei. 
        Analyze the provided video of a manufacturing or administrative process.
        
        Provide your analysis in the following JSON format:
        {
            "wasteSegments": [
                {
                    "startTime": 0.0,
                    "endTime": 5.0,
                    "type": "Idle / Waiting",
                    "description": "Operator is waiting for the machine to finish cycle."
                }
            ],
            "recommendations": [
                {
                    "title": "Parallel Processing",
                    "description": "Adjust the workflow so the operator can prepare the next part during the machine cycle to eliminate waiting time.",
                    "impact": "High",
                    "timestamp": 12.5
                }
            ],
            "ergonomics": [
                {
                    "issue": "Awkward Reach",
                    "severity": "Medium",
                    "description": "The operator reaches too high for the component bin.",
                    "timestamp": 8.2
                }
            ],
            "summary": "A brief overall summary of the performance (max 2 sentences)."
        }
        
        CRITICAL: 
        1. Identify the TOP 3 most significant waste segments with accurate timestamps (in seconds).
        2. Provide at least 3 actionable Kaizen recommendations.
        3. Look for ergonomic risks (RULA/REBA inspired).
        4. Be professional and data-driven.
    `;

    return await generateVideoContent(prompt, fileUri, apiKey, true);
};

/**
 * Automatically generates a full set of manual steps from a video using Gemini.
 */
export const generateFullManualFromVideo = async (fileUri, apiKey, language = 'English') => {
    const prompt = `
        You are an expert Industrial Engineer and Technical Writer.
        Analyze the provided video of a process and create a comprehensive "Work Instruction Manual".
        
        Task:
        1. Break the process into clear, logical steps.
        2. For each step, provide:
           - "title": A short, action-oriented title (e.g., "Mount Bracket to Chassis").
           - "description": A clear instruction on how to perform the step.
           - "startTime": The timestamp in the video where this step begins (in seconds).
           - "endTime": The timestamp where the step ends.
           - "bullets": An array of objects: { "type": "warning" | "note" | "caution", "text": "Specific advice" }
        
        Output format: JSON ARRAY of step objects.
        
        CRITICAL: 
        - The entire response MUST be in ${language}.
        - Ensure steps follow a logical sequence.
        - Look for safety warnings or quality notes for each step.
        - Return ONLY the JSON array.
    `;

    return await generateVideoContent(prompt, fileUri, apiKey, true);
};

/**
 * Generates a complete VSM structure from a natural language prompt.
 * @param {string} processDescription - User's description of the process
 * @param {string} apiKey - The Google Gemini API Key
 * @param {string} language - The target language ('Indonesian' or 'English')
 * @returns {Promise<{nodes: Array, edges: Array}>} VSM structure with nodes and edges
 */
export const generateVSMFromPrompt = async (processDescription, apiKey, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    const prompt = `
        You are an expert Lean Manufacturing Engineer specializing in Value Stream Mapping (VSM).
        
        **TASK:**
        Convert the following process description into a COMPLETE VSM (Value Stream Map) with nodes and edges.
        IMPORTANT: Include BOTH material flow AND information flow.
        
        **PROCESS DESCRIPTION:**
        ${processDescription}
        
        **OUTPUT REQUIREMENTS:**
        Return a JSON object with two arrays: "nodes" and "edges".
        
        **NODE TYPES:**
        1. "process" - For manufacturing/assembly steps (has cycle time, operators, etc.)
        2. "inventory" - For stock/buffer between processes (has amount, time equivalent)
        3. "productionControl" - For scheduling/planning/MRP activities (ALWAYS add this for information flow)
        4. "generic" - For suppliers, customers, kanban posts, or other entities
        
        **SYMBOL TYPES (for data.symbolType):**
        Material Flow: "process", "inventory", "supplier", "customer", "supermarket", "fifo", "truck"
        Information Flow: "production_control", "electronic_info", "manual_info", "kanban_post", "signal_kanban", "kanban_production", "kanban_withdrawal"
        
        **LAYOUT RULES:**
        - Material flow (horizontal): Left to right, Y = 300
        - Information flow (top): Y = 100-150 for production control and information nodes
        - Start X position: 100
        - Spacing: 200px horizontal between nodes
        - Production Control should be positioned at top-center (Y = 100)
        
        **EDGE TYPES:**
        - Material flow edges: type "smoothstep", connect processes/inventory horizontally
        - Information flow edges: type "step" or "straight", connect production control to processes
        - Use "markerEnd": { "type": "arrowclosed" } for all edges
        
        **JSON SCHEMA:**
        {
            "nodes": [
                {
                    "id": "node-0",
                    "type": "generic",
                    "position": { "x": 100, "y": 300 },
                    "data": {
                        "name": "Supplier Name",
                        "symbolType": "supplier"
                    }
                },
                {
                    "id": "node-pc",
                    "type": "productionControl",
                    "position": { "x": 600, "y": 100 },
                    "data": {
                        "name": "Production Control / MRP",
                        "symbolType": "production_control"
                    }
                },
                {
                    "id": "node-1",
                    "type": "process",
                    "position": { "x": 300, "y": 300 },
                    "data": {
                        "name": "Process Name",
                        "ct": 30,
                        "co": 0,
                        "uptime": 95,
                        "yield": 98,
                        "va": 25,
                        "operators": 1,
                        "processType": "normal",
                        "symbolType": "process"
                    }
                },
                {
                    "id": "node-2",
                    "type": "inventory",
                    "position": { "x": 500, "y": 300 },
                    "data": {
                        "name": "WIP Inventory",
                        "amount": 100,
                        "unit": "pcs",
                        "time": 3600,
                        "symbolType": "inventory"
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-0-1",
                    "source": "node-0",
                    "target": "node-1",
                    "type": "smoothstep",
                    "markerEnd": { "type": "arrowclosed" }
                },
                {
                    "id": "edge-pc-1",
                    "source": "node-pc",
                    "target": "node-1",
                    "type": "step",
                    "animated": true,
                    "style": { "stroke": "#ff6b35", "strokeWidth": 2, "strokeDasharray": "5,5" },
                    "markerEnd": { "type": "arrowclosed" }
                }
            ]
        }
        
        **CRITICAL INSTRUCTIONS:**
        1. ALWAYS create a "productionControl" node at the top (Y = 100) for information flow
        2. Connect production control to supplier with information edge (electronic or manual)
        3. Connect production control to each process with information edges (scheduling/kanban)
        4. Extract cycle times (ct) from description (in seconds). If not specified, use reasonable estimates.
        5. Create inventory nodes when mentioned (e.g., "inventory of 100 units", "buffer stock").
        6. Connect all material flow nodes sequentially with "smoothstep" edges.
        7. Information flow edges should use "step" type and have dashed style.
        8. Use "generic" type for suppliers/customers.
        9. Set reasonable defaults: uptime (95%), yield (98%), operators (1).
        10. Calculate VA (value-added time) as 80-90% of CT if not specified.
        11. Position nodes with proper spacing for readability.
        12. Return ONLY valid JSON, no markdown formatting or explanations.
        13. All text fields (names, descriptions) MUST be in ${language}.
        14. For kanban systems, add kanban_post nodes and connect with signal edges.
        
        **INFORMATION FLOW EXAMPLES:**
        - Production Control → Supplier: Weekly forecast (electronic_info)
        - Production Control → Process: Daily schedule (manual_info or kanban)
        - Process → Kanban Post: Pull signal (signal_kanban)
        
        **COMPLETE EXAMPLE:**
        
        Input (Indonesian): "Proses dimulai dari supplier ABC dengan forecast mingguan. Production control mengirim jadwal harian ke cutting (30 detik, 2 operator). Ada inventory 100 unit. Assembly 45 detik dengan kanban. QC 20 detik. Kirim ke customer XYZ."
        
        Output: 
        {
            "nodes": [
                {"id": "node-0", "type": "generic", "position": {"x": 100, "y": 300}, "data": {"name": "Supplier ABC", "symbolType": "supplier"}},
                {"id": "node-pc", "type": "productionControl", "position": {"x": 700, "y": 100}, "data": {"name": "Production Control", "symbolType": "production_control"}},
                {"id": "node-1", "type": "process", "position": {"x": 300, "y": 300}, "data": {"name": "Cutting", "ct": 30, "va": 25, "operators": 2, "uptime": 95, "yield": 98, "co": 0, "processType": "normal", "symbolType": "process"}},
                {"id": "node-2", "type": "inventory", "position": {"x": 500, "y": 300}, "data": {"name": "WIP", "amount": 100, "unit": "pcs", "time": 3600, "symbolType": "inventory"}},
                {"id": "node-3", "type": "process", "position": {"x": 700, "y": 300}, "data": {"name": "Assembly", "ct": 45, "va": 40, "operators": 1, "uptime": 95, "yield": 98, "co": 0, "processType": "normal", "symbolType": "process"}},
                {"id": "node-4", "type": "process", "position": {"x": 900, "y": 300}, "data": {"name": "QC", "ct": 20, "va": 18, "operators": 1, "uptime": 95, "yield": 98, "co": 0, "processType": "normal", "symbolType": "process"}},
                {"id": "node-5", "type": "generic", "position": {"x": 1100, "y": 300}, "data": {"name": "Customer XYZ", "symbolType": "customer"}}
            ],
            "edges": [
                {"id": "edge-0-1", "source": "node-0", "target": "node-1", "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-1-2", "source": "node-1", "target": "node-2", "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-2-3", "source": "node-2", "target": "node-3", "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-3-4", "source": "node-3", "target": "node-4", "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-4-5", "source": "node-4", "target": "node-5", "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-pc-0", "source": "node-pc", "target": "node-0", "type": "step", "animated": true, "style": {"stroke": "#ff6b35", "strokeDasharray": "5,5"}, "label": "Forecast Mingguan", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-pc-1", "source": "node-pc", "target": "node-1", "type": "step", "animated": true, "style": {"stroke": "#ff6b35", "strokeDasharray": "5,5"}, "label": "Jadwal Harian", "markerEnd": {"type": "arrowclosed"}},
                {"id": "edge-pc-3", "source": "node-pc", "target": "node-3", "type": "step", "animated": true, "style": {"stroke": "#ff6b35", "strokeDasharray": "5,5"}, "label": "Kanban", "markerEnd": {"type": "arrowclosed"}}
            ]
        }
        
        Now process the user's description and return the COMPLETE VSM JSON structure with BOTH material and information flows.
    `;



    console.log('Generating VSM from prompt...');
    const result = await callAIProvider(prompt, keyToUse, null, true);

    // Validate the result
    if (!result.nodes || !Array.isArray(result.nodes)) {
        throw new Error("Invalid AI response: missing or invalid 'nodes' array");
    }
    if (!result.edges || !Array.isArray(result.edges)) {
        throw new Error("Invalid AI response: missing or invalid 'edges' array");
    }

    console.log('VSM generated successfully:', result);
    return result;
};

/**
 * Generates a VSM structure from a hand-drawn image using Gemini Vision.
 * @param {string} imageData - Base64 encoded image data
 * @param {string} apiKey - The Google Gemini API Key
 * @param {string} language - The target language ('Indonesian' or 'English')
 * @returns {Promise<{nodes: Array, edges: Array}>} VSM structure with nodes and edges
 */
export const generateVSMFromImage = async (imageData, apiKey, language = 'English', specificModel = null) => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) {
        throw new Error("API Key is missing. Please configure it in AI Settings.");
    }

    const prompt = `
        You are an expert Lean Manufacturing Engineer and Computer Vision specialist.
        
        **TASK:**
        Analyze this hand-drawn Value Stream Map (VSM) diagram image and convert it into a digital VSM structure.
        
        **RECOGNITION GUIDELINES:**
        Look for these common VSM symbols in the hand-drawn image:
        
        1. **Process Boxes** - Rectangular boxes, usually containing process names and metrics (CT, operators, etc.)
        2. **Inventory Triangles** - Triangle shapes (▽) representing inventory/WIP between processes
        3. **Supplier/Customer Icons** - Factory-like shapes or house shapes at start/end
        4. **Arrows** - Solid arrows for material flow, dashed arrows for information flow
        5. **Production Control** - Box at top (often with "PPC", "MRP", "Production Control" label)
        6. **Information Flow** - Zigzag/lightning bolt lines or dashed lines connecting to production control
        7. **Trucks** - Truck icons for shipping/delivery
        8. **Timeline** - Stepped line at bottom showing lead times and cycle times
        9. **Kanban/Supermarket** - Shelving symbols or kanban card shapes
        10. **FIFO Lane** - Arrow with "FIFO" text
        
        **EXTRACTION RULES:**
        1. Read all TEXT from the image (process names, metrics, labels)
        2. Identify the FLOW direction (usually left to right for material, top to bottom for information)
        3. Extract CYCLE TIMES (CT) if visible (look for numbers with "s", "sec", "min", or just numbers)
        4. Extract INVENTORY amounts if visible (look for numbers near triangles)
        5. Identify CONNECTIONS between elements
        
        **OUTPUT FORMAT:**
        Return a JSON object with "nodes" and "edges" arrays.
        
        **NODE TYPES:**
        - "process" - For process boxes with metrics
        - "inventory" - For inventory triangles
        - "productionControl" - For production control/MRP
        - "generic" - For suppliers, customers, trucks, other symbols
        
        **LAYOUT:**
        - Material flow nodes: Y = 300, spaced 200px apart starting at X = 100
        - Production Control: Y = 100, centered (X = 600)
        - Information flow uses dashed animated edges
        
        **JSON SCHEMA:**
        {
            "nodes": [
                {
                    "id": "node-0",
                    "type": "generic",
                    "position": { "x": 100, "y": 300 },
                    "data": {
                        "name": "Supplier Name",
                        "symbolType": "supplier"
                    }
                },
                {
                    "id": "node-1",
                    "type": "process",
                    "position": { "x": 300, "y": 300 },
                    "data": {
                        "name": "Process Name",
                        "ct": 30,
                        "co": 0,
                        "uptime": 95,
                        "yield": 98,
                        "va": 25,
                        "operators": 1,
                        "processType": "normal",
                        "symbolType": "process"
                    }
                },
                {
                    "id": "node-2",
                    "type": "inventory",
                    "position": { "x": 500, "y": 300 },
                    "data": {
                        "name": "WIP",
                        "amount": 100,
                        "unit": "pcs",
                        "time": 3600,
                        "symbolType": "inventory"
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-0-1",
                    "source": "node-0",
                    "target": "node-1",
                    "type": "smoothstep",
                    "markerEnd": { "type": "arrowclosed" }
                }
            ]
        }
        
        **CRITICAL:**
        1. Extract ALL visible elements from the hand-drawn diagram
        2. Preserve the LEFT-TO-RIGHT sequence of processes
        3. If text is unclear, make reasonable guesses based on context
        4. If cycle times are not visible, set reasonable defaults (30-60 seconds)
        5. All text output MUST be in ${language}
        6. Return ONLY valid JSON, no markdown or explanations
        7. Always add Production Control node if there are information flow arrows
        8. Connect processes sequentially with material flow edges
        9. Add information flow edges (dashed, animated) from Production Control
    `;

    console.log(`Processing hand-drawn VSM image with model: ${specificModel || 'default'}...`);

    const result = await callGemini(prompt, keyToUse, specificModel, true, imageData);

    // Validate the result
    if (!result.nodes || !Array.isArray(result.nodes)) {
        throw new Error("Invalid AI response: missing or invalid 'nodes' array");
    }
    if (!result.edges || !Array.isArray(result.edges)) {
        throw new Error("Invalid AI response: missing or invalid 'edges' array");
    }

    console.log('Hand-drawn VSM processed successfully:', result);
    return result;
};

/**
 * Generates a motion analysis rule suggestion from an image.
 * Analyze posture, joint positions, and object interaction.
 */
export const generateAiRuleFromImage = async (imageData, apiKey, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) throw new Error("API Key missing");

    const prompt = `
        You are an Industrial Engineering Computer Vision Expert.
        
        **TASK:**
        Analyze the provided image (video frame highlighting a worker) and suggest a motion analysis rule for a Finite State Machine (FSM).
        
        **AVAILABLE RULE TYPES:**
        - POSE_ANGLE: Angle between 3 joints (e.g. elbow flex, knee bend). Use parameters: { jointA, jointB, jointC, operator (<, >), value (degrees) }.
        - POSE_RELATION: Distance or position relation. Use parameters: { jointA, jointB, component (x, y, z), targetType (POINT or VALUE), operator, value }.
        - OBJECT_PROXIMITY: Distance to a tool/object. Use parameters: { joint, objectClass, operator, distance (normalized 0-1) }.
        
        **AVAILABLE JOINTS:**
        nose, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle.
        
        **INSTRUCTIONS:**
        1. Identify the most critical posture or interaction in the image (e.g. "Operator picking up a part", "Operator bending over").
        2. Create ONE highly relevant rule that defines this state.
        3. Output MUST be valid JSON with this structure:
        {
            "reasoning": "Brief explanation of why this rule was chosen (max 1 sentence)",
            "type": "RULE_TYPE_HERE",
            "params": { ... appropriate params for that type ... }
        }
        
        4. Use **${language}** for the reasoning.
        5. Return ONLY the JSON.
    `;

    return await callAIProvider(prompt, keyToUse, "gemini-1.5-flash-002", true, imageData);
};

/**
 * Validates a custom motion script for logic and anatomical errors.
 */
export const validateAiRuleScript = async (script, apiKey, language = 'English') => {
    const keyToUse = getStoredApiKey(apiKey);
    if (!keyToUse) throw new Error("API Key missing");

    const prompt = `
        You are an Industrial Engineering Expert and Logic Validator.
        
        **TASK:**
        Analyze the following motion analysis script (DSL) for correctness, safety, and logic.
        
        **SCRIPT:**
        \`\`\`js
        ${script}
        \`\`\`
        
        **CONTEXT:**
        This script runs in a motion study tool using MediaPipe Pose keypoints (nose, shoulders, wrists, elbows, hips, knees, ankles).
        Functions available: dist(A, B), angle(A, B, C).
        Properties: joint.x, joint.y, joint.z.
        
        **INSTRUCTIONS:**
        1. Check if the logic is anatomically possible (e.g. checking if a hand is below a foot might be a mistake if the goal is picking something from a table).
        2. Check for syntax errors.
        3. Provide a brief explanation of what the script does and any potential issues.
        4. Suggest an improvement if there's a better way to write it.
        
        **OUTPUT FORMAT (JSON):**
        {
            "isValid": true/false,
            "explanation": "Brief explanation in ${language}",
            "issues": ["Issue 1", "Issue 2"],
            "suggestion": "Better script representation"
        }
        
        Return ONLY the JSON.
    `;

    return await callAIProvider(prompt, keyToUse, "gemini-1.5-flash-002", true);
};
