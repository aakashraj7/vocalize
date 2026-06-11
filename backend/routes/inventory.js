const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { parseVoiceTranscript, classifyIntent, generateDynamicReply, isPronounOrFiller, cleanProductName, analyzeLedgerSheet } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');

// In-memory fallback databases when MongoDB is not connected
let mockProducts = [];
let mockLogs = [];

// Helper to seed default mock products and logs for a specific userId
const ensureMockProductsSeeded = (userId) => {
  if (userId !== 'mock_user_123') return;
  const userProducts = mockProducts.filter(p => p.userId === userId);
  if (userProducts.length === 0) {
    const defaultMockProducts = [
      { _id: 'mock_p1_' + userId, name: 'rice', quantity: 12, unit: 'bags', price: 80, userId, updatedAt: new Date().toISOString() },
      { _id: 'mock_p2_' + userId, name: 'flour', quantity: 4, unit: 'bags', price: 40, userId, updatedAt: new Date().toISOString() },
      { _id: 'mock_p3_' + userId, name: 'milk', quantity: 0, unit: 'bottles', price: 25, userId, updatedAt: new Date().toISOString() },
      { _id: 'mock_p4_' + userId, name: 'sugar', quantity: 45, unit: 'kg', price: 15, userId, updatedAt: new Date().toISOString() }
    ];
    mockProducts.push(...defaultMockProducts);
    
    const defaultMockLogs = [
      {
        _id: 'mock_l1_' + userId,
        userId,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        originalTranscript: 'Added 12 bags of rice',
        parsedAction: 'ADD_STOCK',
        calculationDetail: '🎙️ Spoke: \'Added 12 bags of rice\' -> Action: Added +12 -> New Total: 12 Bags',
        targetProduct: 'rice',
        quantityChanged: 12,
        finalQuantity: 12
      },
      {
        _id: 'mock_l2_' + userId,
        userId,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        originalTranscript: 'Set sugar to 45 kg',
        parsedAction: 'SET_STOCK',
        calculationDetail: '🎙️ Spoke: \'Set sugar to 45 kg\' -> Action: Set to 45 -> New Total: 45 Kg',
        targetProduct: 'sugar',
        quantityChanged: 45,
        finalQuantity: 45
      }
    ];
    mockLogs.push(...defaultMockLogs);
  }
};

// Helper to seed default products and logs in MongoDB for the guest demo user
const ensureMongoDemoProductsSeeded = async (userId) => {
  if (userId !== 'mock_user_123') return;
  try {
    const productCount = await Product.countDocuments({ userId });
    if (productCount === 0) {
      const defaultProducts = [
        { name: 'rice', quantity: 12, unit: 'bags', price: 80, userId, updatedAt: new Date() },
        { name: 'flour', quantity: 4, unit: 'bags', price: 40, userId, updatedAt: new Date() },
        { name: 'milk', quantity: 0, unit: 'bottles', price: 25, userId, updatedAt: new Date() },
        { name: 'sugar', quantity: 45, unit: 'kg', price: 15, userId, updatedAt: new Date() }
      ];
      await Product.insertMany(defaultProducts);
      
      const defaultLogs = [
        {
          userId,
          timestamp: new Date(Date.now() - 3600000),
          originalTranscript: 'Added 12 bags of rice',
          parsedAction: 'ADD_STOCK',
          calculationDetail: "🎙️ Spoke: 'Added 12 bags of rice' -> Action: Added +12 -> New Total: 12 Bags",
          targetProduct: 'rice',
          quantityChanged: 12,
          finalQuantity: 12
        },
        {
          userId,
          timestamp: new Date(Date.now() - 7200000),
          originalTranscript: 'Set sugar to 45 kg',
          parsedAction: 'SET_STOCK',
          calculationDetail: "🎙️ Spoke: 'Set sugar to 45 kg' -> Action: Set to 45 -> New Total: 45 Kg",
          targetProduct: 'sugar',
          quantityChanged: 45,
          finalQuantity: 45
        }
      ];
      await AuditLog.insertMany(defaultLogs);
      console.log('Successfully seeded MongoDB collections for demo user mock_user_123');
    }
  } catch (err) {
    console.error('Error seeding MongoDB demo products/logs:', err);
  }
};

