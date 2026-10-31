// The contract between the page controller (always loaded) and ARIS-1's 3D layer (loaded lazily).
import type { Part, Waypoint } from '../../data/site';

/** Live numbers for the HUD: the 3D layer writes them every frame, the controller reads them. */
export type Telemetry = {
  sys: 'STANDBY' | 'BOOTING' | 'ONLINE' | 'STATIC';
  /** Inspect mode: px from the centre of the screen. Solar mode: scene units from the sun. */
  x: number;
  y: number;
  /** 0..1 */
  thrust: number;
  fps: number;
  /** Solar mode: distance to the body ARIS-1 is heading for, in scene units. */
  distance: number;
};

export interface Aris {
  /** Fly next to an element, or back to the dock with null. */
  attend(el: HTMLElement | null): void;
  /** Fly to an element and sweep it with the scanner for `ms`. */
  scan(el: HTMLElement, ms: number): void;
  stopScan(): void;
  inspect(part: Part | null): void;
  /** Show a short line in the callout next to the robot. */
  say(text: string, ms?: number): void;
  greet(): void;
  enterSolar(): Promise<void>;
  exitSolar(): Promise<void>;
  flyTo(id: Waypoint): void;
  /** Solar mode: which body ARIS-1 is at or heading for. */
  readonly destination: Waypoint;
}

export type ArisEvents = {
  onPoke(): void;
  onArrive(id: Waypoint): void;
  onDepart(id: Waypoint): void;
};
