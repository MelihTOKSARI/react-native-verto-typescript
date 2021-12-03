/*
import {
  requireNativeComponent,
  UIManager,
  Platform,
  ViewStyle,
} from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-verto-typescript' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

type VertoTypescriptProps = {
  color: string;
  style: ViewStyle;
};

const ComponentName = 'VertoTypescriptView';

export const VertoTypescriptView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<VertoTypescriptProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };
*/

import Call from './verto-sdk/verto/Call';
import ConferenceLiveArray from './verto-sdk/conference/ConferenceLiveArray';
import LoginScreen from './verto-sdk/vertoView/LoginScreen';
import MakeCallParams from './verto-sdk/models/Call/MakeCallParams';
import MediaState from './verto-sdk/enums/MediaState.enum';
import VertoClient from './verto-sdk/verto/VertoClient';
import VertoInstanceManager from './verto-sdk/vertoView/VertoInstanceManager';
import VertoParams from './verto-sdk/models/VertoParams';
import VertoView from './verto-sdk/vertoView/index';
import ViewType from './verto-sdk/enums/ViewType.enum';

export {
    Call,
    ConferenceLiveArray,
    LoginScreen,
    MakeCallParams,
    MediaState,
    VertoClient,
    VertoInstanceManager,
    VertoParams,
    ViewType,
    VertoView
};
      