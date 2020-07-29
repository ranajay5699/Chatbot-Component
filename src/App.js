import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import Amplify from 'aws-amplify';
import { AmplifyTheme } from 'aws-amplify-react';
import ChatBot from './Chatbot/Chatbot'
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

const App = () => {
  
  // Imported default theme can be customized by overloading attributes
  const myTheme = {
    ...AmplifyTheme,
    sectionHeader: {
      ...AmplifyTheme.sectionHeader,
      backgroundColor: '#ff6600'
    },
    formSection: {
      ...AmplifyTheme.formSection,
      width: '100%'
    },
    sectionBody: {
      ...AmplifyTheme.sectionBody,
      height: "87vh"
    }
  }

  return (
    <div className="App">
      <ChatBot
          title="Prudential Bot"
          theme={myTheme}
          botName="RetUserTest_dev"
          welcomeMessage="Welcome, how can I help you today?"
          // onComplete={}
          clearOnComplete={false}
          conversationModeOn={false}
        />
    </div>
  );
}

export default App;
