const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
const apiKey = process.env.GEMINI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '';

if (isApiKeyConfigured) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Clean product name helper
const cleanProductName = (name, price) => {
  if (!name) return '';
  // Convert to lowercase and trim
  let cleaned = name.toLowerCase().trim();

  // Strip common punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'[\]]/g, " ").trim();

  // Strip out numbers
  cleaned = cleaned.replace(/\d+/g, " ").trim();

  // Words to strip out
  const wordsToStrip = [
    'now', 'today', 'yesterday', 'please', 'just', 'for', 'costs', 'price', 'at', 
    'dollars', 'dollar', 'rupees', 'rupee', 'bucks', 'buck', 'inr', 'rs', 'usd', 'each',
    'yes', 'no', 'ok', 'okay', 'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'they', 
    'it', 'them', 'the', 'a', 'an', 'this', 'that', 'these', 'those', 'from', 'to', 
    'product', 'items', 'item', 'inventory'
  ];

  const regex = new RegExp(`\\b(${wordsToStrip.join('|')})\\b`, 'gi');
  cleaned = cleaned.replace(regex, ' ').replace(/\s+/g, ' ').trim();

  if (price) {
    cleaned = cleaned.replace(new RegExp(`\\b${price}\\b`, 'g'), '').trim();
  }

  return cleaned;
};

const isPronounOrFiller = (name) => {
  if (!name) return true;
  const clean = name.toLowerCase().trim();
  const blacklist = [
    'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'they', 'it', 'them',
    'yes', 'no', 'ok', 'okay', 'now', 'right', 'sure', 'the', 'a', 'an', 
    'this', 'that', 'these', 'those', 'there', 'here', 'product', 'item', 
    'inventory', 'from', 'to', 'for', 'at', 'in', 'of', 'them', 'it', 'now'
  ];
  return blacklist.includes(clean);
};

const findFuzzyMatch = (parsedName, existingNames) => {
  if (!parsedName || !existingNames || existingNames.length === 0) return parsedName;
  const target = parsedName.toLowerCase().trim();

  // 1. Exact match check
  if (existingNames.includes(target)) return target;

  // 2. Word-containment check (e.g. "water" matches "water bottle" or vice versa)
  for (const name of existingNames) {
    const existing = name.toLowerCase().trim();
    if (existing.includes(target) || target.includes(existing)) {
      return existing; // Match found
    }
  }

  return parsedName;
};

// Regex fallback parser for development when Gemini key is not configured or in case of errors
const parsePrice = (text) => {
  const priceMatch = text.match(/(?:price|for|costs|at|\$)\s*(\d+(?:\.\d+)?)(?:\s*(?:dollars|rupees|bucks|inr|rs|usd|each))?/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*(?:dollars|rupees|bucks|inr|rs|usd)/i);
  return priceMatch ? parseFloat(priceMatch[1]) : null;
};

