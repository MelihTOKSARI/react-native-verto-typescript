import { MediaStream } from 'react-native-webrtc';
import MakeCallParams from '../models/Call/MakeCallParams';

import VertoParams from "../models/VertoParams";
import { defaultVertoCallbacks } from "../store";
import Call from "../verto/Call";
import VertinhoClient from "../verto/VertoClient";
import { printLog } from './utils';

class VertoInstance {
    private vertoClient: VertinhoClient;
    private instanceCallbackListeners: any = {};

    private instanceCallbackListener: any;
    private instanceCallbackListenerKey: string;
    private instanceCallbacks: defaultVertoCallbacks;

    private showLogs: boolean;

    public createInstance(params: VertoParams, callbacks: defaultVertoCallbacks, showLogs?: boolean): VertinhoClient {
        printLog(showLogs, '[vertoInstance] params:', params);
        if(!this.vertoClient) {
            printLog(showLogs, '[vertoInstance] vertoClient is null and will be instantiated');
            this.vertoClient = new VertinhoClient(params, {
                ...callbacks,
                onCallStateChange: this.onCallStateChange,
                onNewCall: this.onNewCall,
                onPlayLocalVideo: this.onPlayLocalVideo,
                onPlayRemoteVideo: this.onPlayRemoteVideo
            });
        } else {
            printLog(showLogs, '[vertoInstance] vertoClient is already instantiated');
        }

        this.instanceCallbacks = callbacks;

        this.showLogs = showLogs;

        return this.vertoClient;
    }

    public destroy() {
        if(this.vertoClient) {
            this.vertoClient.destroy();
            this.vertoClient = undefined;
        }
    }

    public getInstance(key?: string, callbackListeners?: any) {
        if(key && callbackListeners) {
            printLog(this.showLogs, '[vertoInstance] key:', key, ' - callbackListeners:', callbackListeners);
            // this.instanceCallbackListeners[key] = callbackListeners;
            this.instanceCallbackListenerKey = key;
            this.instanceCallbackListener = callbackListeners;
        }

        return this.vertoClient;
    }

    public removeInstanceCallbacks(key: string) {
        if (key === this.instanceCallbackListenerKey) {
            this.instanceCallbackListener = null;
        }
        // if(this.instanceCallbackListeners[key]) {
        //     delete this.instanceCallbackListeners[key];
        // }
    }

    public makeCall(callParams: MakeCallParams): Call {
        if(!this.vertoClient) {
            printLog(this.showLogs, '[vertoInstance] vertoClient is not instantiated!!!');
            return;
        }

        const call = this.vertoClient.makeVideoCall(callParams);
        printLog(this.showLogs, '[vertoInstance] this.call is null?', (call == null));

        return call;
    }
    
    public hangUpCall(call: Call) {
        if(call && call.getId()) {
          printLog(this.showLogs, '[vertoInstance] hangupCall call is null?', (call == null));
          this.vertoClient.hangup(call.getId());
        } else {
          printLog(this.showLogs, '[vertoInstance] hangupCall else block');
        }
    }

    private onCallStateChange = (state: any) => {
        printLog(this.showLogs, '[vertoInstance] onCallStateChange => ', state, ' - instanceCallbackListeners:', this.instanceCallbackListeners);
        if(this.instanceCallbacks && this.instanceCallbacks.onCallStateChange) {
            this.instanceCallbacks.onCallStateChange(state);
        }

        if (this.instanceCallbackListener && this.instanceCallbackListener['onCallStateChange']) {
            // Object.keys(this.instanceCallbackListeners).forEach(key => {
            //     if(this.instanceCallbackListeners[key]['onCallStateChange']) {
            //         this.instanceCallbackListeners[key]['onCallStateChange'](key, state);
            //     }
            // })
            this.instanceCallbackListener['onCallStateChange'](this.instanceCallbackListenerKey, state);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onCallStateChange');
        }
    }
    
    private onNewCall = (call: Call) => {
        printLog(this.showLogs, '[vertoInstance] onNewCall:', call);
        if(this.instanceCallbacks && this.instanceCallbacks.onNewCall) {
            this.instanceCallbacks.onNewCall(call);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['oneNewCall']) {
            // Object.keys(this.instanceCallbackListeners).forEach(key => {
            //     if(this.instanceCallbackListeners[key]['onNewCall']) {
            //         this.instanceCallbackListeners[key]['onNewCall'](key, call);
            //     }
            // })
            this.instanceCallbackListener['oneNewCall'](this.instanceCallbackListenerKey, call);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onNewCall');
        }
    }

    private onPlayLocalVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayLocalVideo stream.toURL:', stream);
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayLocalVideo) {
            this.instanceCallbacks.onPlayLocalVideo(stream);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['onPlayLocalVideo']) {
            // Object.keys(this.instanceCallbackListeners).forEach(key => {
            //     if(this.instanceCallbackListeners[key]['onPlayLocalVideo']) {
            //         this.instanceCallbackListeners[key]['onPlayLocalVideo'](key, stream);
            //     }
            // })
            this.instanceCallbackListener['onPlayLocalVideo'](this.instanceCallbackListenerKey, stream);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onPlayLocalVideo');
        }
    }

    private onPlayRemoteVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayRemoteVideo stream.toURL:', stream.toURL());
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayRemoteVideo) {
            this.instanceCallbacks.onPlayRemoteVideo(stream);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['onPlayRemoteVideo']) {
            // Object.keys(this.instanceCallbackListeners).forEach(key => {
            //     if(this.instanceCallbackListeners[key]['onPlayRemoteVideo']) {
            //         this.instanceCallbackListeners[key]['onPlayRemoteVideo'](key, stream);
            //     }
            // })
            this.instanceCallbackListener['onPlayRemoteVideo'](this.instanceCallbackListenerKey, stream);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onPlayRemoteVideo');
        }
    }
}

const VertoInstanceManager = new VertoInstance();
export default VertoInstanceManager;