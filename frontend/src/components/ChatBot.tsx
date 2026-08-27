import React, { useState, useRef, useEffect } from 'react';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// Types for conversation state
type ConversationState = {
  topic: string;
  step: number;
  data: Record<string, string>;
};

const ChatBot: React.FC<{ 
  patientId: string; 
  heartRate?: number; 
  spo2?: number; 
  temperature?: number;
  risk?: string;
}> = ({ patientId, heartRate, spo2, temperature, risk }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your personal health assistant. Ask me about your symptoms or health stats.",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Only scroll the chat container, not the entire page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is updated before scrolling
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        text: "Chat cleared. How can I help?",
        sender: 'bot',
        timestamp: new Date(),
      }
    ]);
    setConversationState(null);
  };

  const askFollowUpQuestion = (topic: string, question: string, step: number) => {
    setConversationState({
      topic,
      step,
      data: conversationState?.data || {}
    });
    
    const botMessage: Message = {
      id: messages.length + 1,
      text: question,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const handleHeadacheConversation = (userMessage: string): string | null => {
    if (!conversationState) {
      askFollowUpQuestion('headache', "Where is your headache located? (Forehead, temples, back of head, one side, all over)", 1);
      return null;
    }

    const newData = { ...conversationState.data };
    newData[`step${conversationState.step}`] = userMessage;

    switch (conversationState.step) {
      case 1: // Location
        newData.location = userMessage;
        askFollowUpQuestion('headache', "How long have you had this headache? (Hours, days, weeks)", 2);
        break;
      case 2: // Duration
        newData.duration = userMessage;
        askFollowUpQuestion('headache', "How severe is the pain? (Mild, moderate, severe) Rate 1-10", 3);
        break;
      case 3: // Severity
        newData.severity = userMessage;
        askFollowUpQuestion('headache', "Any other symptoms? (Nausea, vision changes, fever, neck stiffness)", 4);
        break;
      case 4: // Associated symptoms
        newData.symptoms = userMessage;
        setConversationState(null);
        
        // Analysis based on responses
        const location = newData.location || '';
        const duration = newData.duration || '';
        const severity = parseInt(newData.severity) || 0;
        const symptoms = newData.symptoms || '';
        
        let diagnosis = "";
        if (location.toLowerCase().includes('one side') && severity >= 7) {
          diagnosis = "This sounds like a migraine. Try resting in a dark room and staying hydrated. See a doctor if pain persists.";
        } else if (symptoms.toLowerCase().includes('fever') || symptoms.toLowerCase().includes('neck')) {
          diagnosis = "Headache with fever/neck stiffness could indicate infection. Seek medical attention immediately.";
        } else if (duration.includes('weeks') || duration.includes('days')) {
          diagnosis = "Persistent headache needs medical evaluation. Keep a headache diary to track patterns.";
        } else {
          diagnosis = "Tension headache likely. Try relaxation techniques, stay hydrated, and maintain regular sleep.";
        }
        
        return `Based on your symptoms:
• Location: ${location}
• Duration: ${duration}
• Severity: ${severity}/10
• Symptoms: ${symptoms}

${diagnosis}`;
      default:
        setConversationState(null);
        return "Let's start over. Where is your headache located?";
    }
    
    setConversationState({
      topic: 'headache',
      step: conversationState.step + 1,
      data: newData
    });
    return null;
  };

  const handleFeverConversation = (userMessage: string): string | null => {
    if (!conversationState) {
      askFollowUpQuestion('fever', "What is your temperature? (in °C or °F)", 1);
      return null;
    }

    const newData = { ...conversationState.data };
    newData[`step${conversationState.step}`] = userMessage;

    switch (conversationState.step) {
      case 1: // Temperature
        newData.temperature = userMessage;
        askFollowUpQuestion('fever', "How long have you had the fever? (Hours, days)", 2);
        break;
      case 2: // Duration
        newData.duration = userMessage;
        askFollowUpQuestion('fever', "Any other symptoms? (Cough, sore throat, body aches, rash)", 3);
        break;
      case 3: // Associated symptoms
        newData.symptoms = userMessage;
        setConversationState(null);
        
        // Analysis based on responses
        const tempStr = newData.temperature || '';
        const duration = newData.duration || '';
        const symptoms = newData.symptoms || '';
        
        let diagnosis = "";
        const tempValue = parseFloat(tempStr.replace(/[^\d.-]/g, ''));
        
        if (tempValue >= 39 || symptoms.toLowerCase().includes('difficulty')) {
          diagnosis = "High fever with concerning symptoms. Seek immediate medical care.";
        } else if (duration.includes('days')) {
          diagnosis = "Persistent fever needs medical evaluation. Stay hydrated and rest.";
        } else if (symptoms.toLowerCase().includes('cough') || symptoms.toLowerCase().includes('sore throat')) {
          diagnosis = "Likely viral infection. Rest, fluids, and over-the-counter medication can help.";
        } else {
          diagnosis = "Mild fever. Monitor temperature and symptoms. See a doctor if fever persists or worsens.";
        }
        
        return `Based on your symptoms:
• Temperature: ${tempStr}
• Duration: ${duration}
• Symptoms: ${symptoms}

${diagnosis}`;
      default:
        setConversationState(null);
        return "Let's start over. What is your temperature?";
    }
    
    setConversationState({
      topic: 'fever',
      step: conversationState.step + 1,
      data: newData
    });
    return null;
  };

  // Fallback responses for health questions, now personalized with vitals
  const getFallbackResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    
    // Personalized responses based on actual vitals
    if ((lowerMsg.includes('my') || lowerMsg.includes('current') || lowerMsg.includes('what is')) && 
        (lowerMsg.includes('heart') || lowerMsg.includes('hr') || lowerMsg.includes('pulse'))) {
      if (heartRate !== undefined) {
        if (heartRate < 60) {
          return `Your current heart rate is ${heartRate} bpm, which is below the normal range (60-100 bpm). This is called bradycardia. If you're feeling dizzy or fatigued, contact your doctor.`;
        } else if (heartRate > 100) {
          return `Your current heart rate is ${heartRate} bpm, which is above the normal range (60-100 bpm). This is called tachycardia. If you're experiencing palpitations or shortness of breath, contact your doctor.`;
        } else {
          return `Your current heart rate is ${heartRate} bpm, which is within the normal range (60-100 bpm). This is excellent!`;
        }
      } else {
        return "I don't have access to your current heart rate data right now. When available, a normal resting heart rate is between 60-100 beats per minute.";
      }
    }
    
    if ((lowerMsg.includes('my') || lowerMsg.includes('current') || lowerMsg.includes('what is')) && 
        (lowerMsg.includes('oxygen') || lowerMsg.includes('spo2'))) {
      if (spo2 !== undefined) {
        if (spo2 < 95) {
          return `Your current oxygen saturation is ${spo2}%, which is below the normal range (95-100%). This could indicate hypoxemia. Please contact your healthcare provider immediately.`;
        } else {
          return `Your current oxygen saturation is ${spo2}%, which is within the normal range (95-100%). This is excellent!`;
        }
      } else {
        return "I don't have access to your current oxygen saturation data right now. Normal blood oxygen saturation levels are typically between 95% and 100%.";
      }
    }
    
    if ((lowerMsg.includes('my') || lowerMsg.includes('current') || lowerMsg.includes('what is')) && 
        (lowerMsg.includes('temperature') || lowerMsg.includes('temp'))) {
      if (temperature !== undefined) {
        if (temperature >= 38) {
          return `Your current temperature is ${temperature}°C, which indicates a fever. Normal body temperature ranges from 36°C to 37.5°C. Stay hydrated and rest. Contact your doctor if it persists.`;
        } else if (temperature < 36) {
          return `Your current temperature is ${temperature}°C, which is below the normal range (36-37.5°C). This could indicate hypothermia. Please keep warm and contact your doctor.`;
        } else {
          return `Your current temperature is ${temperature}°C, which is within the normal range (36-37.5°C). This is excellent!`;
        }
      } else {
        return "I don't have access to your current temperature data right now. Normal body temperature ranges from 36°C to 37.5°C (96.8°F to 99.5°F).";
      }
    }
    
    if ((lowerMsg.includes('my') || lowerMsg.includes('current') || lowerMsg.includes('what is')) && 
        lowerMsg.includes('risk')) {
      if (risk) {
        if (risk === 'HIGH') {
          return `Your current risk level is HIGH. This indicates a serious health concern that requires immediate attention. Please contact your healthcare provider right away.`;
        } else if (risk === 'MEDIUM') {
          return `Your current risk level is MEDIUM. This indicates a moderate health concern. Please monitor your symptoms and contact your healthcare provider if they worsen.`;
        } else {
          return `Your current risk level is LOW. This indicates normal health status. Continue to maintain your healthy habits!`;
        }
      } else {
        return "I don't have access to your current risk level data right now. Your risk level is determined based on your vital signs.";
      }
    }
    
    // Health topics with comprehensive responses
    if (lowerMsg.includes('exercise') || lowerMsg.includes('workout') || lowerMsg.includes('fitness')) {
      return "Regular exercise benefits: improves heart health, strengthens muscles, boosts mood, increases energy, helps with weight management. Adults should aim for 150 minutes of moderate activity per week.";
    }
    
    if (lowerMsg.includes('diet') || lowerMsg.includes('nutrition') || lowerMsg.includes('food')) {
      return "Balanced diet includes: fruits, vegetables, whole grains, lean proteins, healthy fats. Limit processed foods, added sugars, and excessive sodium. Stay hydrated with water.";
    }
    
    if (lowerMsg.includes('sleep')) {
      return "Good sleep hygiene: 7-9 hours nightly for adults, consistent schedule, cool/dark room, limit screens before bed, avoid caffeine late in day.";
    }
    
    if (lowerMsg.includes('stress')) {
      return "Stress management: deep breathing, meditation, regular exercise, social support, time management, hobbies. Seek professional help for chronic stress.";
    }
    
    if (lowerMsg.includes('cold') || lowerMsg.includes('flu') || lowerMsg.includes('infection')) {
      return "Cold/flu symptoms: runny nose, sore throat, cough, fatigue. Rest, fluids, over-the-counter meds help. See doctor for severe symptoms or high fever.";
    }
    
    if (lowerMsg.includes('pain')) {
      return "For minor pain: rest, ice/heat, over-the-counter pain relievers. See doctor for severe, persistent, or worsening pain.";
    }
    
    if (lowerMsg.includes('medication') || lowerMsg.includes('drug') || lowerMsg.includes('prescription')) {
      return "Always follow prescription instructions. Take medications as directed, don't share prescriptions, store properly, be aware of side effects and interactions.";
    }
    
    if (lowerMsg.includes('mental') || lowerMsg.includes('depression') || lowerMsg.includes('anxiety')) {
      return "Mental health is important. Signs to watch: persistent sadness, anxiety, mood changes, withdrawal. Reach out to professionals, friends, or family when needed.";
    }
    
    if (lowerMsg.includes('diabetes')) {
      return "Diabetes management: monitor blood sugar, take medications as prescribed, eat balanced meals, exercise regularly, maintain healthy weight. See your doctor for regular checkups.";
    }
    
    if (lowerMsg.includes('blood pressure') || lowerMsg.includes('hypertension')) {
      return "Healthy blood pressure: below 120/80 mmHg. Manage with diet (low sodium), regular exercise, maintaining healthy weight, limiting alcohol, and managing stress.";
    }
    
    if (lowerMsg.includes('cholesterol')) {
      return "Healthy cholesterol: LDL below 100 mg/dL, HDL above 60 mg/dL. Manage with heart-healthy diet, regular exercise, maintaining healthy weight, and medications if prescribed.";
    }
    
    if (lowerMsg.includes('smoking') || lowerMsg.includes('quit smoking')) {
      return "Benefits of quitting smoking: improved lung function within days, reduced heart disease risk within a year, significantly reduced cancer risk over time. Seek support from healthcare providers.";
    }
    
    if (lowerMsg.includes('hydration') || lowerMsg.includes('water')) {
      return "Daily hydration: about 8 glasses (2L) of water for adults. More may be needed with exercise or in hot weather. Water is best, limit sugary drinks.";
    }
    
    if (lowerMsg.includes('vitamin') || lowerMsg.includes('supplement')) {
      return "Most people get enough nutrients from a balanced diet. Supplements may help if you have deficiencies. Consult your doctor before starting any supplements.";
    }
    
    // Default fallback
    return "I can help with health information on topics like exercise, diet, sleep, stress management, common illnesses, and medications. You can also ask me about your current vitals like heart rate, oxygen levels, temperature, or risk status.";
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowerMsg = userMessage.toLowerCase();
    
    // Handle ongoing conversations
    if (conversationState) {
      if (conversationState.topic === 'headache') {
        const response = handleHeadacheConversation(userMessage);
        if (response) return response;
        return ""; // Wait for next input
      } else if (conversationState.topic === 'fever') {
        const response = handleFeverConversation(userMessage);
        if (response) return response;
        return ""; // Wait for next input
      }
    }
    
    // Try to use AI API first (OpenAI or Gemini)
    try {
      const aiResponse = await callAIAPI(userMessage);
      if (aiResponse) {
        return aiResponse;
      }
    } catch (error) {
      console.error('AI API error:', error);
      // Fall back to hardcoded responses if AI fails
    }
    
    // Start new conversations or direct responses
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      return "Hi! I'm your personal health assistant. I can tell you about your current vitals or answer general health questions.";
    }
    
    // Start headache conversation - improved detection
    if ((lowerMsg.includes('headache') || lowerMsg.includes('head ache') || lowerMsg.includes('head pain') || 
         lowerMsg.includes('migraine') || lowerMsg.includes('throbbing') || lowerMsg.includes('head hurt') ||
         (lowerMsg.includes('head') && (lowerMsg.includes('pain') || lowerMsg.includes('hurts') || lowerMsg.includes('aching'))))) {
      const response = handleHeadacheConversation(userMessage);
      if (response) return response;
      return ""; // Wait for next input
    }
    
    // Start fever conversation - improved detection
    if (lowerMsg.includes('fever') || lowerMsg.includes('temperature') || lowerMsg.includes('temp') ||
        (lowerMsg.includes('hot') && lowerMsg.includes('feel')) || 
        (lowerMsg.includes('chill') && (lowerMsg.includes('have') || lowerMsg.includes('got')))) {
      const response = handleFeverConversation(userMessage);
      if (response) return response;
      return ""; // Wait for next input
    }
    
    // For all other health questions, use fallback responses
    return getFallbackResponse(userMessage);
  };

  // Call AI API (OpenAI ChatGPT or Google Gemini)
  const callAIAPI = async (userMessage: string): Promise<string | null> => {
    // Option 1: OpenAI ChatGPT API
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
    const USE_OPENAI = OPENAI_API_KEY && OPENAI_API_KEY.length > 0;

    // Option 2: Google Gemini API
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const USE_GEMINI = GEMINI_API_KEY && GEMINI_API_KEY.length > 0;

    // Build context with patient vitals
    const vitalContext = `
Patient's Current Vital Signs:
- Heart Rate: ${heartRate !== undefined ? `${heartRate} bpm` : 'Not available'}
- Oxygen Saturation (SpO2): ${spo2 !== undefined ? `${spo2}%` : 'Not available'}
- Temperature: ${temperature !== undefined ? `${temperature}°C` : 'Not available'}
- Risk Level: ${risk || 'Not available'}
`;

    const systemPrompt = `You are a helpful and professional health assistant for a patient monitoring system. 
You have access to the patient's current vital signs. Provide accurate, helpful, and empathetic health information.
Always remind users to consult healthcare professionals for serious concerns.
${vitalContext}`;

    // Try OpenAI first
    if (USE_OPENAI) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0]?.message?.content || null;
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    // Try Gemini if OpenAI not available
    if (USE_GEMINI) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\nUser Question: ${userMessage}\n\nAssistant:`
                }]
              }]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      } catch (error) {
        console.error('Gemini API error:', error);
      }
    }

    return null; // No AI API configured or failed
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;
    
    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputText;
    setInputText('');
    
    // Process response
    setTimeout(async () => {
      const botResponse = await generateResponse(userInput);
      // Only send response if not empty (for conversation flows)
      if (botResponse !== "") {
        const botMessage: Message = {
          id: messages.length + 2,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      }
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif"
    }}>
      <style>{`
        [data-theme="dark"] {
          --chat-header-bg: linear-gradient(135deg, #8a2be2 0%, #1e90ff 100%);
          --chat-header-text: #ffffff;
          --chat-user-msg-bg: linear-gradient(135deg, #6a0dad 0%, #4682b4 100%);
          --chat-bot-msg-bg: #2d3748;
          --chat-bot-msg-text: #e2e8f0;
          --chat-input-bg: #2d3748;
          --chat-input-text: #e9edf5;
          --chat-input-border: #4a5568;
          --chat-send-btn: linear-gradient(135deg, #8a2be2 0%, #1e90ff 100%);
          --chat-send-btn-hover: linear-gradient(135deg, #7a1bd2 0%, #1080e0 100%);
          --chat-send-btn-text: #ffffff;
          --chat-clear-btn: rgba(255, 255, 255, 0.2);
          --chat-clear-btn-hover: rgba(255, 255, 255, 0.35);
          --chat-clear-btn-text: #ffffff;
          --chat-timestamp: #a0aec0;
          --chat-scroll-bg: rgba(255, 255, 255, 0.1);
          --chat-scroll-thumb: rgba(255, 255, 255, 0.2);
          --chat-disabled-btn: #4a5568;
        }
        
        :root, [data-theme="light"] {
          --chat-header-bg: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          --chat-header-text: #ffffff;
          --chat-user-msg-bg: linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%);
          --chat-bot-msg-bg: #f0f4f8;
          --chat-bot-msg-text: #333333;
          --chat-input-bg: #ffffff;
          --chat-input-text: #1f2430;
          --chat-input-border: #e1e5e9;
          --chat-send-btn: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          --chat-send-btn-hover: linear-gradient(135deg, #5a0dc9 0%, #1a68f0 100%);
          --chat-send-btn-text: #ffffff;
          --chat-clear-btn: rgba(255, 255, 255, 0.25);
          --chat-clear-btn-hover: rgba(255, 255, 255, 0.4);
          --chat-clear-btn-text: #ffffff;
          --chat-timestamp: #6c757d;
          --chat-scroll-bg: rgba(0, 0, 0, 0.1);
          --chat-scroll-thumb: rgba(0, 0, 0, 0.2);
          --chat-disabled-btn: #cccccc;
        }
        
        /* Scrollbar styling */
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-messages::-webkit-scrollbar-track {
          background: var(--chat-scroll-bg);
          border-radius: 10px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
          background: var(--chat-scroll-thumb);
          border-radius: 10px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: var(--chat-scroll-thumb);
        }
      `}</style>
      
      <div 
        className="chatbot-header"
        style={{ 
          padding: '18px 20px', 
          borderBottom: '1px solid var(--border)',
          background: 'var(--chat-header-bg)',
          color: 'var(--chat-header-text)',
          fontWeight: 600,
          fontSize: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '22px' }}>🤖</div>
          <div>Personal Health Assistant</div>
        </div>
        <button
          onClick={clearChat}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'var(--chat-clear-btn)',
            color: 'var(--chat-clear-btn-text)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--chat-clear-btn-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--chat-clear-btn)'}
        >
          Clear Chat
        </button>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="chat-messages" 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--bg)'
        }}
      >
        {messages.map((message) => (
          <div 
            key={message.id} 
            style={{
              maxWidth: '85%',
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '22px',
                background: message.sender === 'user' 
                  ? 'var(--chat-user-msg-bg)' 
                  : 'var(--chat-bot-msg-bg)',
                color: message.sender === 'user' ? '#ffffff' : 'var(--chat-bot-msg-text)',
                fontSize: '15px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ 
                position: 'relative', 
                zIndex: 2 
              }}>
                {message.text}
              </div>
              {message.sender === 'bot' && (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  borderRadius: '22px',
                  zIndex: 1
                }} />
              )}
            </div>
            <div 
              style={{ 
                fontSize: '11px', 
                color: 'var(--chat-timestamp)', 
                marginTop: '6px',
                textAlign: message.sender === 'user' ? 'right' : 'left',
                fontWeight: 500
              }}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your vitals or health topics..."
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: '24px',
              border: '1px solid var(--chat-input-border)',
              background: 'var(--chat-input-bg)',
              color: 'var(--chat-input-text)',
              fontSize: '14px',
              resize: 'none',
              minHeight: '50px',
              maxHeight: '120px',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#6a11cb'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--chat-input-border)'}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={inputText.trim() === ''}
            style={{
              padding: '0 24px',
              borderRadius: '24px',
              border: 'none',
              background: inputText.trim() === '' ? 'var(--chat-disabled-btn)' : 'var(--chat-send-btn)',
              color: 'var(--chat-send-btn-text)',
              fontWeight: 600,
              cursor: inputText.trim() === '' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              transition: 'all 0.2s ease',
              boxShadow: inputText.trim() === '' ? 'none' : '0 4px 12px rgba(106, 17, 203, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (inputText.trim() !== '') {
                e.currentTarget.style.background = 'var(--chat-send-btn-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(106, 17, 203, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = inputText.trim() === '' ? 'var(--chat-disabled-btn)' : 'var(--chat-send-btn)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = inputText.trim() === '' ? 'none' : '0 4px 12px rgba(106, 17, 203, 0.3)';
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;