// Helper to check if Mongoose is connected to a live database
const isDbConnected = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

// Helper to fetch fresh products and date summaries
const getFreshProductsAndSummaries = async (userId) => {
  let products = [];
  let summaries = [];
  
  if (isDbConnected()) {
    if (userId === 'mock_user_123') {
      await ensureMongoDemoProductsSeeded(userId);
    }
    products = await Product.find({ userId }).sort({ name: 1 });
    const rawSummaries = await AuditLog.aggregate([
      { $match: { userId } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    summaries = rawSummaries.map(s => ({ date: s._id, count: s.count }));
  } else {
    ensureMockProductsSeeded(userId);
    products = mockProducts.filter(p => p.userId === userId).sort((a, b) => a.name.localeCompare(b.name));
    
    const counts = {};
    mockLogs.filter(log => log.userId === userId).forEach(log => {
      const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    summaries = Object.keys(counts).map(date => ({
      date,
      count: counts[date]
    })).sort((a, b) => b.date.localeCompare(a.date));
  }
  
  return { products, summaries };
};

// Get all products
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { search, status } = req.query;
    
    let productsList = [];
    
    if (isDbConnected()) {
      if (userId === 'mock_user_123') {
        await ensureMongoDemoProductsSeeded(userId);
      }
      let query = { userId };
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      productsList = await Product.find(query).sort({ name: 1 });
    } else {
      // Use mock fallback
      ensureMockProductsSeeded(userId);
      productsList = mockProducts.filter(p => p.userId === userId);
      if (search) {
        productsList = productsList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      }
      productsList.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Status filters
    if (status) {
      productsList = productsList.filter(product => {
        if (status === 'out_of_stock') {
          return product.quantity <= 0;
        } else if (status === 'low_stock') {
          return product.quantity > 0 && product.quantity < 5;
        } else if (status === 'in_stock') {
          return product.quantity >= 5;
        }
        return true;
      });
    }
    
    res.json(productsList);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all audit logs (optional fallback)
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    if (isDbConnected()) {
      if (userId === 'mock_user_123') {
        await ensureMongoDemoProductsSeeded(userId);
      }
      const logs = await AuditLog.find({ userId }).sort({ timestamp: -1 });
      res.json(logs);
    } else {
      ensureMockProductsSeeded(userId);
      const sortedMockLogs = mockLogs
        .filter(l => l.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(sortedMockLogs);
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get log summaries grouped by date
router.get('/logs/summaries', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (isDbConnected()) {
      if (userId === 'mock_user_123') {
        await ensureMongoDemoProductsSeeded(userId);
      }
      const summaries = await AuditLog.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);
      
      const formatted = summaries.map(s => ({
        date: s._id,
        count: s.count
      }));
      res.json(formatted);
    } else {
      ensureMockProductsSeeded(userId);
      const counts = {};
      mockLogs.filter(log => log.userId === userId).forEach(log => {
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      });
      
      const formatted = Object.keys(counts).map(date => ({
        date,
        count: counts[date]
      })).sort((a, b) => b.date.localeCompare(a.date));
      res.json(formatted);
    }
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get log details for a specific YYYY-MM-DD date
router.get('/logs/details/:date', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const targetDate = req.params.date; // "YYYY-MM-DD"
    
    if (isDbConnected()) {
      if (userId === 'mock_user_123') {
        await ensureMongoDemoProductsSeeded(userId);
      }
      const start = new Date(`${targetDate}T00:00:00.000Z`);
      const end = new Date(`${targetDate}T23:59:59.999Z`);
      
      const logs = await AuditLog.find({
        userId,
        timestamp: {
          $gte: start,
          $lte: end
        }
      }).sort({ timestamp: -1 });
      
      res.json(logs);
    } else {
      ensureMockProductsSeeded(userId);
      const logs = mockLogs.filter(log => {
        const logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
        return logDateStr === targetDate && log.userId === userId;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(logs);
    }
  } catch (error) {
    console.error('Error fetching detailed logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process voice transcript with sequential multi-connector execution
router.post('/voice-command', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { transcript } = req.body;
    
    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // 1. Classify the entire transcript first
    const classification = await classifyIntent(transcript);
    
    if (classification.intent === 'CONVERSATION') {
      const replyText = await generateDynamicReply(transcript);
      return res.json({
        success: true,
        type: 'chat',
        message: replyText
      });
    }
    
    // Fetch list of existing product names for semantic alignment context
    let existingProductNames = [];
    if (isDbConnected()) {
      if (userId === 'mock_user_123') {
        await ensureMongoDemoProductsSeeded(userId);
      }
      const products = await Product.find({ userId });
      existingProductNames = products.map(p => p.name);
    } else {
      ensureMockProductsSeeded(userId);
      existingProductNames = mockProducts.filter(p => p.userId === userId).map(p => p.name);
    }
    
    // 2. Parse the entire transcript into sequential actions (Gemini or Fallback)
    const parsedActions = await parseVoiceTranscript(transcript, existingProductNames);
    
    let productsUpdated = [];
    let updatedProductIds = [];
    let lastLog = null;
    let activeProductName = null;
    let lastParsed = null;
    let localProductCache = {};
    let savedLogs = [];
    let auditLogsToCreate = [];
    
    // Execute each parsed action sequentially
    for (const action of parsedActions) {
      let { productName, actionType, numericValue, unit, price } = action;
      
      // Clean product name
      productName = cleanProductName(productName, price);
      
      // Context inheritance fallback (just in case the parser missed it)
      if (!productName || productName === 'unknown-product' || isPronounOrFiller(productName)) {
        if (activeProductName) {
          productName = activeProductName;
        } else {
          continue; // Skip unrecognized parts
        }
      } else {
        activeProductName = productName;
      }
      
      lastParsed = { productName, actionType, numericValue, unit };
      
      // Conversion Heuristic: Storing "dozen" directly as number of units (1 dozen = 12 pcs)
      let finalQty = numericValue;
      let finalUnit = unit || 'pcs';
      if (unit && (unit.toLowerCase().startsWith('dozen') || unit.toLowerCase().startsWith('dozens'))) {
        finalQty = numericValue * 12;
        finalUnit = 'pcs';
      }
      
      let oldQty = 0;
      let newQty = 0;
      
      if (isDbConnected()) {
        let product = localProductCache[productName];
        if (!product) {
          product = await Product.findOne({ name: productName, userId });
        }
        if (product) {
          oldQty = product.quantity;
          if (finalUnit !== 'pcs' || product.unit === 'pcs') {
            product.unit = finalUnit;
          }
          if (price) product.price = price;
        } else {
          product = new Product({
            name: productName,
            quantity: 0,
            unit: finalUnit,
            price: price || null,
            userId,
            updatedAt: new Date()
          });
        }
        
        // Calculate balance
        if (actionType === 'ADD') {
          newQty = oldQty + finalQty;
        } else if (actionType === 'REMOVE') {
          newQty = Math.max(0, oldQty - finalQty);
        } else if (actionType === 'SET') {
          newQty = Math.max(0, finalQty);
        }
        
        product.quantity = newQty;
        product.updatedAt = new Date();
        await product.save();
        localProductCache[productName] = product;
        
        const prodId = product._id ? product._id.toString() : null;
        if (prodId && !updatedProductIds.includes(prodId)) {
          updatedProductIds.push(prodId);
        }
        
        const quantityChanged = newQty - oldQty;
        let parsedAction = 'SET_STOCK';
        if (actionType === 'ADD') parsedAction = 'ADD_STOCK';
        if (actionType === 'REMOVE') parsedAction = 'REMOVE_STOCK';
        
        const displayAction = actionType === 'ADD' ? `Added +${finalQty}` : 
                              actionType === 'REMOVE' ? `Subtracted -${finalQty}` : 
                              `Set to ${finalQty}`;
        const capitalizedUnit = product.unit.charAt(0).toUpperCase() + product.unit.slice(1);
        const stepSummary = `${displayAction} for "${productName}" (New Total: ${newQty} ${capitalizedUnit})`;
        
        auditLogsToCreate.push({
          isMock: false,
          productName,
          parsedAction,
          quantityChanged,
          finalQuantity: newQty,
          stepSummary,
          displayAction,
          newQty,
          capitalizedUnit
        });
        
      } else {
        // Mock DB fallback sequential execution
        ensureMockProductsSeeded(userId);
        let product = localProductCache[productName];
        if (!product) {
          product = mockProducts.find(p => p.name === productName && p.userId === userId);
        }
        if (product) {
          oldQty = product.quantity;
          if (finalUnit !== 'pcs' || product.unit === 'pcs') {
            product.unit = finalUnit;
          }
          if (price) product.price = price;
        } else {
          product = {
            _id: 'mock_p_' + Math.random().toString(36).substr(2, 9),
            name: productName,
            quantity: 0,
            unit: finalUnit,
            price: price || null,
            userId,
            updatedAt: new Date().toISOString()
          };
          mockProducts.push(product);
        }
        
        if (actionType === 'ADD') {
          newQty = oldQty + finalQty;
        } else if (actionType === 'REMOVE') {
          newQty = Math.max(0, oldQty - finalQty);
        } else if (actionType === 'SET') {
          newQty = Math.max(0, finalQty);
        }
        
        product.quantity = newQty;
        product.updatedAt = new Date().toISOString();
        localProductCache[productName] = product;
        
        const prodId = product._id ? product._id.toString() : null;
        if (prodId && !updatedProductIds.includes(prodId)) {
          updatedProductIds.push(prodId);
        }
        
        const quantityChanged = newQty - oldQty;
        let parsedAction = 'SET_STOCK';
        if (actionType === 'ADD') parsedAction = 'ADD_STOCK';
        if (actionType === 'REMOVE') parsedAction = 'REMOVE_STOCK';
        
        const displayAction = actionType === 'ADD' ? `Added +${finalQty}` : 
                              actionType === 'REMOVE' ? `Subtracted -${finalQty}` : 
                              `Set to ${finalQty}`;
        const capitalizedUnit = product.unit.charAt(0).toUpperCase() + product.unit.slice(1);
        const stepSummary = `${displayAction} for "${productName}" (New Total: ${newQty} ${capitalizedUnit})`;
        
        auditLogsToCreate.push({
          isMock: true,
          productName,
          parsedAction,
          quantityChanged,
          finalQuantity: newQty,
          stepSummary,
          displayAction,
          newQty,
          capitalizedUnit
        });
      }
      
      if (!productsUpdated.includes(productName)) {
        productsUpdated.push(productName);
      }
    }
    
    // Create audit logs with combined detail if multi-action
    if (auditLogsToCreate.length > 0) {
      let calculationDetail = '';
      if (auditLogsToCreate.length === 1) {
        const item = auditLogsToCreate[0];
        calculationDetail = `🎙️ Spoke: '${transcript}' -> Action: ${item.displayAction} -> New Total: ${item.newQty} ${item.capitalizedUnit}`;
      } else {
        const stepsStr = auditLogsToCreate.map((item, idx) => `[${idx + 1}] ${item.stepSummary}`).join(' then ');
        calculationDetail = `🎙️ Spoke: '${transcript}' -> Chained Actions: ${stepsStr}`;
      }
      
      for (const item of auditLogsToCreate) {
        if (!item.isMock) {
          const auditLog = new AuditLog({
            originalTranscript: transcript,
            parsedAction: item.parsedAction,
            calculationDetail,
            targetProduct: item.productName,
            quantityChanged: item.quantityChanged,
            finalQuantity: item.finalQuantity,
            userId
          });
          await auditLog.save();
          lastLog = auditLog;
          savedLogs.push(auditLog);
        } else {
          const auditLog = {
            _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            originalTranscript: transcript,
            parsedAction: item.parsedAction,
            calculationDetail,
            targetProduct: item.productName,
            quantityChanged: item.quantityChanged,
            finalQuantity: item.finalQuantity,
            userId
          };
          mockLogs.unshift(auditLog);
          lastLog = auditLog;
          savedLogs.push(auditLog);
        }
      }
    }
    
    // If no products were updated, return a dynamic chat warning
    if (productsUpdated.length === 0) {
      return res.json({
        success: true,
        type: 'chat',
        message: 'Could not resolve any inventory action from the statement.'
      });
    }

    // Read fresh lists
    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    
    // Prompt for price if any updated product is missing a price in the database and is in stock
    let promptForPrice = null;
    for (let name of productsUpdated) {
      const p = products.find(prod => prod.name === name);
      if (p && p.quantity > 0 && (p.price === undefined || p.price === null || p.price === 0)) {
        promptForPrice = { productName: name };
        break;
      }
    }
    
    return res.json({
      success: true,
      type: 'action',
      message: 'Database updated successfully',
      updatedData: products,
      products,
      summaries,
      promptForPrice,
      conversationalReply: null,
      log: lastLog,
      logs: savedLogs,
      updatedProductIds,
      parsedActions,
      parsed: lastParsed || {
        productName: 'unknown',
        actionType: 'UNKNOWN',
        numericValue: 0,
        unit: 'pcs'
      }
    });
    
  } catch (error) {
    console.error('Error processing voice command:', error);
    res.status(500).json({ error: 'Server error processing voice command', details: error.message });
  }
});

// Update the price of a product manually via terminal conversational flow
router.post('/products/set-price', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { productName, price } = req.body;
    
    if (!productName || price === undefined || price === null) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }
    
    if (isDbConnected()) {
      const product = await Product.findOne({ name: productName.toLowerCase().trim(), userId });
      if (product) {
        product.price = parseFloat(price);
        await product.save();
      }
    } else {
      ensureMockProductsSeeded(userId);
      const product = mockProducts.find(p => p.name === productName.toLowerCase().trim() && p.userId === userId);
      if (product) {
        product.price = parseFloat(price);
      }
    }
    
    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    res.json({ success: true, products, summaries });
  } catch (error) {
    console.error('Error setting price:', error);
    res.status(500).json({ error: 'Server error setting price' });
  }
});

// Manually add a new product
router.post('/products', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, quantity, unit, price } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    
    const cleanName = name.toLowerCase().trim();
    let savedLog = null;
    
    if (isDbConnected()) {
      let product = await Product.findOne({ name: cleanName, userId });
      if (product) {
        return res.status(400).json({ error: 'Product already exists. You can edit it instead.' });
      }
      
      product = new Product({
        name: cleanName,
        quantity: Number(quantity) || 0,
        unit: unit || 'pcs',
        price: price !== undefined && price !== null ? Number(price) : null,
        userId,
        updatedAt: new Date()
      });
      await product.save();
      
      const auditLog = new AuditLog({
        originalTranscript: `Manually added product "${cleanName}"`,
        parsedAction: 'ADD_STOCK',
        calculationDetail: `📝 Manually Added -> Product: "${cleanName}", Qty: ${product.quantity} ${product.unit}, Price: ₹${product.price || '-'}`,
        targetProduct: cleanName,
        quantityChanged: product.quantity,
        finalQuantity: product.quantity,
        userId
      });
      await auditLog.save();
      savedLog = auditLog;
    } else {
      ensureMockProductsSeeded(userId);
      let product = mockProducts.find(p => p.name === cleanName && p.userId === userId);
      if (product) {
        return res.status(400).json({ error: 'Product already exists. You can edit it instead.' });
      }
      
      product = {
        _id: 'mock_p_' + Math.random().toString(36).substr(2, 9),
        name: cleanName,
        quantity: Number(quantity) || 0,
        unit: unit || 'pcs',
        price: price !== undefined && price !== null ? Number(price) : null,
        userId,
        updatedAt: new Date().toISOString()
      };
      mockProducts.push(product);
      
      const auditLog = {
        _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalTranscript: `Manually added product "${cleanName}"`,
        parsedAction: 'ADD_STOCK',
        calculationDetail: `📝 Manually Added -> Product: "${cleanName}", Qty: ${product.quantity} ${product.unit}, Price: ₹${product.price || '-'}`,
        targetProduct: cleanName,
        quantityChanged: product.quantity,
        finalQuantity: product.quantity,
        userId
      };
      mockLogs.unshift(auditLog);
      savedLog = auditLog;
    }
    
    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    res.json({ success: true, products, summaries, log: savedLog });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Server error creating product' });
  }
});

// Manually update/edit a product (including unit, price, and stock)
router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { name, quantity, unit, price } = req.body;
    let savedLog = null;
    
    if (isDbConnected()) {
      let product = await Product.findOne({ _id: id, userId });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const oldQty = product.quantity;
      if (name) product.name = name.toLowerCase().trim();
      if (quantity !== undefined && quantity !== null) product.quantity = Number(quantity);
      if (unit) product.unit = unit;
      product.price = price !== undefined && price !== null && price !== "" ? Number(price) : null;
      product.updatedAt = new Date();
      await product.save();
      
      const quantityChanged = product.quantity - oldQty;
      
      const auditLog = new AuditLog({
        originalTranscript: `Manually updated product "${product.name}"`,
        parsedAction: 'SET_STOCK',
        calculationDetail: `📝 Manually Edited -> Product: "${product.name}", Qty: ${product.quantity} ${product.unit} (changed by ${quantityChanged}), Price: ₹${product.price || '-'}`,
        targetProduct: product.name,
        quantityChanged,
        finalQuantity: product.quantity,
        userId
      });
      await auditLog.save();
      savedLog = auditLog;
    } else {
      let product = mockProducts.find(p => p._id === id && p.userId === userId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const oldQty = product.quantity;
      if (name) product.name = name.toLowerCase().trim();
      if (quantity !== undefined && quantity !== null) product.quantity = Number(quantity);
      if (unit) product.unit = unit;
      product.price = price !== undefined && price !== null && price !== "" ? Number(price) : null;
      product.updatedAt = new Date().toISOString();
      
      const quantityChanged = product.quantity - oldQty;
      
      const auditLog = {
        _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalTranscript: `Manually updated product "${product.name}"`,
        parsedAction: 'SET_STOCK',
        calculationDetail: `📝 Manually Edited -> Product: "${product.name}", Qty: ${product.quantity} ${product.unit} (changed by ${quantityChanged}), Price: ₹${product.price || '-'}`,
        targetProduct: product.name,
        quantityChanged,
        finalQuantity: product.quantity,
        userId
      };
      mockLogs.unshift(auditLog);
      savedLog = auditLog;
    }
    
    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    res.json({ success: true, products, summaries, log: savedLog });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// Clear all inventory products and audit logs for the authenticated merchant
router.delete('/clear-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log(`Wiping all inventory and logs for user: ${userId}`);

    if (mongoose.connection.readyState === 1) {
      await Product.deleteMany({ userId });
      await AuditLog.deleteMany({ userId });
    } else {
      mockProducts = mockProducts.filter(p => p.userId !== userId);
      mockLogs = mockLogs.filter(l => l.userId !== userId);
    }

    res.json({ success: true, message: 'All merchant inventory data wiped out successfully.' });
  } catch (error) {
    console.error('Error clearing merchant data:', error);
    res.status(500).json({ error: 'Server error wiping merchant inventory data' });
  }
});

// Parse uploaded handwritten ledger page via Base64 payload
router.post('/products/upload-ledger', authMiddleware, async (req, res) => {
  try {
    const { fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'fileData (Base64 string) is required' });
    }

    // Strip header prefix if present (e.g. data:image/png;base64,)
    let base64Data = fileData;
    let actualMimeType = mimeType || 'image/jpeg';
    
    if (fileData.startsWith('data:')) {
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMimeType = match[1];
        base64Data = match[2];
      }
    }

    const items = await analyzeLedgerSheet(base64Data, actualMimeType);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error in upload-ledger route:', error);
    res.status(500).json({ error: 'Server error processing ledger upload' });
  }
});

// Public demo endpoint for unauthenticated landing page experience
router.post('/public/upload-ledger', async (req, res) => {
  try {
    const { fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'fileData (Base64 string) is required' });
    }

    let base64Data = fileData;
    let actualMimeType = mimeType || 'image/jpeg';
    
    if (fileData.startsWith('data:')) {
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMimeType = match[1];
        base64Data = match[2];
      }
    }

    const items = await analyzeLedgerSheet(base64Data, actualMimeType);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error in public upload-ledger route:', error);
    res.status(500).json({ error: error.message || 'Server error processing public ledger upload' });
  }
});

// Bulk import/initialize products catalog
router.post('/products/bulk', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const insertedProducts = [];
    let savedLog = null;

    if (mongoose.connection.readyState === 1) {
      for (const item of items) {
        const cleanName = item.name.toLowerCase().trim();
        let product = await Product.findOne({ name: cleanName, userId });
        if (product) {
          product.quantity += Number(item.quantity) || 0;
          if (item.price !== undefined && item.price !== null) {
            product.price = Number(item.price);
          }
          product.updatedAt = new Date();
          await product.save();
        } else {
          product = new Product({
            name: cleanName,
            quantity: Number(item.quantity) || 0,
            unit: item.unit || 'pcs',
            price: item.price !== undefined && item.price !== null ? Number(item.price) : null,
            userId,
            updatedAt: new Date()
          });
          await product.save();
        }
        insertedProducts.push(product);
      }

      const auditLog = new AuditLog({
        originalTranscript: `Bulk imported ${items.length} items from scanned ledger sheet`,
        parsedAction: 'ADD_STOCK',
        calculationDetail: `📝 Bulk Initialized -> Imported ${items.length} items from handwritten ledger sheet`,
        targetProduct: 'multiple-items',
        quantityChanged: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        finalQuantity: items.length,
        userId
      });
      await auditLog.save();
      savedLog = auditLog;
    } else {
      ensureMockProductsSeeded(userId);
      for (const item of items) {
        const cleanName = item.name.toLowerCase().trim();
        let product = mockProducts.find(p => p.name === cleanName && p.userId === userId);
        if (product) {
          product.quantity += Number(item.quantity) || 0;
          if (item.price !== undefined && item.price !== null) {
            product.price = Number(item.price);
          }
          product.updatedAt = new Date().toISOString();
        } else {
          product = {
            _id: 'mock_p_' + Math.random().toString(36).substr(2, 9),
            name: cleanName,
            quantity: Number(item.quantity) || 0,
            unit: item.unit || 'pcs',
            price: item.price !== undefined && item.price !== null ? Number(item.price) : null,
            userId,
            updatedAt: new Date().toISOString()
          };
          mockProducts.push(product);
        }
        insertedProducts.push(product);
      }

      const auditLog = {
        _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalTranscript: `Bulk imported ${items.length} items from scanned ledger sheet`,
        parsedAction: 'ADD_STOCK',
        calculationDetail: `📝 Bulk Initialized -> Imported ${items.length} items from handwritten ledger sheet`,
        targetProduct: 'multiple-items',
        quantityChanged: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        finalQuantity: items.length,
        userId
      };
      mockLogs.unshift(auditLog);
      savedLog = auditLog;
    }

    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    res.json({ 
      success: true, 
      products, 
      summaries, 
      log: savedLog,
      updatedProductIds: insertedProducts.map(p => p._id ? p._id.toString() : '')
    });
  } catch (error) {
    console.error('Error in bulk import route:', error);
    res.status(500).json({ error: 'Server error processing bulk import' });
  }
});

