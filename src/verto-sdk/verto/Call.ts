 import VertoRTC from '../webrtc/VertoRTC';
import { generateGUID, ENUM } from './utils';
// import BackgroundTimer from 'react-native-background-timer';
import VertinhoClient from './VertoClient';
import CallStateItem from '../models/Call/CallStateItem';
import CallParams from '../models/Call/CallParams';
import VertoRTCMediaHandlers from '../models/VertoRTC/VertoRTCMediaHandlers';
import { CallActions } from '../enums/CallActions.enum';

// BackgroundTimer.start();

export default class Call {

  private direction: CallStateItem;
  private verto: VertinhoClient;
  public rtc: VertoRTC;

  private params: CallParams;
  private mediaHandlers: VertoRTCMediaHandlers;

  private answered: boolean;
  private lastState: CallStateItem;
  private state: CallStateItem;

  private causeCode: number;
  private cause: string;

  private gotEarly: boolean;
  private gotAnswer: boolean;

  constructor(direction: CallStateItem, verto: VertinhoClient, params: CallParams, mediaHandlers?: VertoRTCMediaHandlers) {
    this.direction = direction;
    this.verto = verto;
    this.params = {
      callID: generateGUID(),
      useVideo: verto.options.useVideo,
      useStereo: verto.options.useStereo,
      screenShare: false,
      useCamera: false,
      useMic: verto.options.deviceParams.useMic,
      useSpeak: verto.options.deviceParams.useSpeak,
      remoteVideo: verto.options.remoteVideo,
      remoteAudioId: verto.options.remoteAudioId,
      localVideo: verto.options.localVideo,
      login: verto.options.login,
      videoParams: verto.options.videoParams,
      ...params,
    };
    this.mediaHandlers = mediaHandlers;

    if (!this.params.screenShare) {
      this.params.useCamera = verto.options.deviceParams.useCamera;
    }

    this.answered = false;

    this.lastState = ENUM.state.new;
    this.state = this.lastState;

    this.verto.calls[this.params.callID] = this;

    if (this.direction === ENUM.direction.inbound) {
      if (this.params.display_direction === 'outbound') {
        this.params.remote_caller_id_name =
          this.params.caller_id_name || 'NOBODY';
        this.params.remote_caller_id_number =
          this.params.caller_id_number || 'UNKNOWN';
      } else {
        this.params.remote_caller_id_name =
          this.params.callee_id_name || 'NOBODY';
        this.params.remote_caller_id_number =
          this.params.callee_id_number || 'UNKNOWN';
      }
    } else {
      this.params.remote_caller_id_name = 'OUTBOUND CALL';
      this.params.remote_caller_id_number = this.params.destination_number;
    }

    this.bootstrapRealtimeConnection();

    if (this.direction === ENUM.direction.inbound) {
      if (this.params.attach) {
        this.answer();
      } else {
        // this.ring(); // TODO call ring method
      }
    }
  }

