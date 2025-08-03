import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send, Bot, Zap, RefreshCw, Play, Pause } from 'lucide-react';

// Interface for the analysis result
interface AnalysisResult {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  entry: string;
  stopLoss: string;
  targets: {
    target1: string;
    target2: string;
    target3: string;
  };
  rsr: string;
  confidence: number;
  analysis: string;
  timestamp: string;
  status: 'draft' | 'sent';
}

// List of assets as requested
const assets = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD',
  'EUR/GBP', 'EUR/AUD', 'GBP/JPY', 'GBP/CHF', 'AUD/JPY', 'EUR/JPY', 'CAD/JPY',
  'CHF/JPY', 'NZD/JPY', 'XAU/USD', 'XAG/USD', 'USOIL', 'US30', 'US100'
];
const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

const AutomatedSignals: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoAnalysis, setIsAutoAnalysis] = useState(false);
  
  // Use state for selected asset and timeframe to allow manual changes
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[1]); // Default to 5m
  
  // State to cycle through assets in auto mode
  const [autoAssetIndex, setAutoAssetIndex] = useState(0);

  const runAnalysis = useCallback(async (asset: string, timeframe: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // This endpoint will be updated to use an API key for real-time data
      // instead of image processing.
      const response = await axios.post('http://localhost:3003/api/analyze-symbol', {
        symbol: asset,
        timeframe: timeframe,
      });
      setAnalysisResult({ ...response.data, id: `${asset}-${Date.now()}`, status: 'draft' });
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        // Display the specific error message from the backend
        setError(err.response.data.details || 'An unknown error occurred.');
      } else {
        setError('Failed to fetch analysis. Please ensure the analysis server is running and configured.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for automatic analysis
  useEffect(() => {
    if (isAutoAnalysis) {
      // Immediately run analysis for the first asset
      runAnalysis(assets[autoAssetIndex], selectedTimeframe);

      const interval = setInterval(() => {
        setAutoAssetIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % assets.length;
          runAnalysis(assets[nextIndex], selectedTimeframe);
          return nextIndex;
        });
      }, 600000); // 10 minutes
      return () => clearInterval(interval);
    }
  }, [isAutoAnalysis, selectedTimeframe, runAnalysis]);

  const handleManualAnalysis = () => {
    runAnalysis(selectedAsset, selectedTimeframe);
  };

  const handleSendToUsers = async (signal: AnalysisResult) => {
    try {
        // This endpoint sends the confirmed signal to be displayed on user dashboards
        await axios.post('http://localhost:3003/api/signals/send', signal);
        alert(`Signal for ${signal.symbol} sent successfully to all users!`);
        if(analysisResult?.id === signal.id) {
            setAnalysisResult({...analysisResult, status: 'sent'});
        }
    } catch (err) {
        alert('Failed to send signal.');
        console.error(err);
    }
  };

  const currentAssetForDisplay = isAutoAnalysis ? assets[autoAssetIndex] : selectedAsset;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-semibold text-white">Automated Signal Generator</h3>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            disabled={isAutoAnalysis}
          >
            {assets.map(asset => <option key={asset} value={asset}>{asset.replace('/', '')}</option>)}
          </select>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          <button
            onClick={handleManualAnalysis}
            disabled={isLoading || isAutoAnalysis}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>Analyze Now</span>
          </button>
          <button
            onClick={() => setIsAutoAnalysis(!isAutoAnalysis)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            {isAutoAnalysis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isAutoAnalysis ? 'Pause Auto' : 'Start Auto'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && (
           <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg">Analyzing {currentAssetForDisplay} on {selectedTimeframe}...</p>
           </div>
        )}
        {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg text-center">{error}</div>}
        {!isLoading && !error && !analysisResult && (
            <div className="text-center py-12 text-gray-500">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No signal generated. Start auto-analysis or analyze manually.</p>
            </div>
        )}
        {analysisResult && !isLoading && (
          <div className={`bg-gray-700/50 rounded-lg p-5 border-l-4 ${analysisResult.direction === 'BUY' ? 'border-green-400' : 'border-red-400'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3">
                  <span className={`text-2xl font-bold ${analysisResult.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {analysisResult.direction}
                  </span>
                  <span className="text-white font-semibold text-2xl">{analysisResult.symbol}</span>
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded-full text-gray-300">{analysisResult.timeframe}</span>
                </div>
                <p className="text-sm text-gray-300 mt-2">{analysisResult.analysis}</p>
              </div>
              <button 
                onClick={() => handleSendToUsers(analysisResult)}
                disabled={analysisResult.status === 'sent'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center space-x-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{analysisResult.status === 'sent' ? 'Sent' : 'Send to Users'}</span>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Entry</p>
                <p className="text-white font-mono text-base">{analysisResult.entry}</p>
              </div>
              <div>
                <p className="text-gray-400">Stop Loss</p>
                <p className="text-white font-mono text-base">{analysisResult.stopLoss}</p>
              </div>
              <div>
                <p className="text-gray-400">Risk/Reward</p>
                <p className="text-white font-mono text-base">{analysisResult.rsr}</p>
              </div>
              <div>
                <p className="text-gray-400">Confidence</p>
                <p className="text-white font-mono text-base">{analysisResult.confidence.toFixed(1)}%</p>
              </div>
            </div>
             <div className="mt-3">
                <p className="text-gray-400 text-sm">Targets</p>
                <div className="flex space-x-4 text-white font-mono text-base">
                    <span>TP1: {analysisResult.targets.target1}</span>
                    <span>TP2: {analysisResult.targets.target2}</span>
                    <span>TP3: {analysisResult.targets.target3}</span>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Generated: {new Date(analysisResult.timestamp).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutomatedSignals;
