import { ChatBotConfig } from './../config/config.model';
import { TwitchTokenDetails } from './../models/twitchTokenDetails.models';
import { TwitchTokenResponseValidator } from './../utils/TwitchTokenResponseValidator';
import { MalformedTwitchRequestError, NoTwitchResponseError, TwitchResponseError } from '../models/error.model';


export class TwitchChatBot {

    tmi = require('tmi.js');

    public twitchClient: any;
    private tokenDetails!: TwitchTokenDetails;
    private broadcasterId!: string;

    constructor(private config: ChatBotConfig) { }

    async launch() {
        this.tokenDetails = await this.fetchAccessToken();
        this.broadcasterId = await this.fetchBroadcasterId();
        this.twitchClient = new this.tmi.Client(
            this.buildConnectionConfig(
                this.config.twitchChannel,
                this.config.twitchUser,
                this.tokenDetails.access_token)
        );
        this.setupBotBehavior();
        this.twitchClient.connect();
    }

    private async fetchAccessToken(): Promise<TwitchTokenDetails> {
        const axios = require('axios');
        console.log("Fetching Twitch OAuth Token");
        return axios({
            method: 'post',
            url: this.config.twitchTokenEndpoint,
            params: {
                client_id: this.config.twitchClientId,
                client_secret: this.config.twitchClientSecret,
                code: this.config.twitchAuthorizationCode,
                grant_type: 'authorization_code',
                redirect_uri: 'http://localhost'

            },
            responseType: 'json'
        }).then(async function (response: any) {
            // handle success
            return await TwitchTokenResponseValidator.parseResponse(response.data);
        }).catch(function (error: any) {
            console.log("Failed to get Twitch OAuth Token");
            console.log(error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                throw new TwitchResponseError(error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                throw new NoTwitchResponseError(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                throw new MalformedTwitchRequestError(error.request);
            }
        })
    }

    private async fetchBroadcasterId() {
        const axios = require('axios');
        console.log("Fetching Broadcaster ID");
        return axios({
            method: 'get',
            url: `https://api.twitch.tv/helix/users`,
            headers: {
                'Authorization': `Bearer ${this.tokenDetails.access_token}`,
                'Client-Id': `${this.config.twitchClientId}`
            },
            responseType: 'json'
        }).then(function (response: any) {
            // handle success
            console.log("Successfully fetched Broadcaster ID", response.data.data[0].id);
            return response.data.data[0].id;
        }).catch(function (error: any) {
            console.log("Failed to get Broadcaster ID");
            console.log(error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                throw new TwitchResponseError(error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                throw new NoTwitchResponseError(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                throw new MalformedTwitchRequestError(error.request);
            }
        })
    }

    refreshTokenIfNeeded() {

    }

    private setupBotBehavior() {
        this.twitchClient.on('message', (channel: any, tags: any, message: any, self: any) => {
            let helloCommand = ['hey', 'hi', 'hello', 'sup', 'yo', 'howdy', 'greetings', 'hola', 'bonjour', 'hallo', 'ciao', 'namaste', 'salaam', 'konnichiwa', 'ni hao', 'shalom', 'jambo', 'merhaba', 'xin chao', 'sawubona', 'privet', 'kamusta', 'sveiki', 'ahoj', 'hujambo', 'kumusta', 'salut', 'kia ora', 'konnichi wa', 'konnichiha'];

            // check if message includes a hello command and if it was not sent by the bot,
            // also check if the message is not a command sent by the bot
            if (helloCommand.includes(message.toLowerCase()) && !self && !message.startsWith('!')) {
                this.sayHelloToUser(channel, tags);
            }

            // generate a clip if the message is only the word "!clip" and it was not sent by the bot
            if (message.toLowerCase() === '!clip' && !self) {
                this.generateClip(channel, tags).then((clipUrl: string) => {
                    this.twitchClient.say(channel, `Here's your clip: ${clipUrl}`);
                }).catch((error: any) => {
                    console.log(error);
                    this.twitchClient.say(channel, `Sorry, I couldn't generate a clip for you. Try again later.`);
                });
            }
        });
    }

    private sayHelloToUser(channel: any, tags: any) {
        this.twitchClient.say(channel, `Hello, ${ tags.username }!`);
    }

    private async generateClip(channel: any, tags: any) {
         const axios = require('axios');
        return axios({
            method: 'post',
            url: `https://api.twitch.tv/helix/clips?broadcaster_id=${this.broadcasterId}`,
            headers: {
                'Authorization': `Bearer ${this.tokenDetails.access_token}`,
                'Client-Id': `${this.config.twitchClientId}`
            },
            responseType: 'json'
        }).then(function (response: any) {
            // handle success
            console.log(response.data.data[0].edit_url);
            return response.data.data[0].edit_url;
        }).catch(function (error: any) {
            
            console.log(error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                throw new TwitchResponseError(error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                throw new NoTwitchResponseError(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                throw new MalformedTwitchRequestError(error.request);
            }
        })
    
    }

    private buildConnectionConfig(channel: string, username: string, accessToken: string) {
        return {
            options: { debug: true },
            connection: {
                secure: true,
                reconnect: true
            },
            identity: {
                username: `${username}`,
                password: `oauth:${accessToken}`
            },
            channels: [`${channel}`]
        };
    }
}


