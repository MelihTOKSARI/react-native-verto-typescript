import { PermissionsAndroid, Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import uuid from 'react-native-uuid';
import { CallInfoParams } from 'react-native-verto-ts';
import BackgroundTimer from 'react-native-background-timer';

import { printLog } from '../vertoView/utils';
import Call from './Call';

class CallKeepHelper {

    private calls: Map<string, string> = new Map();
    private mutedCalls: Map<string, boolean> = new Map();
    private showLogs = false;

    private onIncomingCallAnswered?: (incomingCall: Call, callUUID: string) => void;
    private onCallEnded?: (handle: string) => void;
    private onShowIncomingCallUI?: (handle: string, name: string) => void;
    private incomingCall: Call = null;

    constructor() {
    }

    //#region Private Methods

    private addCall = (callUUID: string, number: string) => {
        this.calls.set(callUUID, number);
    };

    private answerCall = ({ callUUID }) => {
        const number = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-answerCall] ${callUUID}, number: ${number}`);
    
        if(this.onIncomingCallAnswered) {
            this.onIncomingCallAnswered(this.incomingCall, callUUID);
        }
        RNCallKeep.startCall(callUUID, number, number);
        BackgroundTimer.setTimeout(() => {
            printLog(this.showLogs, `[setCurrentCallActive] ${callUUID}, number: ${number}`);
            RNCallKeep.setCurrentCallActive(callUUID);
        }, 1000);
    };

    // private audioSessionActivated = (data: any) => {
    //     // you might want to do following things when receiving this event:
    //     // - Start playing ringback if it is an outgoing call
    //     printLog(this.showLogs, `[CallKeepHelper-audioSessionActivated] data ${data}`);
    // };

    private didPerformDTMFAction = ({ callUUID, digits }) => {
        const number = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-didPerformDTMFAction] ${callUUID}, number: ${number} (${digits})`);
    };

    private didReceiveStartCallAction = ({ handle }) => {
        if (!handle) {
          // @TODO: sometime we receive `didReceiveStartCallAction` with handle` undefined`
          return;
        }
        const callUUID = this.getNewUuid();
        this.addCall(callUUID, handle);

        printLog(this.showLogs, `[CallKeepHelper-didReceiveStartCallAction] ${callUUID}, number: ${handle}`);
    
        // RNCallKeep.startCall(this.callUUID, handle, handle);
    };

    private didPerformSetMutedCallAction = ({ muted, callUUID }) => {
        const number = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-didPerformSetMutedCallAction] ${callUUID}, number: ${number} (${muted})`);
    
        this.setCallMuted(callUUID, muted);
    };
    
    private didToggleHoldCallAction = ({ hold, callUUID }) => {
        const number = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-didToggleHoldCallAction] ${callUUID}, number: ${number} (${hold})`);
    };
    
    private endCall = ({ callUUID }) => {
        const handle = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-endCall] ${callUUID}, number: ${handle}`);

        this.removeCall(callUUID);

        if(this.onCallEnded) {
            this.onCallEnded(handle);
        }
    };

    private getNewUuid = () => uuid.v4() as string;

    private removeCall = (callUUID: string) => {
        this.calls.delete(callUUID);
    };

    private setCallMuted = (callUUID: string, muted: boolean) => {
        this.mutedCalls.set(callUUID, muted)
    };

    private showIncomingCallUI = ({ callUUID, handle, name }) => {
        printLog(this.showLogs, '[CallKeepHandler-showIncomingCallUI] callUUID:', callUUID, ' - handle:', handle, ' - name:', name);
        if(this.onShowIncomingCallUI) {
            this.onShowIncomingCallUI(handle, name);
        }
    }

    //#region Event Listener Methods

    /**
     * Add event listeners for RNCallKeep events
     */
    private subscribeToListeners = () => {
        RNCallKeep.addEventListener('answerCall', this.answerCall);
        RNCallKeep.addEventListener('didPerformDTMFAction', this.didPerformDTMFAction);
        RNCallKeep.addEventListener('didReceiveStartCallAction', this.didReceiveStartCallAction);
        RNCallKeep.addEventListener('didPerformSetMutedCallAction', this.didPerformSetMutedCallAction);
        RNCallKeep.addEventListener('didToggleHoldCallAction', this.didToggleHoldCallAction);
        RNCallKeep.addEventListener('endCall', this.endCall);
       // RNCallKeep.addEventListener('didActivateAudioSession', this.audioSessionActivated);
        if(Platform.OS === 'android') {
            RNCallKeep.addEventListener('showIncomingCallUi', this.showIncomingCallUI)
        }
    }

    /**
     * Remove event listeners for RNCallKeep events
     */
    private unsubscribeToListeners = () => {
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('didPerformDTMFAction');
        RNCallKeep.removeEventListener('didReceiveStartCallAction');
        RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
        RNCallKeep.removeEventListener('didToggleHoldCallAction');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didActivateAudioSession');

        if(Platform.OS === 'android') {
            RNCallKeep.removeEventListener('showIncomingCallUi');
        }
    }

    //#endregion

    //#endregion

    //#region Public Methods

    public destroy = () => {
        this.unsubscribeToListeners();
    }

    public displayIncomingCall = (callInfoParams: CallInfoParams, incomingCall: Call) => {
        this.incomingCall = incomingCall;

        const incomingCallUUID = this.getNewUuid();
        this.calls.set(incomingCallUUID, callInfoParams.from);
        printLog(this.showLogs, '[CallKeepHelper-displayIncomingCall] callUUID:', incomingCallUUID, ' - callInfoParams:', callInfoParams);
        RNCallKeep.displayIncomingCall(incomingCallUUID, callInfoParams.from, callInfoParams.callerName, 'generic', callInfoParams.useVideo);
    }

    public hangup = (callUUID: string) => {
        if(callUUID) {
            RNCallKeep.endCall(callUUID);
        } else {
            printLog(this.showLogs, '[CallKeepHelper-hangup] callUUID is undefined');
        }
    };

    public setOnMute = (callUUID: string, muted: boolean) => {
        const handle = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-setMutedCall: ${muted}] ${callUUID}, number: ${handle}`);
    
        RNCallKeep.setMutedCall(callUUID, muted);
        this.setCallMuted(callUUID, muted);
    };

    /**
     * Initialize RNCallKeep with both ios and android
     */
    public setup = (
        showsLog = false, 
        selfManaged = true,
        onIncomingCallAnswered?: (incomingCall: Call, callUUID: string) => void, 
        onCallEnded?: (handle: string) => void, onShowIncomingCallUI?: 
        (handle: string, name: string) => void) => {
        this.showLogs = showsLog;
        try {
            RNCallKeep.setup({
                ios: {
                    appName: 'CallKeepDemo',
                },
                android: {
                    alertTitle: 'Permissions required',
                    alertDescription: 'This application needs to access your phone accounts',
                    cancelButton: 'Cancel',
                    okButton: 'ok',
                    additionalPermissions: [PermissionsAndroid.PERMISSIONS.READ_CONTACTS],
                    selfManaged
                },
            });
            RNCallKeep.setAvailable(true);

            this.onIncomingCallAnswered = onIncomingCallAnswered;
            this.onCallEnded = onCallEnded;
            this.onShowIncomingCallUI = onShowIncomingCallUI;

            printLog(this.showLogs, '[CallKeepHelper-setup] finished setting up CallKeep');
            this.subscribeToListeners();
            printLog(this.showLogs, '[CallKeepHelper-setup] finished subscription to listeners');
        } catch(error) {
            printLog(this.showLogs, '[CallKeepHelper-setup] error occurred when setting up Call Keep. error:', error);
        }
    }

    public startCall = ({ handle, localizedCallerName }): string => {
        // Your normal start call action
        const callUUID = this.getNewUuid();
        this.calls.set(callUUID, handle);
        printLog(this.showLogs, `[CallKeepHelper-startCall] 1 handle: ${handle}, localizedCallerName: ${localizedCallerName}, uuid: ${callUUID}`);
        RNCallKeep.startCall(callUUID, handle, localizedCallerName);
        printLog(this.showLogs, `[CallKeepHelper-startCall] 2 handle: ${handle}, localizedCallerName: ${localizedCallerName}, uuid: ${callUUID}`);
        return callUUID;
    };

    public updateDisplay = (callUUID: string) => {
        const number = this.calls.get(callUUID);
        printLog(this.showLogs, `[CallKeepHelper-updateDisplay: ${number}] ${callUUID}`);

        // Workaround because Android doesn't display well displayName, se we have to switch ...
        if (Platform.OS === 'ios') {
          RNCallKeep.updateDisplay(callUUID, 'New Name', number);
        } else {
          RNCallKeep.updateDisplay(callUUID, number, 'New Name');
        }
    };

    //#endregion

}

const CallKeepHelperInstance = new CallKeepHelper();
export default CallKeepHelperInstance;