// Regex fallback parser for development when Gemini key is not configured or in case of errors
const parseSingleClause = (clause) => {
  // Preprocess to add spaces between numbers and letters (e.g. "2kg" -> "2 kg")
  const lowercaseText = clause.toLowerCase().trim().replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');
  
  let actionType = 'SET';
  if (lowercaseText.includes('add') || lowercaseText.includes('bought') || lowercaseText.includes('increase') || lowercaseText.includes('plus') || lowercaseText.includes('receive') || lowercaseText.includes('have') || lowercaseText.includes('has') || lowercaseText.includes('had') || lowercaseText.includes('stock')) {
    actionType = 'ADD';
  } else if (lowercaseText.includes('remove') || lowercaseText.includes('sell') || lowercaseText.includes('sold') || lowercaseText.includes('subtract') || lowercaseText.includes('decrease') || lowercaseText.includes('minus') || lowercaseText.includes('take away') || lowercaseText.includes('delete')) {
    actionType = 'REMOVE';
  } else if (lowercaseText.includes('set') || lowercaseText.includes('update') || lowercaseText.includes('make') || lowercaseText.includes('equal') || lowercaseText.includes('to')) {
    actionType = 'SET';
  }

  // Replace words for numbers
  const cleanedText = lowercaseText
    .replace(/\bone\b/g, '1')
    .replace(/\btwo\b/g, '2')
    .replace(/\bthree\b/g, '3')
    .replace(/\bfour\b/g, '4')
    .replace(/\bfive\b/g, '5')
    .replace(/\bsix\b/g, '6')
    .replace(/\bseven\b/g, '7')
    .replace(/\beight\b/g, '8')
    .replace(/\bnine\b/g, '9')
    .replace(/\bten\b/g, '10');

  // Find numbers
  let numberMatch = cleanedText.match(/\b\d+(\.\d+)?\b/);
  let numericValue = numberMatch ? parseFloat(numberMatch[0]) : 1;

  // Pricing Heuristic: If only one number exists in the clause and it matches the price,
  // default the quantity to 1 (e.g. "add sugar for 20 dollars" -> Qty: 1, Price: 20)
  const price = parsePrice(cleanedText);
  const numbers = cleanedText.match(/\b\d+(\.\d+)?\b/g) || [];
  if (price && numbers.length === 1) {
    numericValue = 1;
  }

  let productName = '';
  let unit = 'pcs';

  // Heuristic 1: Quote Extraction
  const quotedMatch = clause.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    productName = quotedMatch[1].trim();
  }
  
  const commonUnits = ['bags', 'bag', 'kg', 'kgs', 'pcs', 'pc', 'boxes', 'box', 'bottles', 'bottle', 'packs', 'pack', 'items', 'item', 'liters', 'liter', 'units', 'unit', 'cans', 'can', 'sacks', 'sack', 'dozen', 'dozens'];

  if (!productName) {
    // Heuristic 2: Delete/Remove Pattern Matching
    if (actionType === 'REMOVE') {
      const removeMatch = cleanedText.match(/(?:remove|delete)\s+(?:the\s+)?(?:product\s+)?([a-z0-9\s]+?)(?:\s+from\s+the\s+inventory|\s+completely)*$/i) ||
                          cleanedText.match(/(?:remove|delete)\s+([a-z0-9\s]+?)(?:\s+from\s+the\s+inventory|\s+completely)*$/i);
      if (removeMatch) {
        const candidate = removeMatch[1].trim();
        if (candidate && candidate !== 'the' && candidate !== 'product') {
          productName = candidate;
          numericValue = 1; // Default to 1 for removal commands
          unit = 'pcs';
        }
      }
    }
  }

  if (!productName) {
    // 1. "[number] [unit] of [product]"
    const unitOfMatch = cleanedText.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s+(${commonUnits.join('|')})\\s+of\\s+([a-z0-9\\s]+)`, 'i'));
    if (unitOfMatch) {
      numericValue = parseFloat(unitOfMatch[1]);
      unit = unitOfMatch[2];
      productName = unitOfMatch[3].trim();
    } else {
      // 2. "[product] to/equal to/by [number] [unit]"
      const setToMatch = cleanedText.match(new RegExp(`(?:set|make|update|increase|decrease|add|remove|subtract|sold|sell|buy|bought|plus|minus)\\s+([a-z0-9\\s]+?)\\s+(?:to|equal\\s+to|by|at)\\s+(\\d+(?:\\.\\d+)?)(?:\\s+(${commonUnits.join('|')}))?`, 'i'));
      if (setToMatch) {
        productName = setToMatch[1].trim();
        numericValue = parseFloat(setToMatch[2]);
        unit = setToMatch[3] || 'pcs';
      } else {
        // 3. "[action] [number] [unit] [product]" or "[action] [number] [product]"
        const simpleMatch = cleanedText.match(new RegExp(`(?:add|remove|subtract|set|sell|sold|buy|bought|receive)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\w+)(?:\\s+([a-z0-9\\s]+))?`, 'i'));
        if (simpleMatch) {
          numericValue = parseFloat(simpleMatch[1]);
          const word1 = simpleMatch[2];
          const rest = simpleMatch[3];
          if (commonUnits.includes(word1) && rest) {
            unit = word1;
            productName = rest.trim();
          } else {
            unit = 'pcs';
            productName = rest ? `${word1} ${rest}`.trim() : word1;
          }
        }
      }
    }
  }

  // Fallback: If no product name was matched, strip verbs, units, and clean up whatever is left
  if (!productName) {
    let fallbackName = cleanedText;
    const verbs = ['add', 'bought', 'increase', 'plus', 'receive', 'remove', 'sell', 'sold', 'subtract', 'decrease', 'minus', 'take away', 'set', 'update', 'make', 'equal', 'to', 'have', 'has', 'had', 'stock', 'delete'];
    const verbRegex = new RegExp(`\\b(${verbs.join('|')})\\b`, 'gi');
    fallbackName = fallbackName.replace(verbRegex, ' ');

    const unitRegex = new RegExp(`\\b(${commonUnits.join('|')})\\b`, 'gi');
    fallbackName = fallbackName.replace(unitRegex, ' ');

    productName = cleanProductName(fallbackName, price);
  } else {
    productName = cleanProductName(productName, price);
  }
  
  if (!productName || productName === 'to' || productName === 'of' || productName === 'by') {
    productName = '';
  }

  return { productName, actionType, numericValue, unit, price };
};

const regexParser = (text, existingProductNames) => {
  const lowercaseText = text.toLowerCase().trim();
  
  // Split on multiple English connectors
  const clauses = lowercaseText
    .split(/\band\b|\bthen\b|\bbut\b|\bafter\s+that\b|\bnext\b|\bafterwards\b|,|\./)
    .map(c => c.trim())
    .filter(c => c !== '');

  const parsedActions = [];
  let activeProductName = null;

  for (let clause of clauses) {
    const cleanClause = clause.toLowerCase().trim();
    // Skip if the clause is empty or is just a conversational filler/pronoun with no numbers
    if (isPronounOrFiller(cleanClause) && !/\d/.test(cleanClause)) {
      continue;
    }

    const parsed = parseSingleClause(clause);
    let { productName, actionType, numericValue, unit, price } = parsed;

    // Clean product name
    productName = cleanProductName(productName, price);

    // Apply fuzzy matching alignment against existing products
    productName = findFuzzyMatch(productName, existingProductNames);

    // Context inheritance fallback
    if (!productName || productName === 'unknown-product' || isPronounOrFiller(productName)) {
      if (activeProductName) {
        productName = activeProductName;
      } else {
        productName = 'unknown-product';
      }
    } else {
      activeProductName = productName;
    }

    parsedActions.push({
      productName: productName || 'unknown-product',
      actionType,
      numericValue,
      unit,
      price
    });
  }

  return parsedActions;
};

const updateInventoryDeclaration = {
  name: 'updateInventory',
  description: 'Updates a product in the shop inventory by specifying the product name, action type (adding, removing, or setting stock), quantity (numeric value), and the unit of measurement.',
  parameters: {
    type: 'OBJECT',
    properties: {
      productName: {
        type: 'STRING',
        description: 'The name of the product. Keep it short, singular and lowercased where possible (e.g. "rice", "apple", "flour").'
      },
      actionType: {
        type: 'STRING',
        enum: ['ADD', 'REMOVE', 'SET'],
        description: 'The type of action: ADD (to add stock), REMOVE (to subtract stock), SET (to override or set stock to a specific level).'
      },
      numericValue: {
        type: 'NUMBER',
        description: 'The numeric quantity/amount to add, remove, or set.'
      },
      unit: {
        type: 'STRING',
        description: 'The unit of measurement (e.g., "bags", "kg", "pcs", "bottles", "boxes"). Default to "pcs" if unspecified.'
      }
    },
    required: ['productName', 'actionType', 'numericValue', 'unit']
  }
};

const respondToConversationDeclaration = {
  name: 'respondToConversation',
  description: 'Use this tool to generate a dynamic, friendly conversational response when the user greets you, asks a general question, or if their intent is unclear.',
  parameters: {
    type: 'OBJECT',
    properties: {
      replyText: {
        type: 'STRING',
        description: 'The natural, dynamic text reply to return to the user.'
      }
    },
    required: ['replyText']
  }
};

const classifyIntent = async (transcript) => {
  if (!isApiKeyConfigured) {
    // Fallback: Classify as COMMAND only if the transcript contains a digit (likely indicating a quantity or price)
    // to avoid treating general conversational words like "hello", "hi", "nonsense" as products.
    const hasNumber = /\d/.test(transcript);
    return { intent: hasNumber ? 'COMMAND' : 'CONVERSATION' };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: "You are an intent classifier for a store keeper's dashboard. Classify the user's spoken or typed prompt into one of two intents:\n- 'CONVERSATION': for greetings (e.g. 'hi', 'hello', 'hey', and phonetic spelling typos like 'hai', 'hii', 'hy', 'hlo', 'hey there'; general questions; testing statements; thanks; conversational chit-chat; or unrelated queries).\n- 'COMMAND': ONLY if the statement contains an explicit transaction instruction to add, remove, sell, buy, adjust, or set stock levels of a product. If a statement is a single word like 'hai' or 'hello' and contains no transaction intent, it MUST be classified as 'CONVERSATION'.\nReturn strictly in JSON format matching this schema: { \"intent\": \"CONVERSATION\" | \"COMMAND\" }.",
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            intent: {
              type: 'STRING',
              enum: ['CONVERSATION', 'COMMAND'],
              description: 'The classified intent of the user\'s input.'
            }
          },
          required: ['intent']
        }
      }
    });

    const data = JSON.parse(result.response.text().trim());
    return { intent: data.intent || 'COMMAND' };
  } catch (error) {
    console.error('Error in classifyIntent:', error);
    // Offline/Error Fallback
    const hasNumber = /\d/.test(transcript);
    return { intent: hasNumber ? 'COMMAND' : 'CONVERSATION' };
  }
};

const generateDynamicReply = async (transcript) => {
  if (!isApiKeyConfigured) {
    return "System Warning: Gemini API is currently offline/unconfigured. Please configure your API key to enable dynamic chat replies.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: "You are Vocalize, a friendly and helpful conversational assistant for a shopkeeper. Reply to the merchant's greeting, statement, question, or query in a direct, friendly, and concise manner (maximum 1-2 sentences). Do not mention technical tools, database schemas, or code details. Keep it natural and simple.",
    });

    const result = await model.generateContent(transcript);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error in generateDynamicReply:', error);
    return "System Warning: Gemini API encountered an error. Please check your internet connection or API usage quota.";
  }
};

const parseVoiceTranscript = async (transcript, existingProductNames = []) => {
  const price = parsePrice(transcript);

  if (!isApiKeyConfigured) {
    console.log('Gemini API key is placeholder or missing. Using Regex Parser Fallback.');
    return regexParser(transcript, existingProductNames);
  }

  try {
    const listContext = existingProductNames.length > 0 
      ? ` Here is the list of existing product names in the merchant's inventory: ${JSON.stringify(existingProductNames)}. If the spoken product name is a synonym, abbreviation, plural form, spelling error, or semantic match to an existing product (e.g., "water" or "bottles of water" matching "water bottle", "sugar bag" matching "sugar", "rice bags" matching "rice"), you MUST map the productName argument to that exact existing product name from the list instead of creating a new one.`
      : '';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: `You are an inventory data extraction assistant. Map the merchant's transaction command(s) to one or more updateInventory function tool calls. Extract the product name, action type (ADD, REMOVE, or SET), the numeric quantity, and the unit of measurement. Note: Resolve pronouns or reference words (like "it", "them", "now", "of them") or omitted product names using the previous clause context if applicable.${listContext}`,
    });

    const chat = model.startChat({
      tools: [{ functionDeclarations: [updateInventoryDeclaration] }],
      toolConfig: { 
        functionCallingConfig: { 
          mode: 'ANY', 
          allowedFunctionNames: ['updateInventory'] 
        } 
      }
    });

    const result = await chat.sendMessage(transcript);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const parsedActions = [];
      for (const call of functionCalls) {
        if (call.name === 'updateInventory') {
          const { productName, actionType, numericValue, unit } = call.args;
          let cleanedName = cleanProductName(productName, price);
          // Apply fuzzy alignment double-layer check
          cleanedName = findFuzzyMatch(cleanedName, existingProductNames);
          
          parsedActions.push({
            productName: cleanedName,
            actionType: actionType.toUpperCase(),
            numericValue: Number(numericValue),
            unit: unit || 'pcs',
            price
          });
        }
      }
      return parsedActions;
    }

    console.warn('Gemini API response did not yield function call updateInventory. Trying Regex parser fallback...');
    return regexParser(transcript, existingProductNames);

  } catch (error) {
    console.error('Error invoking Gemini API:', error.message);
    console.log('Trying Regex parser fallback...');
    return regexParser(transcript, existingProductNames);
  }
};

