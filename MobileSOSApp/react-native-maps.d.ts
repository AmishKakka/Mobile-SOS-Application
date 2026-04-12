declare module 'react-native-maps' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface EdgePadding {
    top: number;
    right: number;
    bottom: number;
    left: number;
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

  export interface PolylineProps {
    coordinates: LatLng[];
    strokeColor?: string;
    strokeWidth?: number;
    lineDashPattern?: number[];
    geodesic?: boolean;
  }

  export interface MapViewProps extends ViewProps {
    provider?: any;
    initialRegion?: Region;
    region?: Region;
    showsUserLocation?: boolean;
    loadingEnabled?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
    zoomTapEnabled?: boolean;
    zoomControlEnabled?: boolean;
  }

  export const PROVIDER_GOOGLE: string;
  export default class MapView extends React.Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
    fitToCoordinates(
      coordinates: LatLng[],
      options?: { edgePadding?: EdgePadding; animated?: boolean },
    ): void;
  }
  export class Marker extends React.Component<MarkerProps> {}
  export class Circle extends React.Component<CircleProps> {}
  export class Polyline extends React.Component<PolylineProps> {}
}
