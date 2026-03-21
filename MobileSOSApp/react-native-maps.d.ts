declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MarkerProps {
    coordinate: LatLng;
    title?: string;
    description?: string;
    pinColor?: string;
  }

  export interface CircleProps {
    center: LatLng;
    radius: number;
    strokeWidth?: number;
    strokeColor?: string;
    fillColor?: string;
  }

  export interface MapViewProps extends ViewProps {
    provider?: any;
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
    showsUserLocation?: boolean;
    loadingEnabled?: boolean;
  }

  export const PROVIDER_GOOGLE: string;
  export default class MapView extends React.Component<MapViewProps> {}
  export class Marker extends React.Component<MarkerProps> {}
  export class Circle extends React.Component<CircleProps> {}
}
