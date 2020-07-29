import * as React from 'react';
import {
    FormSection,
    SectionHeader,
    SectionBody,
    SectionFooter,
    NavRight,
} from 'aws-amplify-react/lib-esm';
import { Input, Button } from 'aws-amplify-react/lib-esm/AmplifyTheme';

import { I18n } from '@aws-amplify/core';
import { Interactions } from '@aws-amplify/interactions';
import { chatBot } from 'aws-amplify-react/lib-esm/Amplify-UI/data-test-attributes';
import ResponseCard from './ResponseCard';

// @ts-ignore
const styles = {
    itemMe: {
        fontSize: 15,
        color: 'black',
        marginTop: 4,
        textAlign: 'right',
        backgroundColor: '#e0e0e0',
        margin: '15px 0px 0 auto',
        borderRadius: '4px',
        padding: '5px',
        maxWidth: '60%', 
    },
    itemBot: {
        fontSize: 15,
        textAlign: 'left',
        color: 'white',
        backgroundColor: '#16b',
        margin: '15px auto 0 0px', 
        borderRadius: '4px',
        padding: '5px',
        maxWidth: '60%',
    },
    list: {
        height: '100%',
        overflow: 'auto',
    },
    textInput: Object.assign({}, Input, {
        display: 'inline-block',
        width: 'calc(100% - 90px - 15px)',
    }),
    // @ts-ignore
    button: Object.assign({}, Button, {
        width: '60px',
        float: 'right',
    }),
    // @ts-ignore
    mic: Object.assign({}, Button, {
        width: '40px',
        float: 'right',
    }),
};

const STATES = {
    INITIAL: { MESSAGE: 'Type your message or click  🎤', ICON: '🎤' },
    LISTENING: { MESSAGE: 'Listening... click 🔴 again to cancel', ICON: '🔴' },
    SENDING: { MESSAGE: 'Please wait...', ICON: '🔊' },
    SPEAKING: { MESSAGE: 'Speaking...', ICON: '...' },
};

const defaultVoiceConfig = {
    silenceDetectionConfig: {
        time: 2000,
        amplitude: 0.2,
    },
};

let audioControl;

class ChatBot extends React.Component{

	constructor(props) {
        super(props);

		if (this.props.voiceEnabled) {
			require('aws-amplify-react/lib-esm/Interactions/aws-lex-audio');
			// @ts-ignore
			audioControl = new global.LexAudio.audioControl();
		}
		if (!this.props.textEnabled && this.props.voiceEnabled) {
			STATES.INITIAL.MESSAGE = 'Click the mic button';
			styles.textInput = Object.assign({}, Input, {
				display: 'inline-block',
				width: 'calc(100% - 40px - 15px)',
			});
		}
		if (this.props.textEnabled && !this.props.voiceEnabled) {
			STATES.INITIAL.MESSAGE = 'Type a message';
			styles.textInput = Object.assign({}, Input, {
				display: 'inline-block',
				width: 'calc(100% - 60px - 15px)',
			});
		}
		if (!this.props.voiceConfig.silenceDetectionConfig) {
			throw new Error('voiceConfig prop is missing silenceDetectionConfig');
        }

        this.state = {
			dialog: [
				{
					message: this.props.welcomeMessage || 'Welcome to Lex',
					from: 'system',
				},
			],
			inputText: '',
			currentVoiceState: STATES.INITIAL,
			inputDisabled: false,
			micText: STATES.INITIAL.ICON,
			continueConversation: false,
			micButtonDisabled: false,
		};
		this.micButtonHandler = this.micButtonHandler.bind(this);
		this.changeInputText = this.changeInputText.bind(this);
		this.listItems = this.listItems.bind(this);
		this.submit = this.submit.bind(this);
		// @ts-ignore
		this.listItemsRef = React.createRef();
		this.onSilenceHandler = this.onSilenceHandler.bind(this);
		this.doneSpeakingHandler = this.doneSpeakingHandler.bind(this);
        this.lexResponseHandler = this.lexResponseHandler.bind(this);
        this.lexMessageGroup = this.lexMessageGroup.bind(this);
        this.setCookie = this.setCookie.bind(this);
        this.getCookie = this.getCookie.bind(this);
        this.lexResponseCard = this.lexResponseCard.bind(this);
        this.BackgroundResponse = this.BackgroundResponse.bind(this);
    }
    
