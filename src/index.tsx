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
