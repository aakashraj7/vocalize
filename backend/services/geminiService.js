const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
const apiKey = process.env.GEMINI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '';

if (isApiKeyConfigured) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Regex fallback parser for development when Gemini key is not configured or in case of errors
const regexParser = (text) => {
  const lowercaseText = text.toLowerCase().trim();
  
  let actionType = 'SET';
  if (lowercaseText.includes('add') || lowercaseText.includes('bought') || lowercaseText.includes('increase') || lowercaseText.includes('plus') || lowercaseText.includes('receive')) {
    actionType = 'ADD';
  } else if (lowercaseText.includes('remove') || lowercaseText.includes('sell') || lowercaseText.includes('sold') || lowercaseText.includes('subtract') || lowercaseText.includes('decrease') || lowercaseText.includes('minus') || lowercaseText.includes('take away')) {
    actionType = 'REMOVE';
  } else if (lowercaseText.includes('set') || lowercaseText.includes('update') || lowercaseText.includes('make') || lowercaseText.includes('equal') || lowercaseText.includes('to')) {
    actionType = 'SET';
  }

  // Find numbers
  let numberMatch = lowercaseText.match(/\b\d+(\.\d+)?\b/);
  let numericValue = numberMatch ? parseFloat(numberMatch[0]) : 1;

  let productName = 'item';
  let unit = 'pcs';
  
  const commonUnits = ['bags', 'bag', 'kg', 'kgs', 'pcs', 'pc', 'boxes', 'box', 'bottles', 'bottle', 'packs', 'pack', 'items', 'item', 'liters', 'liter', 'units', 'unit', 'cans', 'can', 'sacks', 'sack'];

  // 1. "add 5 bags of rice" or "remove 2 kg of flour"
  const unitOfMatch = lowercaseText.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s+(${commonUnits.join('|')})\\s+of\\s+([a-z0-9\\s]+)`, 'i'));
  if (unitOfMatch) {
    numericValue = parseFloat(unitOfMatch[1]);
    unit = unitOfMatch[2];
    productName = unitOfMatch[3].trim();
  } else {
    // 2. "set sugar to 10 packs" or "increase flour by 7 items"
    const setToMatch = lowercaseText.match(new RegExp(`(?:set|make|update|increase|decrease|add|remove|subtract|sold|sell|buy|bought|plus|minus)\\s+([a-z0-9\\s]+?)\\s+(?:to|equal\\s+to|by|at)\\s+(\\d+(?:\\.\\d+)?)(?:\\s+(${commonUnits.join('|')}))?`, 'i'));
    if (setToMatch) {
      productName = setToMatch[1].trim();
      numericValue = parseFloat(setToMatch[2]);
      unit = setToMatch[3] || 'pcs';
    } else {
      // 3. "add 12 apples" or "bought 5 rice"
      const simpleMatch = lowercaseText.match(new RegExp(`(?:add|remove|subtract|set|sell|sold|buy|bought|receive)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\w+)(?:\\s+([a-z0-9\\s]+))?`, 'i'));
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

  // Clean productName
  productName = productName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (!productName || productName === 'to' || productName === 'of' || productName === 'by') {
    productName = 'unknown-product';
  }

  return { 
    productName: productName.toLowerCase(), 
    actionType, 
    numericValue, 
    unit 
  };
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

const parseVoiceTranscript = async (transcript) => {
  if (!isApiKeyConfigured) {
    console.log('Gemini API key is placeholder or missing. Using Regex Parser Fallback.');
    return regexParser(transcript);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are an inventory voice parsing assistant. You must analyze the storekeeper\'s spoken text and map it to the updateInventory function tool call. Extract the product name (always singular, lowercase), the action type (ADD, REMOVE, or SET), the numeric quantity, and the unit of measurement.',
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
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'updateInventory') {
        const { productName, actionType, numericValue, unit } = call.args;
        return {
          productName: productName.toLowerCase().trim(),
          actionType: actionType.toUpperCase(),
          numericValue: Number(numericValue),
          unit: unit || 'pcs'
        };
      }
    }

    console.warn('Gemini API response did not yield function call updateInventory. Trying Regex parser fallback...');
    return regexParser(transcript);

  } catch (error) {
    console.error('Error invoking Gemini API:', error.message);
    console.log('Trying Regex parser fallback...');
    return regexParser(transcript);
  }
};

module.exports = {
  parseVoiceTranscript,
  regexParser // Exported for test verification
};
