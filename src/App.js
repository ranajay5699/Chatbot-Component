import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import Amplify from 'aws-amplify';
import { AmplifyTheme } from 'aws-amplify-react';
import ChatBot from './Chatbot/Chatbot'
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

const App = () => {

  useEffect(() => {
    // if(getCookie("gibby") !== ""){
    //   Interactions.send("RetUser")
    // }
  });

  // Imported default theme can be customized by overloading attributes
  const myTheme = {
    ...AmplifyTheme,
    sectionHeader: {
      ...AmplifyTheme.sectionHeader,
      backgroundColor: '#ff6600'
    }
  }

  const setCookie = (name, value, exp) => {
      var d = new Date(exp);
      var expires = "expires="+ d.toUTCString();
      document.cookie = name + "=" + JSON.stringify(value) + ";" + expires + ";path=/";
  }

  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  const handleComplete = (err, confirmation) => {
    if (err) {
      alert('Bot conversation failed')
      return;
    }

    if(confirmation.slots !== null && getCookie("gibby") === ""){
      setCookie("gibby",confirmation.slots, confirmation.slots["targetDate"]);
      alert("cookie set")
    }
    alert(JSON.stringify(confirmation));
    return 'Done';
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <ChatBot
          title="Prudential Bot"
          theme={myTheme}
          botName="RetUserTest_dev"
          welcomeMessage="Welcome, how can I help you today?"
          onComplete={handleComplete}
          clearOnComplete={true}
          conversationModeOn={false}
        />
    </div>
  );
}

export default App;