    async micButtonHandler() {
        if (this.state.continueConversation) {
            this.reset();
        } else {
            this.setState(
                {
                    inputDisabled: true,
                    continueConversation: true,
                    currentVoiceState: STATES.LISTENING,
                    micText: STATES.LISTENING.ICON,
                    micButtonDisabled: false,
                },
                () => {
                    audioControl.startRecording(
                        this.onSilenceHandler,
                        null,
                        this.props.voiceConfig.silenceDetectionConfig
                    );
                }
            );
        }
    }

    onSilenceHandler() {
        audioControl.stopRecording();
        if (!this.state.continueConversation) {
            return;
        }
        audioControl.exportWAV(blob => {
            this.setState(
                {
                    currentVoiceState: STATES.SENDING,
                    audioInput: blob,
                    micText: STATES.SENDING.ICON,
                    micButtonDisabled: true,
                },
                () => {
                    this.lexResponseHandler();
                }
            );
        });
    }

    async lexResponseHandler() {
        if (!Interactions || typeof Interactions.send !== 'function') {
            throw new Error(
                'No Interactions module found, please ensure @aws-amplify/interactions is imported'
            );
        }
        if (!this.state.continueConversation) {
            return;
        }

        const interactionsMessage = {
            content: this.state.audioInput,
            options: {
                messageType: 'voice',
            },
        };

        const response = await Interactions.send(this.props.botName, interactionsMessage);

        this.setState(
            {
                lexResponse: response,
                currentVoiceState: STATES.SPEAKING,
                micText: STATES.SPEAKING.ICON,
                micButtonDisabled: true,
                dialog: [
                    ...this.state.dialog,
                    // @ts-ignore
                    { message: response.inputTranscript, from: 'me' },
                    // @ts-ignore
                    response && { from: 'bot', message: response.message },
                ],
                inputText: '',
            },
            () => {
                this.doneSpeakingHandler();
            }
        );
        this.listItemsRef.current.scrollTop = this.listItemsRef.current.scrollHeight;
    }

    doneSpeakingHandler() {
        if (!this.state.continueConversation) {
            return;
        }
        if (this.state.lexResponse.contentType === 'audio/mpeg') {
            audioControl.play(this.state.lexResponse.audioStream, () => {
                if (
                    this.state.lexResponse.dialogState === 'ReadyForFulfillment' ||
                    this.state.lexResponse.dialogState === 'Fulfilled' ||
                    this.state.lexResponse.dialogState === 'Failed' ||
                    !this.props.conversationModeOn
                ) {
                    this.setState({
                        inputDisabled: false,
                        currentVoiceState: STATES.INITIAL,
                        micText: STATES.INITIAL.ICON,
                        micButtonDisabled: false,
                        continueConversation: false,
                    });
                } else {
                    this.setState(
                        {
                            currentVoiceState: STATES.LISTENING,
                            micText: STATES.LISTENING.ICON,
                            micButtonDisabled: false,
                        },
                        () => {
                            audioControl.startRecording(
                                this.onSilenceHandler,
                                null,
                                this.props.voiceConfig.silenceDetectionConfig
                            );
                        }
                    );
                }
            });
        } else {
            this.setState({
                inputDisabled: false,
                currentVoiceState: STATES.INITIAL,
                micText: STATES.INITIAL.ICON,
                micButtonDisabled: false,
                continueConversation: false,
            });
        }
    }

