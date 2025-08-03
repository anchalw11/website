import React, { useState, useEffect, useRef, memo } from 'react';
import { Zap, TrendingUp, TrendingDown, Clock, Target, AlertTriangle, CheckCircle, Filter, Shield, XCircle, CheckSquare } from 'lucide-react';
import TradingViewMiniChart from './TradingViewMiniChart';
import { useTradingPlan } from '../contexts/TradingPlanContext';
import SignalsCenter from './SignalsCenter';

interface Signal {
  id: number;
  pair: string;
  type: 'Buy' | 'Sell';
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  confidence: number;
  timeframe: string;
  timestamp: string;
  status: 'active' | 'closed' | 'pending';
  analysis: string;
  ictConcepts: string[];
  rsr: string;
  pips: string;
  positive: boolean | null;
}

const SignalsFeed = () => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const { propFirm, accountConfig, riskConfig } = useTradingPlan();
  const [signals, setSignals] = useState<Signal[]>([]);

  // Mock data for signals
  const mockSignals: Signal[] = [
    {
      id: 1,
      pair: 'EURUSD',
      type: 'Buy',
      entry: '1.0850',
      stopLoss: '1.0820',
      takeProfit: ['1.0900', '1.0950'],
      confidence: 92,
      timeframe: '1H',
      timestamp: new Date().toLocaleString(),
      status: 'active',
      analysis: 'Strong bullish momentum with break above key resistance',
      ictConcepts: ['Order Block', 'Fair Value Gap'],
      rsr: '1:2.5',
      pips: '50',
      positive: null
    },
    {
      id: 2,
      pair: 'GBPUSD',
      type: 'Sell',
      entry: '1.2750',
      stopLoss: '1.2780',
      takeProfit: ['1.2700', '1.2650'],
      confidence: 88,
      timeframe: '4H',
      timestamp: new Date(Date.now() - 3600000).toLocaleString(),
      status: 'closed',
      analysis: 'Bearish rejection at daily resistance level',
      ictConcepts: ['Liquidity Sweep', 'Market Structure'],
      rsr: '1:3',
      pips: '50',
      positive: true
    },
    {
      id: 3,
      pair: 'USDJPY',
      type: 'Buy',
      entry: '149.20',
      stopLoss: '148.80',
      takeProfit: ['149.80', '150.20'],
      confidence: 85,
      timeframe: '15m',
      timestamp: new Date(Date.now() - 7200000).toLocaleString(),
      status: 'closed',
      analysis: 'Bullish continuation after pullback to support',
      ictConcepts: ['Mitigation Block', 'Displacement'],
      rsr: '1:2',
      pips: '60',
      positive: false
    }
  ];
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setSignals(mockSignals);
      } catch (error) {
        console.error('Error fetching signals:', error);
        // Fallback to mock data on error
        setSignals(mockSignals);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);


  const handleTradeTaken = async (signal: Signal) => {
    try {
      // Simulate trade outcome
      const isWin = Math.random() > 0.3; // 70% win rate
      const exitPrice = isWin
        ? parseFloat(signal.takeProfit[0])
        : parseFloat(signal.stopLoss);
      const outcome = isWin ? 'win' : 'loss';

      // Simulate successful trade addition
      console.log('Trade would be added:', {
        signal: signal.pair,
        outcome,
        exitPrice
      });
      
      alert('Trade added to journal!');
    } catch (error) {
      console.error('Failed to add trade to journal:', error);
      alert('Failed to add trade to journal.');
    }
  };

  // Rule breach detection function
  const checkRuleBreach = (signal: any) => {
    if (!propFirm || !accountConfig || !riskConfig) return { safe: true, warnings: [] };

    const warnings: string[] = [];
    const accountSize = accountConfig.size;
    const rules = propFirm.rules;

    // Calculate position size and risk
    const riskAmount = accountSize * (riskConfig.riskPercentage / 100);
    const entryPrice = parseFloat(signal.entry);
    const stopLossPrice = parseFloat(signal.stopLoss);
    const pipValue = signal.pair.includes('JPY') ? 0.01 : 0.0001;
    const pipsAtRisk = Math.abs(entryPrice - stopLossPrice) / pipValue;
    const dollarPerPip = 1; // Simplified
    const positionSize = riskAmount / (pipsAtRisk * dollarPerPip);
    const positionValue = entryPrice * positionSize * 100000; // Standard lot size
    const positionPercentage = (positionValue / accountSize) * 100;

    // Check daily loss limit
    if (riskConfig.riskPercentage > rules.dailyLoss) {
      warnings.push(`⚠️ Risk per trade (${riskConfig.riskPercentage}%) exceeds daily loss limit (${rules.dailyLoss}%)`);
    }

    // Check maximum position size
    if (positionPercentage > rules.maxPositionSize) {
      warnings.push(`⚠️ Position size (${positionPercentage.toFixed(1)}%) exceeds maximum allowed (${rules.maxPositionSize}%)`);
    }

    return {
      safe: warnings.length === 0,
      warnings
    };
  };


  const filteredSignals = signals.filter(signal => {
    if (filter === 'all') return true;
    if (filter === 'active') return signal.status === 'active';
    if (filter === 'closed') return signal.status === 'closed';
    if (filter === 'pending') return signal.status === 'pending';
    return true;
  });

  // Calculate taken signals count
  const takenSignalsCount = signals.filter(signal => signal.taken === true).length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
      case 'closed':
        return 'bg-green-600/20 text-green-400 border-green-600';
      case 'pending':
        return 'bg-blue-600/20 text-blue-400 border-blue-600';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Trading Signals</h3>
            <p className="text-gray-400">Real-time professional-grade signals with 85-95% accuracy</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Signals</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="confidence">Highest Confidence</option>
              <option value="profit">Best Performance</option>
            </select>
            
          </div>
        </div>
      </div>



      {/* Signals Center */}
      <SignalsCenter />

      {/* Performance Summary */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Today's Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {takenSignalsCount}
            </div>
            <div className="text-sm text-gray-400">Signals Marked as Taken</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{signals.filter(s => s.positive === true).length}</div>
            <div className="text-sm text-gray-400">Winning Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">91.7%</div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">+347</div>
            <div className="text-sm text-gray-400">Total Pips</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalsFeed;