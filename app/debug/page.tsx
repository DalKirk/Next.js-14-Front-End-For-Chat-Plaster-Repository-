'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { socketManager } from '@/lib/socket';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DebugPage() {
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [apiStatus, setApiStatus] = useState<'unknown' | 'working' | 'error'>('unknown');
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testApiConnection = async () => {
    addResult('Testing API connection...');
    try {
      const user = await apiClient.createUser('test-user-' + Date.now());
      setApiStatus('working');
      addResult(`✅ API working - Created user: ${user.username}`);
    } catch (error) {
      setApiStatus('error');
      addResult(`❌ API error: ${error}`);
    }
  };

  const testWebSocketConnection = async () => {
    addResult('Testing WebSocket connection...');
    setWsStatus('connecting');
    
    try {
      socketManager.connect('test-room', 'test-user');
      
      socketManager.onConnect((connected: boolean) => {
        if (connected) {
          setWsStatus('connected');
          addResult('✅ WebSocket connected successfully');
        } else {
          setWsStatus('disconnected');
          addResult('❌ WebSocket failed to connect');
        }
      });
      
      socketManager.onMessage((message) => {
        addResult(`📨 Received message: ${JSON.stringify(message)}`);
      });
      
    } catch (error) {
      setWsStatus('disconnected');
      addResult(`❌ WebSocket error: ${error}`);
    }
  };

  const sendTestMessage = () => {
    try {
      socketManager.sendMessage('Test message from debug page');
      addResult('📤 Test message sent');
    } catch (error) {
      addResult(`❌ Failed to send message: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-4">Backend Connection Debug</h1>
          
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">API Status</h3>
              <div className={`flex items-center space-x-2`}>
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'working' ? 'bg-green-400' : 
                  apiStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-white/70 capitalize">{apiStatus}</span>
              </div>
              <Button 
                onClick={testApiConnection} 
                variant="primary" 
                size="sm" 
                className="mt-2"
              >
                Test API
              </Button>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">WebSocket Status</h3>
              <div className={`flex items-center space-x-2`}>
                <div className={`w-3 h-3 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-400' : 
                  wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-white/70 capitalize">{wsStatus}</span>
              </div>
              <div className="space-x-2 mt-2">
                <Button 
                  onClick={testWebSocketConnection} 
                  variant="primary" 
                  size="sm"
                >
                  Test WebSocket
                </Button>
                {wsStatus === 'connected' && (
                  <Button 
                    onClick={sendTestMessage} 
                    variant="secondary" 
                    size="sm"
                  >
                    Send Message
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Backend URLs */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-2">Configuration</h3>
            <div className="text-sm text-white/70 space-y-1">
              <div>Environment: {process.env.NODE_ENV || 'development'}</div>
              <div>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</div>
              <div>Production URL: https://web-production-64adb.up.railway.app</div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Test Results</h3>
              <Button onClick={clearResults} variant="ghost" size="sm">
                Clear
              </Button>
            </div>
            <div className="bg-black/20 rounded p-3 max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-white/50">No tests run yet</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm text-white/80 font-mono">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}