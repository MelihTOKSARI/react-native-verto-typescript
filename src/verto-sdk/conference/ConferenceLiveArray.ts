import { ConferenceActionEvent } from "../enums/ConferenceActionEvent.enum";
import ConferenceCallback from "../models/ConferenceCallback";
import EventSubscription from "../models/EventSubscription";
import VertinhoClient from "../verto/VertoClient";

export default class ConferenceLiveArray {
  private hashTable: Object;
  private orderedCallIds: Array<string>;
  private lastSerialNumber: number;
  private serialNumberErrors: number;

  private verto: VertinhoClient;
  // TODO
  private liveArrayChannel: any;
  private conferenceName: string;
  private callbacks: ConferenceCallback;
  private subscription: EventSubscription;
  private destroyed: boolean;

  constructor(verto: VertinhoClient, liveArrayChannel: any, conferenceName: string, callbacks = {}) {
    this.hashTable = {};
    this.orderedCallIds = [];
    this.lastSerialNumber = 0;
    this.serialNumberErrors = 0;

    this.verto = verto;
    this.liveArrayChannel = liveArrayChannel;
    this.conferenceName = conferenceName;
    // TODO
    this.callbacks = {
      onBootstrappedMembers: (x: any) => x,
      onAddedMember: (x: any) => x,
      onModifiedMember: (x: any) => x,
      onRemovedMember: (x: any) => x,
      ...callbacks,
    };

    this.subscription = verto.subscribe(liveArrayChannel, {
      handler: this.handleEvent.bind(this),
      userData: this,
    });
    this.destroyed = false;

    this.bootstrap();
  }

  public destroy(): void {
    this.verto.unsubscribe(this.subscription.eventChannel);
    this.destroyed = true;
  }

  // TODO value parameter
  private insertValue(callId: string, value: any, insertAt?: number): void {
    if (this.hashTable[callId]) {
      return;
    }

    this.hashTable[callId] = value;

    if (insertAt === undefined || insertAt < 0 || insertAt >= this.orderedCallIds.length) {
      this.orderedCallIds = [...this.orderedCallIds, callId];
      return;
    }

    this.orderedCallIds = this.orderedCallIds.reduce((accumulator, currentCallId, currentIndex) => {
      if (currentIndex === insertAt) {
        return [...accumulator, callId, currentCallId];
      }

      return [...accumulator, currentCallId];
    }, []);
  }

  public deleteValue(callId: string): boolean {
    if (!this.hashTable[callId]) {
      return false;
    }

    this.orderedCallIds = this.orderedCallIds.filter(existingCallId => existingCallId !== callId);
    delete this.hashTable[callId];
    return true;
  }

  private checkSerialNumber(serialNumber: number): boolean {
    if (this.lastSerialNumber > 0 && serialNumber !== (this.lastSerialNumber + 1)) {
      this.serialNumberErrors += 1;
      if (this.serialNumberErrors < 3) {
        this.bootstrap();
      }
      return false;
    }

    if (serialNumber > 0) {
      this.lastSerialNumber = serialNumber;
    }

    return true;
  }

  // TODO dataArray parameter
  private handleBootingEvent(eventSerialNumber: number, dataArray: any): void {
    if (!this.checkSerialNumber(eventSerialNumber)) {
      return;
    }

    dataArray.forEach((data: any) => {
      const [callId, value] = data;
      this.insertValue(callId, value);
    });

    this.callbacks.onBootstrappedMembers({ dataArray });
  }

  private handleAddingEvent(eventSerialNumber: number, value: any, callId: string, index: number): void {
    if (!this.checkSerialNumber(eventSerialNumber)) {
      return;
    }

    // TODO Control below eventSerialNumber parameter type
    this.insertValue(callId || eventSerialNumber.toString(), value, index);
    this.callbacks.onAddedMember(value);
  }

  private handleModifyingEvent(eventSerialNumber: number, value: any, callId: string, index: number): void {
    if (!this.checkSerialNumber(eventSerialNumber)) {
      return;
    }

    // TODO Control below eventSerialNumber parameter type
    this.insertValue(callId || eventSerialNumber.toString(), value, index);
    this.callbacks.onModifiedMember(value);
  }

  private handleDeleteEvent(eventSerialNumber: number, callId: string, index: number): void {
    if (!this.checkSerialNumber(eventSerialNumber)) {
      return;
    }

    const eventIndexIsInvalid = (index === null) || (index === undefined) || (index < 0);
    // TODO Control below eventSerialNumber parameter type
    const localIndex = this.orderedCallIds.indexOf(callId || eventSerialNumber.toString());

    // TODO Control below eventSerialNumber parameter type
    const isDiffAfterBoot = this.deleteValue(callId || eventSerialNumber.toString());
    if (!isDiffAfterBoot) {
      return;
    }

    const report = { callId, index: eventIndexIsInvalid ? localIndex : index };
    this.callbacks.onRemovedMember(report);
  }

  // TODO event parameter
  private handleEvent(event: any, liveArray: ConferenceLiveArray): void {
    const {
      wireSerno: serialNumber,
      arrIndex: arrayIndex,
      name: conferenceName,
      data: payload,
      hashKey: callId,
      action,
    } = event.data;

    if (conferenceName !== liveArray.conferenceName) {
      return;
    }

    switch (action) {
      case ConferenceActionEvent.boot:
        this.handleBootingEvent(serialNumber, payload);
        break;
      case ConferenceActionEvent.add:
        this.handleAddingEvent(serialNumber, payload, callId, arrayIndex);
        break;
      case ConferenceActionEvent.modify:
        if (arrayIndex || callId) {
          this.handleModifyingEvent(serialNumber, payload, callId, arrayIndex);
        }
        break;
      case ConferenceActionEvent.delete:
        if (arrayIndex || callId) {
          this.handleDeleteEvent(serialNumber, callId, arrayIndex);
        }
        break;
      default:
        console.log('Ignoring not implemented live array action', action);
        break;
    }
  }

  private bootstrap(): void {
    this.verto.broadcast(this.liveArrayChannel, {
      liveArray: {
        command: 'bootstrap',
        context: this.liveArrayChannel,
        name: this.conferenceName,
      },
    });
  }
}
