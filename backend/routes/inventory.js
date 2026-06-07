const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { parseVoiceTranscript } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');

// In-memory fallback databases when MongoDB is not connected
let mockProducts = [
  { _id: 'mock_p1', name: 'rice', quantity: 12, unit: 'bags', updatedAt: new Date().toISOString() },
  { _id: 'mock_p2', name: 'flour', quantity: 4, unit: 'bags', updatedAt: new Date().toISOString() },
  { _id: 'mock_p3', name: 'milk', quantity: 0, unit: 'bottles', updatedAt: new Date().toISOString() },
  { _id: 'mock_p4', name: 'sugar', quantity: 45, unit: 'kg', updatedAt: new Date().toISOString() }
];

let mockLogs = [
  {
    _id: 'mock_l1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    originalTranscript: 'Added 12 bags of rice',
    parsedAction: 'ADD_STOCK',
    calculationDetail: '🎙️ Spoke: \'Added 12 bags of rice\' -> Action: Added +12 -> New Total: 12 Bags',
    targetProduct: 'rice',
    quantityChanged: 12,
    finalQuantity: 12
  },
  {
    _id: 'mock_l2',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    originalTranscript: 'Set sugar to 45 kg',
    parsedAction: 'SET_STOCK',
    calculationDetail: '🎙️ Spoke: \'Set sugar to 45 kg\' -> Action: Set to 45 -> New Total: 45 Kg',
    targetProduct: 'sugar',
    quantityChanged: 45,
    finalQuantity: 45
  }
];

// Helper to check if Mongoose is connected to a live database
const isDbConnected = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

// Get all products
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { search, status } = req.query;
    
    let productsList = [];
    
    if (isDbConnected()) {
      let query = { userId };
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      productsList = await Product.find(query).sort({ name: 1 });
    } else {
      // Use mock fallback
      productsList = [...mockProducts];
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

// Get all audit logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (isDbConnected()) {
      const logs = await AuditLog.find({ userId }).sort({ timestamp: -1 });
      res.json(logs);
    } else {
      // Return mock logs
      const sortedMockLogs = [...mockLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(sortedMockLogs);
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process voice transcript
router.post('/voice-command', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { transcript } = req.body;
    
    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // Parse using Gemini (or Regex fallback)
    const parsed = await parseVoiceTranscript(transcript);
    const { productName, actionType, numericValue, unit } = parsed;
    
    let oldQty = 0;
    let newQty = 0;
    let finalUnit = unit || 'pcs';
    
    if (isDbConnected()) {
      let product = await Product.findOne({ name: productName, userId });
      if (product) {
        oldQty = product.quantity;
        product.unit = unit || product.unit;
      } else {
        product = new Product({
          name: productName,
          quantity: 0,
          unit: finalUnit,
          userId,
          updatedAt: new Date()
        });
      }
      
      // Calculate
      if (actionType === 'ADD') {
        newQty = oldQty + numericValue;
      } else if (actionType === 'REMOVE') {
        newQty = Math.max(0, oldQty - numericValue);
      } else if (actionType === 'SET') {
        newQty = Math.max(0, numericValue);
      }
      
      product.quantity = newQty;
      product.updatedAt = new Date();
      await product.save();
      
      const quantityChanged = newQty - oldQty;
      let parsedAction = 'SET_STOCK';
      if (actionType === 'ADD') parsedAction = 'ADD_STOCK';
      if (actionType === 'REMOVE') parsedAction = 'REMOVE_STOCK';
      
      const displayAction = actionType === 'ADD' ? `Added +${numericValue}` : 
                            actionType === 'REMOVE' ? `Subtracted -${numericValue}` : 
                            `Set to ${numericValue}`;
      const capitalizedUnit = product.unit.charAt(0).toUpperCase() + product.unit.slice(1);
      const calculationDetail = `🎙️ Spoke: '${transcript}' -> Action: ${displayAction} -> New Total: ${newQty} ${capitalizedUnit}`;
      
      const auditLog = new AuditLog({
        originalTranscript: transcript,
        parsedAction,
        calculationDetail,
        targetProduct: productName,
        quantityChanged,
        finalQuantity: newQty,
        userId
      });
      await auditLog.save();
      
      const products = await Product.find({ userId }).sort({ name: 1 });
      const logs = await AuditLog.find({ userId }).sort({ timestamp: -1 });
      
      return res.json({
        success: true,
        message: 'Database updated standardly.',
        product: {
          name: productName,
          quantity: newQty,
          unit: product.unit,
          updatedAt: product.updatedAt
        },
        parsed: { productName, actionType, numericValue, unit: product.unit },
        log: auditLog,
        products,
        logs
      });
      
    } else {
      // In-memory mock DB operations
      let product = mockProducts.find(p => p.name === productName);
      if (product) {
        oldQty = product.quantity;
        product.unit = unit || product.unit;
      } else {
        product = {
          _id: 'mock_p_' + Math.random().toString(36).substr(2, 9),
          name: productName,
          quantity: 0,
          unit: finalUnit,
          updatedAt: new Date().toISOString()
        };
        mockProducts.push(product);
      }
      
      // Calculate
      if (actionType === 'ADD') {
        newQty = oldQty + numericValue;
      } else if (actionType === 'REMOVE') {
        newQty = Math.max(0, oldQty - numericValue);
      } else if (actionType === 'SET') {
        newQty = Math.max(0, numericValue);
      }
      
      product.quantity = newQty;
      product.updatedAt = new Date().toISOString();
      
      const quantityChanged = newQty - oldQty;
      let parsedAction = 'SET_STOCK';
      if (actionType === 'ADD') parsedAction = 'ADD_STOCK';
      if (actionType === 'REMOVE') parsedAction = 'REMOVE_STOCK';
      
      const displayAction = actionType === 'ADD' ? `Added +${numericValue}` : 
                            actionType === 'REMOVE' ? `Subtracted -${numericValue}` : 
                            `Set to ${numericValue}`;
      const capitalizedUnit = product.unit.charAt(0).toUpperCase() + product.unit.slice(1);
      const calculationDetail = `🎙️ Spoke: '${transcript}' -> Action: ${displayAction} -> New Total: ${newQty} ${capitalizedUnit}`;
      
      const auditLog = {
        _id: 'mock_l_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        originalTranscript: transcript,
        parsedAction,
        calculationDetail,
        targetProduct: productName,
        quantityChanged,
        finalQuantity: newQty
      };
      mockLogs.unshift(auditLog);
      
      return res.json({
        success: true,
        message: 'Database updated standardly (Mock Mode).',
        product,
        parsed: { productName, actionType, numericValue, unit: product.unit },
        log: auditLog,
        products: [...mockProducts].sort((a, b) => a.name.localeCompare(b.name)),
        logs: [...mockLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      });
    }
    
  } catch (error) {
    console.error('Error processing voice command:', error);
    res.status(500).json({ 
      error: 'Server error processing voice command', 
      details: error.message 
    });
  }
});

module.exports = router;