    reset() {
        this.setState(
            {
                inputText: '',
                currentVoiceState: STATES.INITIAL,
                inputDisabled: false,
                micText: STATES.INITIAL.ICON,
                continueConversation: false,
                micButtonDisabled: false,
            },
            () => {
                audioControl.clear();
            }
        );
    }

    listItems() {

        return this.state.dialog.map((m, i) => {
            if (m.from === 'me') {
                return (
                    <div
                        key={i}
                        style={styles.itemMe}
                        data-test={`${chatBot.dialog}-${i}`}
                    >
                        {m.message}
                    </div>
                );
            } else if (m.from === 'system') {
                return (
                    <div
                        key={i}
                        style={styles.itemBot}
                        data-test={`${chatBot.dialog}-${i}`}
                    >
                        {m.message}
                    </div>
                );
            //From Bot
            } else {
                if(m.messageFormat === "CustomPayload"){
                    const [message, title, URL] = m.message.split(";");
                    return (
                        <div
                            key={i}
                            style={styles.itemBot}
                            data-test={`${chatBot.dialog}-${i}`}
                        >
                            {message}<br />
                            <a href={URL}>{title}</a>
                        </div>
                    );
                }else if(m.messageFormat === "ResponseCard"){
                    return (
                        <div
                            key={i}
                            // style={styles.itemBot}
                            data-test={`${chatBot.dialog}-${i}`}
                        >
                            <ResponseCard               
                                title = {m.title}
                                subtitle = {m.subTitle}
                                imageUrl = {m.url}
                                buttons = {m.buttons}
                                handler = {this.BackgroundResponse}   
                            />
                        </div>
                    );
                }else{
                    return (
                        <div
                            key={i}
                            style={styles.itemBot}
                            data-test={`${chatBot.dialog}-${i}`}
                        >
                            {m.message}
                        </div>
                    );
                }
                
            }
        });
    }

    async submit(e) {
        e.preventDefault();
        if (!this.state.inputText) {
            return;
        }
        await new Promise(resolve =>
            this.setState(
                {
                    dialog: [
                        ...this.state.dialog,
                        { message: this.state.inputText, from: 'me' },
                    ],
                },
                resolve
            )
        );

        if (!Interactions || typeof Interactions.send !== 'function') {
            throw new Error(
                'No Interactions module found, please ensure @aws-amplify/interactions is imported'
            );
        }
        
        const response = await Interactions.send(
            this.props.botName,
            this.state.inputText
        );

        if(response.sessionAttributes !== undefined){
            //Check setcookie sessionattribute here and setcookie
            console.log(response.sessionAttributes);
        }

        //Message Group Support
        if (response.messageFormat === "Composite"){
            this.lexMessageGroup(response)
        }
        else{
           this.setState({
            // @ts-ignore
            dialog: [
                ...this.state.dialog,
                // @ts-ignore
                response && { from: 'bot', message: response.message, messageFormat: response.messageFormat },
            ],
            inputText: '',
            });
        }
        
        //Only supports one ResponseCard for now
        if (response.responseCard !== undefined){
            this.lexResponseCard(response.responseCard);
        }
        
        this.listItemsRef.current.scrollTop = this.listItemsRef.current.scrollHeight;
    }

    async BackgroundResponse(input){
        if (!Interactions || typeof Interactions.send !== 'function') {
            throw new Error(
                'No Interactions module found, please ensure @aws-amplify/interactions is imported'
            );
        }
        console.log(input);
        const response = await Interactions.send(
            this.props.botName,
            input
        );
        console.log(response)

        if(response.sessionAttributes !== undefined){
            //Check setcookie sessionattribute here and setcookie
            console.log(response.sessionAttributes);
        
        }

        //Message Group Support
        if (response.messageFormat === "Composite"){
            this.lexMessageGroup(response)
        }
        else{
           this.setState({
            // @ts-ignore
            dialog: [
                ...this.state.dialog,
                // @ts-ignore
                response && { from: 'bot', message: response.message, messageFormat: response.messageFormat },
            ],
            inputText: '',
            });
        }
        
        //Only supports one ResponseCard for now
        if (response.responseCard !== undefined){
            this.lexResponseCard(response.responseCard);
        }
        
        this.listItemsRef.current.scrollTop = this.listItemsRef.current.scrollHeight;
    }

