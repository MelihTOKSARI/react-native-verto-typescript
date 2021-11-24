import { CallActions } from "../enums/CallActions.enum";
import ConferenceSubscriptionItems from "../models/ConferenceSubscriptionItems";
import ModerationCallbacks from "../models/ModerationCallbacks";
import VertinhoClient from "../verto/VertoClient";

let gSerialNumber = 0;

export default class ConferenceManager {
  private verto: VertinhoClient;
  private subscriptions: ConferenceSubscriptionItems;
  private destroyed: boolean;
  private serno: number;

  constructor(verto: VertinhoClient, subscriptions: ConferenceSubscriptionItems) {
    this.verto = verto;
    this.subscriptions = {
      info: {
        channel: null,
        handler: null,
      },
      chat: {
        channel: null,
        handler: null,
      },
      mod: {
        channel: null,
        handler: null,
      },
      ...subscriptions,
    };

    this.serno = gSerialNumber;
    gSerialNumber += 1;

    Object.keys(this.subscriptions).forEach((key) => {
      const { channel, handler } = this.subscriptions[key] || {};
      if (channel && handler) {
        this.verto.subscribe(channel, { handler });
      }
    });
    this.destroyed = false;
  }

  public destroy(): void {
    Object.keys(this.subscriptions).forEach((key) => {
      const { channel } = this.subscriptions[key] || {};
      if (channel) {
        this.verto.unsubscribe(channel);
      }
    });
    this.destroyed = true;
  }

  private broadcast(eventChannel, data): void {
    if (this.destroyed) {
      console.log('Tried to broadcast from destroyed conference manager.');
      return;
    }

    if (!eventChannel) {
      return;
    }

    this.verto.publish(CallActions.Broadcast, { eventChannel, data });
  }

  // TODO type argument is ambigious
  private broadcastModeratorCommand(command: string, memberId: string, argument: Array<string>): void {
    this.broadcast(this.subscriptions.mod.channel, {
      command,
      id: memberId && parseInt(memberId, 10),
      value: argument,
      application: 'conf-control',
    });
  }

  // TODO type argument is ambigious
  private broadcastRoomCommand(command: string, ...argument: string[]): void {
    this.broadcastModeratorCommand(command, null, argument);
  }

  private broadcastChatMessage(text: string): void {
    this.broadcast(this.subscriptions.chat.channel, {
      message: text,
      action: 'send',
      type: 'message',
    });
  }

  private askVideoLayouts(): void {
    this.broadcastRoomCommand('list-videoLayouts');
  }

  private playMediaFileFromServer(filename: string): void {
    this.broadcastRoomCommand('play', filename);
  }

  private stopMediaFilesFromServer(): void {
    this.broadcastRoomCommand('stop', 'all');
  }

  private startRecordingOnServer(filename: string): void {
    this.broadcastRoomCommand('recording', 'start', filename);
  }

  private stopRecordingsOnServer(): void {
    this.broadcastRoomCommand('recording', 'stop', 'all');
  }

  private saveSnapshotOnServer(filename: string): void {
    this.broadcastRoomCommand('vid-write-png', filename);
  }

  private changeVideoLayout(layout, canvas): void {
    this.broadcastRoomCommand('vid-layout', canvas ? [layout, canvas] : layout);
  }

  // TODO add return type
  private moderateMemberById(memberId: string): ModerationCallbacks {
    const constantBroadcasterFor = (command: string) => (argument: string) => () => {
      this.broadcastModeratorCommand(command, memberId, [argument]);
    };

    const parameterizedBroadcasterFor = (command: string) => (argument: string) => {
      this.broadcastModeratorCommand(command, memberId, [argument]);
    };

    const parameterizedBroadcasterForSettingVideoBanner = () => (text: string) => {
      this.broadcastModeratorCommand('vid-banner', memberId, ['reset']);

      if (text.trim().toLowerCase() === 'reset') {
        this.broadcastModeratorCommand('vid-banner', memberId, [`${text}\n`]);
      } else {
        this.broadcastModeratorCommand('vid-banner', memberId, [text]);
      }
    };

    const constantBroadcasterForCleaningVideoBanner = () => () => {
      this.broadcastModeratorCommand('vid-banner', memberId, ['reset']);
    };

    return {
      toBeNotDeaf: constantBroadcasterFor('undeaf')(null),
      toBeDeaf: constantBroadcasterFor('deaf')(null),
      toBeKickedOut: constantBroadcasterFor('kick')(null),
      toToggleMicrophone: constantBroadcasterFor('tmute')(null),
      toToggleCamera: constantBroadcasterFor('tvmute')(null),
      toBePresenter: constantBroadcasterFor('vid-res-id')('presenter'),
      toBeVideoFloor: constantBroadcasterFor('vid-floor')('force'),
      toHaveVideoBannerAs: parameterizedBroadcasterForSettingVideoBanner(),
      toCleanVideoBanner: constantBroadcasterForCleaningVideoBanner(),
      toIncreaseVolumeOutput: constantBroadcasterFor('volume_out')('up'),
      toDecreaseVolumeOutput: constantBroadcasterFor('volume_out')('down'),
      toIncreaseVolumeInput: constantBroadcasterFor('volume_in')('up'),
      toDecreaseVolumeInput: constantBroadcasterFor('volume_in')('down'),
      toTransferTo: parameterizedBroadcasterFor('transfer'),
    };
  }
}
