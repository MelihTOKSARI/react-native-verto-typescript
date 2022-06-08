import Call from './Call';
import ConferenceManager from '../conference/ConferenceManager';
import ConferenceLiveArray from '../conference/ConferenceLiveArray';
import { generateGUID, ENUM } from './utils';
import { Params, defaultVertoCallbacks } from '../store';
import BackgroundTimer from 'react-native-background-timer';
import VertoParams from '../models/VertoParams';
import { VertoOptions } from '../models/VertoOptions';
import EventSubscription from '../models/EventSubscription';
import ConferenceCallback from '../models/ConferenceCallback';
import Conference from '../conference/Conference';
import EventParams from '../models/EventParams';
import VertoRTCMediaHandlers from '../models/VertoRTC/VertoRTCMediaHandlers';
import { CallActions } from '../enums/CallActions.enum';
import { MediaStreamTrack } from 'react-native-webrtc';

BackgroundTimer.start();
let sessionIDCache: string;

export default class VertinhoClient {

  private params: VertoParams;
  public callbacks: defaultVertoCallbacks; // TODO Convert to property
  private conferenceCallbacks: ConferenceCallback;
  private webSocket: WebSocket;
  private webSocketCallbacks;
  private retryingTimer: number;
  private currentWebSocketRequestId: number;
  public options: VertoOptions;
  public calls: Map<string, Call>;
  private conference?: Conference;
  private sessid: string;
  private webSocketSubscriptions: Map<any, EventSubscription>;
  private authing: boolean;

  constructor(params = Params, vertoCallbacks: defaultVertoCallbacks, conferenceCallbacks?: ConferenceCallback) {
    this.params = { ...params };

    const defaultCallback = (x: any) => x;
    this.callbacks = {
      onClientReady: defaultCallback,
      onClientClose: defaultCallback,
      onConferenceReady: defaultCallback,
      onConferenceDisabled: defaultCallback,
      onInfo: defaultCallback,
      onDisplay: defaultCallback,
      onCallStateChange: defaultCallback,
      onPrivateEvent: defaultCallback,
      onStreamReady: () => {},
      onNewCall: defaultCallback,
      ...vertoCallbacks,
    };
    this.conferenceCallbacks = {
      onReady: defaultCallback,
      onDestroyed: defaultCallback,
      onBootstrappedMembers: defaultCallback,
      onAddedMember: defaultCallback,
      onModifiedMember: defaultCallback,
      onRemovedMember: defaultCallback,
      onChatMessage: defaultCallback,
      onInfo: defaultCallback,
      onModeration: defaultCallback,
      ...conferenceCallbacks,
    };

    this.webSocket = null;
    this.webSocketCallbacks = {};
    this.retryingTimer = null;
    this.currentWebSocketRequestId = 0;
    // this.options = {};
    this.calls = new Map();
    this.conference = null;

    this.connect();
  }

