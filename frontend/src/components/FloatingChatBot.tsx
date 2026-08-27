import React, { useState } from 'react';
import ChatBot from './ChatBot';

type FloatingChatBotProps = {
  patientId: string;
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  risk?: string;
};

const FloatingChatBot: React.FC<FloatingChatBotProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <style>{`
        .floating-chat-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        .chat-toggle-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(106, 17, 203, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .chat-toggle-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(106, 17, 203, 0.6);
        }
        
        .chat-toggle-button:active {
          transform: scale(0.95);
        }
        
        .chat-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          background: #ff4444;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        .chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 600px;
          background: var(--card);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
          border: 1px solid var(--border);
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chat-window-header {
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .chat-window-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 16px;
        }
        
        .chat-close-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.2s ease;
        }
        
        .chat-close-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }
        
        .chat-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        /* Hide ChatBot's own header when in floating mode */
        .chat-content .chatbot-header {
          display: none !important;
        }
        
        /* Adjust ChatBot messages container */
        .chat-content .chat-messages {
          flex: 1;
          padding: 20px;
        }
        
        @media (max-width: 768px) {
          .chat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            bottom: 80px;
            right: 20px;
            left: 20px;
          }
        }
      `}</style>
      
      <div className="floating-chat-container">
        {isOpen && (
          <div className="chat-window">
            <div className="chat-window-header">
              <div className="chat-window-title">
                <span>🤖</span>
                <span>Personal Health Assistant</span>
              </div>
              <button
                className="chat-close-button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ×
              </button>
            </div>
            <div className="chat-content" style={{ position: 'relative' }}>
              <ChatBot {...props} />
            </div>
          </div>
        )}
        
        <button
          className="chat-toggle-button"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Close chat' : 'Open health assistant'}
        >
          {isOpen ? '✕' : '💬'}
          {!isOpen && <span className="chat-badge">!</span>}
        </button>
      </div>
    </>
  );
};

export default FloatingChatBot;