const analyzeLedgerSheet = async (base64Data, mimeType) => {
  if (!isApiKeyConfigured) {
    console.log('Gemini API key is unconfigured. Returning mock fallback ledger items.');
    return [
      { name: 'biscuit packs', quantity: 15, unit: 'packs', price: 10 },
      { name: 'cooking oil', quantity: 8, unit: 'bottles', price: 120 },
      { name: 'soap bars', quantity: 24, unit: 'pcs', price: 30 }
    ];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: "You are an expert inventory data extractor. Analyze the uploaded image or document containing a handwritten or printed shop ledger. Extract all products, their quantities, their units of measurement (e.g. 'kg', 'pcs', 'bags', 'bottles'), and their unit price if listed. Keep product names singular, lowercase, and short. Format your response strictly as a JSON object matching this schema: { \"items\": [ { \"name\": \"product name\", \"quantity\": 10, \"unit\": \"pcs\", \"price\": 1.50 } ] }.",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Please extract all the inventory items from this ledger.'
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: 'Product name, singularized and lowercase.' },
                  quantity: { type: 'NUMBER', description: 'Stock quantity.' },
                  unit: { type: 'STRING', description: 'Unit type, e.g. pcs, bags, kg. Default to pcs.' },
                  price: { type: 'NUMBER', description: 'Unit price, optional.' }
                },
                required: ['name', 'quantity', 'unit']
              }
            }
          },
          required: ['items']
        }
      }
    });

    const data = JSON.parse(result.response.text().trim());
    return data.items || [];
  } catch (error) {
    console.error('Error analyzing ledger sheet:', error);
    throw new Error(`Gemini API Failed: ${error.message || error}`);
  }
};

module.exports = {
  parseVoiceTranscript,
  classifyIntent,
  generateDynamicReply,
  regexParser,
  cleanProductName,
  isPronounOrFiller,
  findFuzzyMatch,
  analyzeLedgerSheet
};