    lexMessageGroup(response){
        const msgGrpJSON = JSON.parse(unescape(response.message));
        const responseGrp = msgGrpJSON.messages;
        responseGrp.forEach(msg => {
            this.setState({
                // @ts-ignore
                dialog: [
                    ...this.state.dialog,
                    // @ts-ignore
                    msg && { from: 'bot', message: msg.value, messageFormat: msg.type },
                ],
                inputText: '',
            }); 
        });
        return
    }

    lexResponseCard(responseCard){
        const title = (responseCard.genericAttachments[0].title) ? responseCard.genericAttachments[0].title : "";
        const subTitle = (responseCard.genericAttachments[0].subTitle) ? responseCard.genericAttachments[0].subTitle : "" ;
        const buttons = (responseCard.genericAttachments[0].buttons) ? responseCard.genericAttachments[0].buttons : "" ;
        const url = (responseCard.genericAttachments[0].imageUrl) ? responseCard.genericAttachments[0].imageUrl : "";
        
        this.setState({
            // @ts-ignore
            dialog: [
                ...this.state.dialog,
                // @ts-ignore
                responseCard && { from: 'bot', title: title, subTitle: subTitle, buttons: buttons, url: url, messageFormat: "ResponseCard" },
            ],
            inputText: '',
        }); 
    }

    async changeInputText(event) {
        await this.setState({ inputText: event.target.value });
    }

    getOnComplete(fn) {
        return (...args) => {
            const { clearOnComplete } = this.props;
            const message = fn(...args);

            this.setState(
                {
                    dialog: [
                        ...(clearOnComplete ? [] : this.state.dialog),
                        message && { from: 'bot', message },
                    ].filter(Boolean),
                },
                () => {
                    this.listItemsRef.current.scrollTop = this.listItemsRef.current.scrollHeight;
                }
            );
        };
    }

    componentDidMount() {
        const { onComplete, botName } = this.props;
        console.log("ComponentDid")
        if (onComplete && botName) {
            if (!Interactions || typeof Interactions.onComplete !== 'function') {
                throw new Error(
                    'No Interactions module found, please ensure @aws-amplify/interactions is imported'
                );
            }
            // @ts-ignore
            Interactions.onComplete(botName, this.getOnComplete(onComplete, this));
        }
    }

    componentDidUpdate(prevProps) {
        const { onComplete, botName } = this.props;

        if (botName && this.props.onComplete !== prevProps.onComplete) {
            if (!Interactions || typeof Interactions.onComplete !== 'function') {
                throw new Error(
                    'No Interactions module found, please ensure @aws-amplify/interactions is imported'
                );
            }
            // @ts-ignore
            Interactions.onComplete(botName, this.getOnComplete(onComplete, this));
        }
    }