// Manually delete a product from the inventory completely
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    let savedLog = null;
    
    if (isDbConnected()) {
      const product = await Product.findOne({ _id: id, userId });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const productName = product.name;
      const finalQty = product.quantity;
      
      await Product.deleteOne({ _id: id, userId });
      
      const auditLog = new AuditLog({
        originalTranscript: `Manually deleted product "${productName}"`,
        parsedAction: 'REMOVE_STOCK',
        calculationDetail: `🗑️ Manually Deleted -> Product "${productName}" removed from system`,
        targetProduct: productName,
        quantityChanged: -finalQty,
        finalQuantity: 0,
        userId
      });
      await auditLog.save();
      savedLog = auditLog;
    } else {
      const productIndex = mockProducts.findIndex(p => p._id === id && p.userId === userId);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const productName = mockProducts[productIndex].name;
      const finalQty = mockProducts[productIndex].quantity;
      
      mockProducts.splice(productIndex, 1);
      
      const auditLog = {
        _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalTranscript: `Manually deleted product "${productName}"`,
        parsedAction: 'REMOVE_STOCK',
        calculationDetail: `🗑️ Manually Deleted -> Product "${productName}" removed from system`,
        targetProduct: productName,
        quantityChanged: -finalQty,
        finalQuantity: 0,
        userId
      };
      mockLogs.unshift(auditLog);
      savedLog = auditLog;
    }
    
    const { products, summaries } = await getFreshProductsAndSummaries(userId);
    res.json({ success: true, products, summaries, log: savedLog });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

module.exports = router;
