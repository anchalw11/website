const axios = require('axios');

/**
 * Smart Money Concepts Analyzer
 * Implements professional trading analysis using institutional trading concepts
 */
class SmartMoneyAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://financialmodelingprep.com/api/v3';
    
    // Create axios instance with default config
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 second timeout
      params: {
        apikey: this.apiKey
      }
    });

    console.log(`🧠 Smart Money Analyzer initialized with API key: ${apiKey ? '***' + apiKey.slice(-4) : 'none'}`);
  }

  /**
   * Main analysis function - orchestrates the entire analysis process
   */
  async analyzeSymbol(symbol, timeframe) {
    try {
      console.log(`📊 Starting analysis for ${symbol} on ${timeframe}`);
      
      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(symbol, timeframe);
      
      if (!historicalData || historicalData.length < 20) {
        throw new Error(`Insufficient data for analysis. Need at least 20 candles, got ${historicalData?.length || 0}`);
      }

      console.log(`📈 Fetched ${historicalData.length} candles for analysis`);
      
      // Detect market structures
      const structures = this.detectMarketStructures(historicalData);
      
      // Generate trading signal based on detected structures
      const signal = this.generateTradingSignal(symbol, timeframe, historicalData, structures);
      
      return signal;
      
    } catch (error) {
      console.error(`❌ Analysis failed for ${symbol}:`, error.message);
      throw new Error(`Analysis failed for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Fetch historical candlestick data from FMP API
   */
  async fetchHistoricalData(symbol, timeframe) {
    try {
      // Handle different symbol formats for FMP API
      let endpoint;
      let formattedSymbol = symbol.toUpperCase();
      
      // Handle forex pairs (EUR/USD -> EURUSD)
      if (formattedSymbol.includes('/')) {
        formattedSymbol = formattedSymbol.replace('/', '');
        endpoint = `/historical-chart/${timeframe}/${formattedSymbol}`;
      } else {
        // Handle crypto and other assets
        endpoint = `/historical-chart/${timeframe}/${formattedSymbol}`;
      }

      console.log(`🌐 Fetching data from: ${this.baseUrl}${endpoint}`);
      
      const response = await this.apiClient.get(endpoint);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from FMP API');
      }

      if (response.data.length === 0) {
        throw new Error(`No data available for symbol ${symbol} on timeframe ${timeframe}`);
      }

      // Sort data by date (most recent first)
      const sortedData = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`✅ Successfully fetched ${sortedData.length} candles`);
      console.log(`📅 Data range: ${sortedData[sortedData.length - 1].date} to ${sortedData[0].date}`);
      
      return sortedData;
      
    } catch (error) {
      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;
        
        if (status === 401) {
          throw new Error('Invalid API key. Please check your FMP API key.');
        } else if (status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (status === 404) {
          throw new Error(`Symbol ${symbol} not found or invalid timeframe ${timeframe}.`);
        } else {
          throw new Error(`FMP API error (${status}): ${message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. FMP API is not responding.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to FMP API. Please check your internet connection.');
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  /**
   * Detect Smart Money Concepts structures in the price data
   */
  detectMarketStructures(data) {
    console.log(`🔍 Detecting market structures...`);
    
    const structures = {
      breakOfStructure: null,
      fairValueGap: null,
      marketBias: 'NEUTRAL'
    };

    try {
      // Detect Break of Structure (BOS)
      structures.breakOfStructure = this.detectBreakOfStructure(data);
      
      // Detect Fair Value Gap (FVG)
      structures.fairValueGap = this.detectFairValueGap(data);
      
      // Determine overall market bias
      structures.marketBias = this.determineMarketBias(structures);
      
      console.log(`📋 Structures detected:`, {
        BOS: structures.breakOfStructure?.type || 'None',
        FVG: structures.fairValueGap?.type || 'None',
        Bias: structures.marketBias
      });
      
      return structures;
      
    } catch (error) {
      console.error('❌ Error detecting structures:', error.message);
      return structures; // Return default structures on error
    }
  }

  /**
   * Detect Break of Structure (BOS)
   */
  detectBreakOfStructure(data) {
    try {
      const lookbackPeriod = 10;
      const currentCandle = data[0]; // Most recent candle
      
      if (data.length < lookbackPeriod + 1) {
        return null;
      }

      // Get the last 10 candles (excluding current)
      const recentCandles = data.slice(1, lookbackPeriod + 1);
      
      // Find highest high and lowest low in the lookback period
      const highestHigh = Math.max(...recentCandles.map(candle => candle.high));
      const lowestLow = Math.min(...recentCandles.map(candle => candle.low));
      
      // Check for bullish BOS (current high breaks above recent highest high)
      if (currentCandle.high > highestHigh) {
        console.log(`📈 Bullish BOS detected: ${currentCandle.high} > ${highestHigh}`);
        return {
          type: 'BULLISH',
          level: highestHigh,
          currentPrice: currentCandle.high,
          strength: this.calculateBOSStrength(currentCandle.high, highestHigh)
        };
      }
      
      // Check for bearish BOS (current low breaks below recent lowest low)
      if (currentCandle.low < lowestLow) {
        console.log(`📉 Bearish BOS detected: ${currentCandle.low} < ${lowestLow}`);
        return {
          type: 'BEARISH',
          level: lowestLow,
          currentPrice: currentCandle.low,
          strength: this.calculateBOSStrength(lowestLow, currentCandle.low)
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error detecting BOS:', error.message);
      return null;
    }
  }

  /**
   * Calculate the strength of a Break of Structure
   */
  calculateBOSStrength(brokenLevel, currentPrice) {
    const breakDistance = Math.abs(currentPrice - brokenLevel);
    const percentageBreak = (breakDistance / brokenLevel) * 100;
    
    // Classify strength based on percentage break
    if (percentageBreak > 0.5) return 'STRONG';
    if (percentageBreak > 0.2) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Detect Fair Value Gap (FVG)
   */
  detectFairValueGap(data) {
    try {
      if (data.length < 3) {
        return null;
      }

      // Get three consecutive candles (most recent first)
      const candle1 = data[2]; // First candle (oldest of the three)
      const candle2 = data[1]; // Middle candle
      const candle3 = data[0]; // Third candle (most recent)
      
      // Bullish FVG: High of first candle < Low of third candle
      if (candle1.high < candle3.low) {
        const gapSize = candle3.low - candle1.high;
        console.log(`📈 Bullish FVG detected: Gap from ${candle1.high} to ${candle3.low} (${gapSize.toFixed(5)})`);
        
        return {
          type: 'BULLISH',
          top: candle3.low,
          bottom: candle1.high,
          size: gapSize,
          strength: this.calculateFVGStrength(gapSize, candle2.close)
        };
      }
      
      // Bearish FVG: Low of first candle > High of third candle
      if (candle1.low > candle3.high) {
        const gapSize = candle1.low - candle3.high;
        console.log(`📉 Bearish FVG detected: Gap from ${candle3.high} to ${candle1.low} (${gapSize.toFixed(5)})`);
        
        return {
          type: 'BEARISH',
          top: candle1.low,
          bottom: candle3.high,
          size: gapSize,
          strength: this.calculateFVGStrength(gapSize, candle2.close)
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error detecting FVG:', error.message);
      return null;
    }
  }

  /**
   * Calculate the strength of a Fair Value Gap
   */
  calculateFVGStrength(gapSize, referencePrice) {
    const percentageGap = (gapSize / referencePrice) * 100;
    
    // Classify strength based on percentage gap
    if (percentageGap > 0.3) return 'STRONG';
    if (percentageGap > 0.1) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Determine overall market bias based on detected structures
   */
  determineMarketBias(structures) {
    const { breakOfStructure, fairValueGap } = structures;
    
    // Priority: BOS > FVG
    if (breakOfStructure) {
      return breakOfStructure.type;
    }
    
    if (fairValueGap) {
      return fairValueGap.type;
    }
    
    return 'NEUTRAL';
  }

  /**
   * Generate complete trading signal based on analysis
   */
  generateTradingSignal(symbol, timeframe, data, structures) {
    try {
      const currentCandle = data[0];
      const entryPrice = currentCandle.close;
      
      console.log(`🎯 Generating trading signal...`);
      
      // Determine signal direction
      const direction = this.determineSignalDirection(structures);
      
      if (direction === 'NEUTRAL') {
        return {
          symbol,
          timeframe,
          direction: 'NEUTRAL',
          analysis: 'No clear trading opportunity detected. Market is in consolidation or lacks sufficient structural confirmation.',
          confidence: 50,
          timestamp: new Date().toISOString(),
          structures: structures
        };
      }

      // Calculate trade parameters
      const tradeParams = this.calculateTradeParameters(entryPrice, direction);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(structures);
      
      // Generate analysis text
      const analysis = this.generateAnalysisText(structures, direction);
      
      const signal = {
        symbol,
        timeframe,
        direction,
        entry: this.formatPrice(tradeParams.entry),
        stopLoss: this.formatPrice(tradeParams.stopLoss),
        targets: {
          target1: this.formatPrice(tradeParams.targets.target1),
          target2: this.formatPrice(tradeParams.targets.target2),
          target3: this.formatPrice(tradeParams.targets.target3)
        },
        riskRewardRatio: '1:1, 1:2, 1:3',
        confidence,
        analysis,
        structures,
        timestamp: new Date().toISOString(),
        marketData: {
          currentPrice: this.formatPrice(entryPrice),
          high24h: this.formatPrice(Math.max(...data.slice(0, 24).map(c => c.high))),
          low24h: this.formatPrice(Math.min(...data.slice(0, 24).map(c => c.low))),
          volume: currentCandle.volume || 'N/A'
        }
      };

      console.log(`✅ Signal generated:`, {
        direction: signal.direction,
        entry: signal.entry,
        confidence: signal.confidence
      });
      
      return signal;
      
    } catch (error) {
      console.error('❌ Error generating signal:', error.message);
      throw new Error(`Signal generation failed: ${error.message}`);
    }
  }

  /**
   * Determine signal direction based on detected structures
   */
  determineSignalDirection(structures) {
    const { breakOfStructure, fairValueGap } = structures;

    // Generate a 'BUY' signal if a bullish BOS or a bullish FVG is detected.
    if (breakOfStructure?.type === 'BULLISH' || fairValueGap?.type === 'BULLISH') {
      return 'BUY';
    }

    // Generate a 'SELL' signal if a bearish BOS or a bearish FVG is detected.
    if (breakOfStructure?.type === 'BEARISH' || fairValueGap?.type === 'BEARISH') {
      return 'SELL';
    }

    // If no structures are detected, the signal should be 'NEUTRAL'.
    return 'NEUTRAL';
  }

  /**
   * Calculate trade parameters (entry, stop loss, take profits)
   */
  calculateTradeParameters(entryPrice, direction) {
    const riskPercentage = 0.015; // 1.5% risk
    
    let stopLoss, targets;
    
    if (direction === 'BUY') {
      // For BUY signals
      stopLoss = entryPrice * (1 - riskPercentage);
      const riskDistance = entryPrice - stopLoss;
      
      targets = {
        target1: entryPrice + (riskDistance * 1), // 1:1 RR
        target2: entryPrice + (riskDistance * 2), // 1:2 RR
        target3: entryPrice + (riskDistance * 3)  // 1:3 RR
      };
    } else {
      // For SELL signals
      stopLoss = entryPrice * (1 + riskPercentage);
      const riskDistance = stopLoss - entryPrice;
      
      targets = {
        target1: entryPrice - (riskDistance * 1), // 1:1 RR
        target2: entryPrice - (riskDistance * 2), // 1:2 RR
        target3: entryPrice - (riskDistance * 3)  // 1:3 RR
      };
    }

    return {
      entry: entryPrice,
      stopLoss,
      targets
    };
  }

  /**
   * Calculate confidence score based on detected structures
   */
  calculateConfidenceScore(structures) {
    // Start with a base confidence of 50%.
    let confidence = 50;
    
    const { breakOfStructure, fairValueGap } = structures;
    
    // Add 25% if a Break of Structure is detected.
    if (breakOfStructure) {
      confidence += 25;
      console.log(`📊 BOS confidence boost: +25`);
    }
    
    // Add 15% if a Fair Value Gap is detected.
    if (fairValueGap) {
      confidence += 15;
      console.log(`📊 FVG confidence boost: +15`);
    }
    
    // The maximum confidence should be capped at 95%.
    confidence = Math.min(confidence, 95);
    
    console.log(`📊 Final confidence score: ${confidence}%`);
    
    return confidence;
  }

  /**
   * Generate human-readable analysis text
   */
  generateAnalysisText(structures, direction) {
    const { breakOfStructure, fairValueGap } = structures;
    
    let analysis = '';
    
    if (direction === 'BUY') {
      analysis = 'Bullish momentum detected. ';
      
      if (breakOfStructure && breakOfStructure.type === 'BULLISH') {
        analysis += `Price has broken above the recent high of ${this.formatPrice(breakOfStructure.level)}, indicating institutional buying interest. `;
      }
      
      if (fairValueGap && fairValueGap.type === 'BULLISH') {
        analysis += `A bullish fair value gap has been identified between ${this.formatPrice(fairValueGap.bottom)} and ${this.formatPrice(fairValueGap.top)}, suggesting strong upward pressure. `;
      }
      
      analysis += 'This setup aligns with Smart Money Concepts for a potential long position.';
      
    } else if (direction === 'SELL') {
      analysis = 'Bearish momentum detected. ';
      
      if (breakOfStructure && breakOfStructure.type === 'BEARISH') {
        analysis += `Price has broken below the recent low of ${this.formatPrice(breakOfStructure.level)}, indicating institutional selling pressure. `;
      }
      
      if (fairValueGap && fairValueGap.type === 'BEARISH') {
        analysis += `A bearish fair value gap has been identified between ${this.formatPrice(fairValueGap.bottom)} and ${this.formatPrice(fairValueGap.top)}, suggesting strong downward pressure. `;
      }
      
      analysis += 'This setup aligns with Smart Money Concepts for a potential short position.';
    }
    
    return analysis;
  }

  /**
   * Format price to appropriate decimal places
   */
  formatPrice(price) {
    if (price > 100) {
      return price.toFixed(2); // For high-value assets like indices, crypto
    } else if (price > 10) {
      return price.toFixed(4); // For most forex pairs
    } else {
      return price.toFixed(5); // For low-value pairs
    }
  }

  /**
   * Update API key and reinitialize client
   */
  updateApiKey(newApiKey) {
    this.apiKey = newApiKey;
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      params: {
        apikey: this.apiKey
      }
    });
    
    console.log(`🔑 API key updated: ***${newApiKey.slice(-4)}`);
  }

  /**
   * Get analyzer status and configuration
   */
  getStatus() {
    return {
      apiKey: this.apiKey ? `***${this.apiKey.slice(-4)}` : 'Not set',
      baseUrl: this.baseUrl,
      timeout: this.apiClient.defaults.timeout,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SmartMoneyAnalyzer;