  private bootstrapRealtimeConnection(): void {
    const callbacks = {
      onICESDP: () => {
        const { requesting, answering, active } = ENUM.state;

        if ([requesting, answering, active].includes(this.state)) {
          console.log(
            'This ICE SDP should not being received, reload your page!',
          );
          return;
        }

        let firstTime = true;
        let newsdp = this.rtc.mediaData.SDP.split('\r\n');
        newsdp = newsdp.concat([undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
        newsdp = newsdp.map((line, index) => {
          if (line && line.indexOf('a=rtcp:9 IN IP4 0.0.0.0') === 0) {
            if (firstTime) {
              const audioCandidates = this.rtc.mediaData.candidateList
                .filter(val => val.sdpMid === 'audio')
                .map(val => `a=${val.candidate}`);
              // audioCandidates.unshift(line);
              newsdp.splice(
                index + 1,
                0,
                audioCandidates[0],
                audioCandidates[1],
                audioCandidates[2],
                audioCandidates[3],
                audioCandidates[4],
                audioCandidates[5],
                audioCandidates[6],
              );
            } else {
              const videoCandidates = this.rtc.mediaData.candidateList
                .filter(val => val.sdpMid === 'video')
                .map(val => `a=${val.candidate}`);
              // videoCandidates.unshift(line);
              newsdp.splice(
                index + 1,
                0,
                videoCandidates[0],
                videoCandidates[1],
                videoCandidates[2],
                videoCandidates[3],
                videoCandidates[4],
                videoCandidates[5],
                videoCandidates[6],
              );
            }
            firstTime = false;
          }
          return line;
        });

        const isActivelyCalling = this.rtc.type === 'offer';
        const options = { sdp: newsdp.join('\r\n') };
        if (isActivelyCalling) {
          if (this.state === active) {
            this.setState(requesting);
            this.broadcastMethod(CallActions.Attach, options);
          } else {
            this.setState(requesting);
            this.broadcastMethod(CallActions.Invite, options);
          }
        } else {
          this.setState(answering);
          this.broadcastMethod(
            this.params.attach ? CallActions.Attach : CallActions.Answer,
            options,
          );
        }
      },
      onPeerStreaming: stream => {
        this.verto.options.onPeerStreaming(stream);
      },
      //(reason: any) => PromiseLike<never>
      onPeerStreamingError: (reason: any) => Promise.reject((error: any) => {
        this.verto.options.onPeerStreamingError(error);
        this.hangup({ cause: 'Device or Permission Error', causeCode: 604 });
        return Promise.reject(error);
      }),
      onNewCall: (call: Call) => {
        if(this.verto && this.verto.callbacks && this.verto.callbacks.onNewCall) {
          this.verto.callbacks.onNewCall(call);
        }
      }
    };
    
    this.rtc = new VertoRTC({
      callbacks,
      mediaHandlers: this.mediaHandlers,
      localVideo: this.params.screenShare ? null : (this.params.localVideo ? true : false),
      useVideo: (this.params.remoteVideo ? true : false),
      useAudio: (this.params.remoteAudioId ? true : false),
      videoParams: this.params.videoParams || {},
      audioParams: this.verto.options.audioParams || {},
      iceServers: this.verto.options.iceServers,
      screenShare: (this.params.screenShare ? true : false),
      useCamera: this.params.useCamera,
      useMic: this.params.useMic,
      useSpeak: this.params.useSpeak,
      verto: this.verto,
      userData: null
    });
  }

  private broadcastMethod(method: CallActions, options): void {
    const { noDialogParams, ...methodParams } = options;

    const dialogParams = Object.keys(this.params).reduce(
      (accumulator, currentKey) => {
        if (
          currentKey === 'sdp' &&
          method !== CallActions.Invite &&
          method !== CallActions.Attach
        ) {
          return accumulator;
        }

        if (currentKey === 'callID' && noDialogParams === true) {
          return accumulator;
        }

        return { ...accumulator, [currentKey]: this.params[currentKey] };
      },
      {},
    );

    const handleMethodResponseFn = success => x =>
      this.handleMethodResponse(method, success, x);
    
    this.verto.publish(
      method,
      {
        ...methodParams,
        dialogParams,
      },
      handleMethodResponseFn(true),
      handleMethodResponseFn(false),
    );
  }

  public setState(state: CallStateItem): boolean {
    if (this.state === ENUM.state.ringing) {
      // this.stopRinging(); // TODO set a ringer
    }

    const checkStateChange =
      state === ENUM.state.purge || ENUM.states[this.state.name][state.name];
    if (this.state === state || !checkStateChange) {
      console.log(
        `Invalid call state change from ${this.state.name} to ${state.name
        }. ${this}`,
      );
      this.hangup();
      return false;
    }

    this.lastState = this.state;
    this.state = state;

    this.verto.callbacks.onCallStateChange({
      previous: this.lastState,
      current: this.state,
      causeCode: this.causeCode
    }, this.params.callID);

    const speaker = this.params.useSpeak;
    const useCustomSpeaker = speaker && speaker !== 'any' && speaker !== 'none';
    const isAfterRequesting = this.lastState.val > ENUM.state.requesting.val;
    const isBeforeHangup = this.lastState.val < ENUM.state.hangup.val;

    switch (this.state) {
      case ENUM.state.early:
      case ENUM.state.active:
        if (useCustomSpeaker) {
          console.log('Custom speaker not supported, ignoring.');
        }
        break;

      case ENUM.state.trying:
        // setTimeout(() => {
        //   if (this.state === ENUM.state.trying) {
        //     console.log(`Turning off after 3s of trying. ${this}`);
        //     this.setState(ENUM.state.hangup);
        //   }
        // }, 3000);
        break;

      case ENUM.state.purge:
        this.setState(ENUM.state.destroy);
        break;

      case ENUM.state.hangup:
        if (isAfterRequesting && isBeforeHangup) {
          this.broadcastMethod(CallActions.Bye, { causeCode: this.causeCode });
        }

        this.setState(ENUM.state.destroy);
        break;

      case ENUM.state.destroy:
        delete this.verto.calls[this.params.callID];
        if (this.params.screenShare) {
          this.rtc.stopPeer();
        } else {
          this.rtc.stop();
        }
        break;

      default:
        break;
    }

    return true;
  }

  private handleMethodResponse(method: CallActions, success, response): void {
    switch (method) {
      case CallActions.Answer:
      case CallActions.Attach:
        if (success) {
          this.setState(ENUM.state.active);
        } else {
          this.hangup();
        }
        break;

      case CallActions.Invite:
        if (success) {
          this.setState(ENUM.state.trying);
        } else {
          this.setState(ENUM.state.destroy);
        }
        break;

      case CallActions.Bye:
        this.hangup({ causeCode: this.causeCode });
        break;

      case CallActions.Modify:
        if (response.holdState === 'held' && this.state !== ENUM.state.held) {
          this.setState(ENUM.state.held);
        }

        if (
          response.holdState === 'active' &&
          this.state !== ENUM.state.active
        ) {
          this.setState(ENUM.state.active);
        }
        break;

      default:
        break;
    }
  }

  public hangup(params?) {
    if (params) {
      this.cause = params.cause;
      this.causeCode = params.causeCode;
    }

    if (!this.cause) {
      this.cause = 'NORMAL_CLEARING';
    }

    if(!this.causeCode) {
      this.causeCode = 16;
    }

    const isNotNew = this.state.val >= ENUM.state.new.val;
    const didntHangupYet = this.state.val < ENUM.state.hangup.val;
    if (isNotNew && didntHangupYet) {
      this.setState(ENUM.state.hangup);
    }

    // TODO Check => converted to destroy.val from destroy
    const didntDestroyYet = this.state.val < ENUM.state.destroy.val;
    if (didntDestroyYet) {
      this.setState(ENUM.state.destroy);
    }
  }

  // stopRinging() {
  //   if (!this.verto.ringer) {
  //     return;
  //   }

  //   this.verto.ringer.getTracks().forEach(ringer => ringer.stop());
  // }

  // indicateRing() {
  //   if (!this.verto.ringer) {
  //     console.log(`Call is ringing, but no ringer set. ${this}`);
  //     return;
  //   }

  //   if (!this.verto.ringer.src && this.verto.options.ringFile) {
  //     this.verto.ringer.src = this.verto.options.ringFile;
  //   }

  //   this.verto.ringer.play();

  //   BackgroundTimer.setTimeout(() => {
  //     this.stopRinging();
  //     if (this.state === ENUM.state.ringing) {
  //       this.indicateRing();
  //     } else {
  //       console.log(`Call stopped ringing, but no ringer set. ${this}`);
  //     }
  //   }, this.verto.options.ringSleep);
  // }

  // ring() {
  //   this.setState(ENUM.state.ringing);
  //   this.indicateRing();
  // }

  sendTouchtone(digit) {
    this.broadcastMethod(CallActions.Info, { dtmf: digit });
  }

  sendRealTimeText({ code, chars }) {
    this.broadcastMethod(CallActions.Info, {
      txt: { code, chars },
      noDialogParams: true,
    });
  }

  transferTo(destination) {
    this.broadcastMethod(CallActions.Modify, { action: 'transfer', destination });
  }

  hold() {
    this.broadcastMethod(CallActions.Modify, { action: 'hold' });
  }

  unhold() {
    this.broadcastMethod(CallActions.Modify, { action: 'unhold' });
  }

  toggleHold() {
    this.broadcastMethod(CallActions.Modify, { action: 'toggleHold' });
  }

  sendMessageTo(to, body) {
    this.broadcastMethod(CallActions.Info, {
      msg: { from: this.params.login, to, body },
    });
  }

  answer() {
    if (this.answered) {
      return;
    }

    this.rtc.createAnswer(this.params);
    this.answered = true;
  }

  handleAnswer(sdp) {
    this.gotAnswer = true;

    if (this.state.val >= ENUM.state.active.val) {
      return;
    }

    const afterOrAtEarly = this.state.val >= ENUM.state.early.val;
    if (afterOrAtEarly) {
      this.setState(ENUM.state.active);
      return;
    }

    const shouldDelayForNow = this.gotEarly;
    if (shouldDelayForNow) {
      return;
    }

    this.rtc.answer(
      sdp,
      () => {
        this.setState(ENUM.state.active);
      },
      error => Promise.reject(error).then(value => {
        console.log('Error while answering', value);
        this.hangup();
        return Promise.reject();
      })
    );
  }

  getDestinationNumber() {
    return this.params.destination_number;
  }

  getId() {
    return this.params.callID;
  }

  getMediaHandlers() {
    return this.mediaHandlers;
  }

  getCallerIdentification() {
    return this.params.remote_caller_id_number;
  }

  getCalleeIdentification() {
    return this.params.callee_id_number;
  }

  handleInfo(params) {
    this.verto.callbacks.onInfo(params);
  }

  handleDisplay(displayName, displayNumber) {
    if (displayName !== undefined) {
      this.params.remote_caller_id_name = displayName;
    }

    if (displayNumber !== undefined) {
      this.params.remote_caller_id_number = displayNumber;
    }

    this.verto.callbacks.onDisplay({
      name: displayName,
      number: displayNumber,
    });
  }

  handleMedia(sdp) {
    if (this.state.val >= ENUM.state.early.val) {
      return;
    }

    this.gotEarly = true;

    this.rtc.answer(
      sdp,
      () => {
        this.setState(ENUM.state.early);

        if (this.gotAnswer) {
          this.setState(ENUM.state.active);
        }
      },
      reason => Promise.reject(reason).then(error => {
        console.log('Error on answering early', error);
        this.hangup();
        return Promise.reject();
      }),
    );
  }

  public toString(): string {
    const {
      callID: id,
      destination_number: destination,
      caller_id_name: callerName,
      caller_id_number: callerNumber,
      remote_caller_id_name: calleeName,
      remote_caller_id_number: calleeNumber,
    } = this.params;

    const attributes = [
      { key: 'id', value: id },
      { key: 'destination', value: destination },
      { key: 'from', value: `${callerName} (${callerNumber})` },
      { key: 'to', value: `${calleeName} (${calleeNumber})` },
    ]
      .map(({ key, value }) => `${key}: "${value}"`)
      .join(', ');
    return `Call<${attributes}>`;
  }
}