    getCookie(cname) {
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

    setCookie(name, value, exp) {
        var d = new Date(exp);
        var expires = "expires="+ d.toUTCString();
        document.cookie = name + "=" + JSON.stringify(value) + ";" + expires + ";path=/";
    }

    render() {
        const { title, theme, onComplete } = this.props;

        return (
            <div>
                <FormSection theme={theme}>
                    {title && (
                        <SectionHeader theme={theme} data-test={chatBot.title}>
                            {I18n.get(title)}
                        </SectionHeader>
                    )}
                    <SectionBody theme={theme}>
                        <div ref={this.listItemsRef} style={styles.list}>
                            {this.listItems()}
                        </div>
                    </SectionBody>
                    <SectionFooter theme={theme}>
                        <ChatBotInputs
                            micText={this.state.micText}
                            voiceEnabled={this.props.voiceEnabled}
                            textEnabled={this.props.textEnabled}
                            styles={styles}
                            onChange={this.changeInputText}
                            inputText={this.state.inputText}
                            onSubmit={this.submit}
                            inputDisabled={this.state.inputDisabled}
                            micButtonDisabled={this.state.micButtonDisabled}
                            handleMicButton={this.micButtonHandler}
                            currentVoiceState={this.state.currentVoiceState}
                        />
                    </SectionFooter>
                </FormSection>
            </div>
        );
    }
}

function ChatBotTextInput(props) {
	const styles = props.styles;
	const onChange = props.onChange;
	const inputText = props.inputText;
	const inputDisabled = props.inputDisabled;
	const currentVoiceState = props.currentVoiceState;

	return (
		<input
			style={styles.textInput}
			type="text"
			placeholder={I18n.get(currentVoiceState.MESSAGE)}
			onChange={onChange}
			value={inputText}
			disabled={inputDisabled}
			data-test={chatBot.messageInput}
		/>
	);
}

function ChatBotMicButton(props) {
	const voiceEnabled = props.voiceEnabled;
	const styles = props.styles;
	const micButtonDisabled = props.micButtonDisabled;
	const handleMicButton = props.handleMicButton;
	const micText = props.micText;

	if (!voiceEnabled) {
		return null;
	}

	return (
		<button
			style={styles.mic}
			disabled={micButtonDisabled}
			onClick={handleMicButton}
		>
			{micText}
		</button>
	);
}

function ChatBotTextButton(props) {
	const textEnabled = props.textEnabled;
	const styles = props.styles;
	const inputDisabled = props.inputDisabled;

	if (!textEnabled) {
		return null;
	}

	return (
		<button
			type="submit"
			style={styles.button}
			disabled={inputDisabled}
			data-test={chatBot.sendMessageButton}
		>
			{I18n.get('Send')}
		</button>
	);
}

function ChatBotInputs(props) {
	const voiceEnabled = props.voiceEnabled;
	const textEnabled = props.textEnabled;
	const styles = props.styles;
	const onChange = props.onChange;
	let inputDisabled = props.inputDisabled;
	const micButtonDisabled = props.micButtonDisabled;
	const inputText = props.inputText;
	const onSubmit = props.onSubmit;
	const handleMicButton = props.handleMicButton;
	const micText = props.micText;
	const currentVoiceState = props.currentVoiceState;

	if (voiceEnabled && !textEnabled) {
		inputDisabled = true;
	}

	if (!voiceEnabled && !textEnabled) {
		return (
			<div>
				No Chatbot inputs enabled. Set at least one of voiceEnabled or
				textEnabled in the props.{' '}
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit}>
			<ChatBotTextInput
				onSubmit={onSubmit}
				styles={styles}
				type="text"
				currentVoiceState={currentVoiceState}
				onChange={onChange}
				inputText={inputText}
				inputDisabled={inputDisabled}
			/>
			<ChatBotTextButton
				onSubmit={onSubmit}
				type="submit"
				styles={styles}
				inputDisabled={inputDisabled}
				textEnabled={textEnabled}
			/>
			<ChatBotMicButton
				styles={styles}
				micButtonDisabled={micButtonDisabled}
				handleMicButton={handleMicButton}
				micText={micText}
				voiceEnabled={voiceEnabled}
			/>
		</form>
	);
}

// @ts-ignore
ChatBot.defaultProps = {
	title: '',
	botName: '',
	onComplete: undefined,
	clearOnComplete: false,
	voiceConfig: defaultVoiceConfig,
	conversationModeOn: false,
	voiceEnabled: false,
	textEnabled: true,
};

/**
 * @deprecated use named import
 */
export default ChatBot;