  public connect(): void {
    this.options = {
      webSocket: {
        login: '',
        password: '',
        url: '',
      },
      videoParams: {},
      audioParams: {},
      loginParams: {},
      deviceParams: {},
      userVariables: {},
      iceServers: false,
      ringSleep: 6000,
      sessid: null,
      onmessage: event => this.handleMessage(event.eventData),
      onWebSocketLoginSuccess: () => { },
      onWebSocketLoginError: (error: any) => {
        console.log('Error reported by WebSocket login', error);
        if(this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      },
      onPeerStreaming: () => { },
      onPeerStreamingError: (error: any) => {
        console.log('onPeerStreamingError:', error);
        if(this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      },
      ...this.params,
      ...this.callbacks
    };

    if (!this.options.deviceParams.useMic) {
      this.options.deviceParams.useMic = 'any';
    }

    if (!this.options.deviceParams.useSpeak) {
      this.options.deviceParams.useSpeak = 'any';
    }

    if (!this.options.blockSessionRecovery) {
      if (this.options.sessid) {
        this.sessid = this.options.sessid;
      } else {
        this.sessid = sessionIDCache || generateGUID();
        sessionIDCache = this.sessid;
      }
    } else {
      this.sessid = generateGUID();
    }

    this.calls = new Map();
    this.callbacks = this.callbacks || {};
    this.webSocketSubscriptions = new Map();
    this.connectSocket();
  }

  private connectSocket(): void {
    if (this.retryingTimer) {
      clearTimeout(this.retryingTimer);
    }

    if (this.socketReady()) {
      console.log('Tried to connect to socket but already had a ready one');
      return;
    }

    this.authing = false;

    if (this.webSocket) {
      delete this.webSocket;
    }
    
    this.webSocket = new WebSocket(this.options.webSocket.url);

    this.webSocket.onmessage = this.onWebSocketMessage.bind(this);

    this.webSocket.onclose = (event) => {
      this.callbacks.onClientClose();
      if(this.webSocket != null) {
        return;
      }
      console.log('WebSocket closed, attempting to connect again in 10s.', event);
      this.retryingTimer = BackgroundTimer.setTimeout(() => {
        if (this.webSocket != null)
          this.connectSocket();
      }, 10000);
    };

    this.webSocket.onopen = () => {
      console.log('WebSocket opened');
      if (this.retryingTimer) {
        console.log('Successfully WebSocket attempt to reconnect.');
        clearTimeout(this.retryingTimer);
      }

      this.publish('login', {});
    };

    this.webSocket.onerror = event => {
      console.log('onError event:', event);
      if(this.callbacks.onError) {
        this.callbacks.onError(event);
      }
    }
  }

  public socketReady(): boolean {
    if (this.webSocket === null || this.webSocket.readyState > 1) {
      return false;
    }

    return true;
  }

  private purge(): void {
    Object.keys(this.calls).forEach(callId => {
      this.calls[callId].setState(ENUM.state.purge);
    });

    this.webSocketSubscriptions = new Map();
  }

  public publish(method: any, params = {}, onSuccess = (x: any) => x, onError = (x: any) => x): void {
    this.currentWebSocketRequestId += 1;
    const request = {
      jsonrpc: '2.0',
      method,
      params: { sessid: this.sessid, ...params },
      id: this.currentWebSocketRequestId,
    };
    const requestStringified = JSON.stringify(request);

    if ('id' in request && onSuccess !== undefined) {
      this.webSocketCallbacks[request.id] = {
        requestStringified,
        request,
        onSuccess,
        onError,
      };
    }
    
    if(this.webSocket) {
      this.webSocket.send(requestStringified);
    }
  }

  private handleJSONRPCMessage(message: any): void {
    if (message.result) {
      const { onSuccess } = this.webSocketCallbacks[message.id];
      delete this.webSocketCallbacks[message.id];
      onSuccess(message.result, this);
      return;
    }

    if (!message.error) {
      if(this.callbacks.onError) {
        this.callbacks.onError(message.error);
      }
      return;
    }

    if (!this.authing && parseInt(message.error.code, 10) === -32000) {
      this.authing = true;

      this.publish(
        'login',
        {
          login: this.options.webSocket.login,
          passwd: this.options.webSocket.password,
          loginParams: this.options.loginParams,
          userVariables: this.options.userVariables,
        },
        () => {
          this.authing = false;
          delete this.webSocketCallbacks[message.id];
          this.options.onWebSocketLoginSuccess();
        },
        () => {
          delete this.webSocketCallbacks[message.id];
          this.options.onWebSocketLoginError(message.error);
        },
      );
      return;
    }

    const { onError } = this.webSocketCallbacks[message.id];
    delete this.webSocketCallbacks[message.id];
    onError(message.error, this);
  }

  private onWebSocketMessage(event: any): void {
    const message = JSON.parse(event.data);

    if (
      message &&
      message.jsonrpc === '2.0' &&
      this.webSocketCallbacks[message.id]
    ) {
      this.handleJSONRPCMessage(message);
      return;
    }

    if (typeof this.options.onmessage !== 'function') {
      return;
    }

    const fixedEvent = { ...event, eventData: message || {} };
    const reply = this.options.onmessage(fixedEvent);

    if (
      typeof reply !== 'object' ||
      !fixedEvent.eventData.id ||
      !this.webSocket
    ) {
      return;
    }

    this.webSocket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: fixedEvent.eventData.id,
        result: reply,
      }),
    );
  }

  private handleMessage(data: any): void {
    if (!data || !data.method || !data.params) {
      console.log('Invalid WebSocket message', data);
      return;
    }
    console.log('handleMessage data:', data);
    if (data.params.eventType === 'channelPvtData') {
      this.handleChannelPrivateDataMessage(data);
    } else if (data.params.callID) {
      this.handleMessageForCall(data);
    } else {
      this.handleMessageForClient(data);
    }
  }

  private handleChannelPrivateDataMessage(data: any): void {
    const { params: event } = data;
    const existingConference = this.conference && { ...this.conference };
    if (event.pvtData.action === 'conference-liveArray-join') {
      if (existingConference) {
        console.log(
          'Ignoring doubled private event of live array join',
          event,
        );
        return;
      }

      const conference = {
        creationEvent: event,
        privateEventChannel: event.eventChannel,
        memberId: event.pvtData.conferenceMemberID,
        role: event.pvtData.role,
        manager: new ConferenceManager(this, {
          chat: {
            channel: event.pvtData.chatChannel,
            handler: this.conferenceCallbacks.onChatMessage,
          },
          info: {
            channel: event.pvtData.infoChannel,
            handler: this.conferenceCallbacks.onInfo,
          },
          mod: event.pvtData.modChannel
            ? null
            : {
              channel: event.pvtData.modChannel,
              handler: this.conferenceCallbacks.onModeration,
            },
        }),
        liveArray: new ConferenceLiveArray(
          this,
          event.pvtData.laChannel,
          event.pvtData.laName,
          {
            onBootstrappedMembers: this.conferenceCallbacks
              .onBootstrappedMembers,
            onAddedMember: this.conferenceCallbacks.onAddedMember,
            onModifiedMember: this.conferenceCallbacks.onModifiedMember,
            onRemovedMember: this.conferenceCallbacks.onRemovedMember,
          },
        ),
      };
      this.conference = conference;
      this.conferenceCallbacks.onReady(conference);
    } else if (event.pvtData.action === 'conference-liveArray-part') {
      if (!existingConference) {
        console.log(
          'Ignoring event of live array part without conference instance',
          event,
        );
        return;
      }

      existingConference.manager.destroy();
      existingConference.liveArray.destroy();

      this.conference = null;

      this.conferenceCallbacks.onDestroyed(existingConference);
    } else {
      console.log('Not implemented private data message', data);
    }
  }

  private handleMessageForClient(data: any): void {
    console.log('handleMessageForClient data:', data); // TODO Convert data type
    const channel = data.params.eventChannel;
    const subscription = channel && this.webSocketSubscriptions[channel];

    switch (data.method) {
      case CallActions.Punt:
        this.destroy();
        break;
      case CallActions.Event:
        if (!subscription && channel === this.sessid) {
          this.callbacks.onPrivateEvent(data.params);
        } else if (!subscription && channel && this.calls[channel]) {
          this.callbacks.onPrivateEvent(data.params);
        } else if (!subscription) {
          console.log(
            'Ignoring event for unsubscribed channel',
            channel,
            data.params,
          );
        } else if (!subscription || !subscription.ready) {
          console.log(
            'Ignoring event for a not ready channel',
            channel,
            data.params,
          );
        } else if (subscription.handler) {
          subscription.handler(data.params, subscription.userData);
        } else if (this.callbacks.onEvent) {
          this.callbacks.onEvent(this, data.params, subscription.userData);
        } else {
          console.log('Ignoring event without callback', channel, data.params);
        }
        break;
      case CallActions.Info:
        this.callbacks.onInfo(data.params);
        break;
      case CallActions.Ready:
        this.callbacks.onClientReady(data.params);
        break;
      default:
        console.log('Ignoring invalid method with no call id', data.method);
        break;
    }
  }

  private handleMessageForCall(data): void {
    const existingCall = this.calls[data.params.callID];
    if (existingCall) {
      switch (data.method) {
        case CallActions.Bye:
          existingCall.hangup(data.params);
          break;
        case CallActions.Answer:
          existingCall.handleAnswer(data.params.sdp);
          break;
        case CallActions.Media:
          existingCall.handleMedia(data.params.sdp);
          break;
        case CallActions.Display:
          existingCall.handleDisplay(
            data.params.display_name,
            data.params.display_number,
          );
          break;
        case CallActions.Info:
          existingCall.handleInfo(data.params);
          break;
        default:
          console.log(
            'Ignoring existing call event with invalid method',
            data.method,
          );
          break;
      }
    } else if (
      data.method === CallActions.Attach ||
      data.method === CallActions.Invite
    ) {
      const useVideo = data.params.sdp && data.params.sdp.indexOf('m=video') > 0;
      const useStereo = data.params.sdp && data.params.sdp.indexOf('stereo=1') > 0;
      const newCall = new Call(ENUM.direction.inbound, this, {
        ...data.params,
        attach: false,
        useVideo,
        useStereo
      });
      this.callbacks.onNewCall(newCall);
      if (data.method === CallActions.Attach) {
        newCall.setState(ENUM.state.recovering);
      }
    } else {
      console.log('Ignoring call event with invalid method', data.method);
    }
  }

  private processReply(method: string, { subscribedChannels, unauthorizedChannels }): void {
    if (method !== CallActions.Subscribe) {
      return;
    }

    Object.keys(subscribedChannels || {}).forEach(channelKey => {
      const channel = subscribedChannels[channelKey];
      this.setReadySubscription(channel);
    });

    Object.keys(unauthorizedChannels || {}).forEach(channelKey => {
      const channel = unauthorizedChannels[channelKey];
      console.log('Unauthorized', channel);
      this.setDroppedSubscription(channel);
    });
  }

  // TODO convert channel type
  private setDroppedSubscription(channel: any): void {
    delete this.webSocketSubscriptions[channel];
  }

  // TODO convert channel type
  private setReadySubscription(channel: any): void {
    const subscription = this.webSocketSubscriptions[channel];
    if (subscription) {
      subscription.ready = true;
    }
  }

  public broadcastMethod(method: string, params: any): void {
    const reply = event => this.processReply(method, event);
    this.publish(method, params, reply, reply);
  }

  public broadcast(eventChannel: any, data: any): void {
    this.broadcastMethod(CallActions.Broadcast, { eventChannel, data });
  }

  public subscribe(eventChannel: any, params: EventParams): EventSubscription {
    const eventSubscription: EventSubscription = {
      eventChannel,
      handler: params.handler,
      userData: params.userData,
      ready: false,
    };

    if (this.webSocketSubscriptions[eventChannel]) {
      console.log('Overwriting an already subscribed channel', eventChannel);
    }

    this.webSocketSubscriptions[eventChannel] = eventSubscription;
    this.broadcastMethod(CallActions.Subscribe, { eventChannel });
    return eventSubscription;
  }

  public unsubscribe(eventChannel: any): void {
    delete this.webSocketSubscriptions[eventChannel];
    this.broadcastMethod(CallActions.Unsubscribe, { eventChannel });
  }

  public switchCamera(callId: string, localVideoTrack: MediaStreamTrack): void {
    const call = this.calls && this.calls[callId];
    if (call) {
      call.rtc.switchCamera(localVideoTrack);
    }
  }

  // private setTrackEnabled(callId: string, stream, audioTrack, enabled): void {
  //   const call = this.calls && this.calls[callId];
  //   if (call) {
  //     call.rtc.setTrackEnabled(stream, audioTrack, enabled);
  //   }
  // }

  public makeVideoCall({ callerName, ...params }, mediaHandlers?: VertoRTCMediaHandlers): Call {
    if (!callerName) {
      console.log('No `callerName` parameter on making video call.');
    }

    return this.makeCall(
      { callerName, useVideo: true, ...params },
      mediaHandlers,
    );
  }

  // private makeCall(callParams: any = { to, from, ...otherParams }, mediaHandlers = {}): Call {
  public makeCall(callParams: any, mediaHandlers?: VertoRTCMediaHandlers): Call {
    if (!callParams.to || !callParams.from) {
      console.log('No `to` or `from` parameters on making call.');
      return null;
    }
    
    const { callerName = 'Vertinho', ...params } = callParams;
    params.destination_number = callParams.to;
    params.caller_id_number = callParams.from;
    params.caller_id_name = callerName;

    if (!this.socketReady()) {
      console.log('Socket not ready.');
      return null;
    }
    
    const call = new Call(ENUM.direction.outbound, this, params, mediaHandlers);
    call.rtc.inviteRemotePeerConnection();

    return call;
  }

  public destroy(): void {
    if (this.socketReady()) {
      this.webSocket.close();
      this.purge();
    } else {
      console.log('Tried to close a not ready socket while destroying.');
    }

    if (this.webSocket)
      delete this.webSocket;

    this.webSocket = null;

    BackgroundTimer.stop();
    if (this.retryingTimer)
      clearTimeout(this.retryingTimer);
  }

  public hangup(callId: string, causeCode?: number): void {
    if (callId) {
      const call = this.calls[callId];

      if (call) {
        call.hangup({ causeCode });
      } else {
        console.log('Error on hanging up call', callId);
      }

      return;
    }

    Object.keys(this.calls).forEach(id => {
      this.calls[id].hangup();
    });
  }
}
