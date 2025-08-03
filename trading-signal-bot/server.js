const express = require('express');
const cors = require('cors');
const SmartMoneyAnalyzer = require('./src/SmartMoneyAnalyzer');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global API key variable - can be updated dynamically
let FMP_API_KEY = process.env.FMP_API_KEY || 'demo';

// Initialize the Smart Money Analyzer
let analyzer = new SmartMoneyAnalyzer(FMP_API_KEY);

// --- Request Throttling ---
let lastRequestTimestamp = 0;
const REQUEST_COOLDOWN = 15000; // 15 seconds

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Trading Signal Bot',
    version: '1.0.0'
  });
});

// Endpoint to update API key dynamically
app.post('/api/set-key', (req, res) => {
  try {
    const { newApiKey } = req.body;
    
    if (!newApiKey || typeof newApiKey !== 'string' || newApiKey.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid API key. Please provide a valid newApiKey in the request body.' 
      });
    }

    // Update the global API key
    FMP_API_KEY = newApiKey.trim();
    
    // Reinitialize the analyzer with the new API key
    analyzer = new SmartMoneyAnalyzer(FMP_API_KEY);
    
    console.log(`✅ API Key updated successfully at ${new Date().toISOString()}`);
    
    res.json({ 
      success: true, 
      message: 'API key updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error updating API key:', error.message);
    res.status(500).json({ 
      error: 'Failed to update API key',
      details: error.message 
    });
  }
});

// Main analysis endpoint
app.post('/api/analyze-symbol', async (req, res) => {
  const now = Date.now();
  if (now - lastRequestTimestamp < REQUEST_COOLDOWN) {
    const timeLeft = Math.ceil((REQUEST_COOLDOWN - (now - lastRequestTimestamp)) / 1000);
    return res.status(429).json({
      error: 'Too Many Requests',
      details: `Please wait ${timeLeft} seconds before making another request.`,
      symbol: req.body.symbol,
      timeframe: req.body.timeframe,
    });
  }
  lastRequestTimestamp = now;

  try {
    const { symbol, timeframe } = req.body;
    
    // Validate input parameters
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid symbol. Please provide a valid symbol (e.g., "EURUSD", "BTCUSD").' 
      });
    }
    
    if (!timeframe || typeof timeframe !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid timeframe. Please provide a valid timeframe (e.g., "5m", "1h", "1d").' 
      });
    }

    console.log(`🔍 Analyzing ${symbol} on ${timeframe} timeframe...`);
    
    // Perform the analysis
    const analysisResult = await analyzer.analyzeSymbol(symbol, timeframe);
    
    console.log(`✅ Analysis completed for ${symbol}:`, {
      direction: analysisResult.direction,
      confidence: analysisResult.confidence,
      entry: analysisResult.entry
    });
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error(`❌ Analysis failed for ${req.body.symbol || 'unknown symbol'}:`, error.message);
    
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message,
      symbol: req.body.symbol || 'unknown',
      timeframe: req.body.timeframe || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Get current API key status (for debugging)
app.get('/api/key-status', (req, res) => {
  res.json({
    hasApiKey: !!FMP_API_KEY && FMP_API_KEY !== 'demo',
    keyLength: FMP_API_KEY ? FMP_API_KEY.length : 0,
    isDemo: FMP_API_KEY === 'demo',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /api/set-key',
      'POST /api/analyze-symbol',
      'GET /api/key-status'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Trading Signal Bot started successfully!`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key status: ${FMP_API_KEY === 'demo' ? 'Demo mode' : 'Configured'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST /api/set-key - Update FMP API key`);
  console.log(`   POST /api/analyze-symbol - Analyze trading symbol`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/key-status - Check API key status\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Trading Signal Bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Trading Signal Bot...');
  process.exit(0);
});
