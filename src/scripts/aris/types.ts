// The contract between the page directors (always loaded) and ARIS-1's 3D layer (loaded lazily).
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

export type ArisEvents = {
  /** Someone clicked the robot. */
  onPoke(): void;
  /** Boot-up finished and the greeting is showing. */
  onReady(): void;
  onArrive(id: Waypoint): void;
  onDepart(id: Waypoint): void;
};

export type MountOptions = {
  /** Where ARIS-1 docks: its poster ([data-aris-poster]) fades out once the 3D robot is up. */
  slot: HTMLElement;
  /** The callout line after boot-up. */
  greeting: string;
  telemetry?: Telemetry;
  events?: Partial<ArisEvents>;
  /** The home page's solar flight mode; its code loads on first use. */
  solar?: boolean;
};

export interface Aris {
  /** Fly next to an element, or back to the dock with null. */
  attend(el: HTMLElement | null): void;
  /** Fly to an element and sweep it with the scanner for `ms`. */
  scan(el: HTMLElement, ms: number): void;
  /** Sweep an element from where ARIS-1 is, without flying there. */
  ping(el: HTMLElement, ms: number): void;
  stopScan(): void;
  /** Turn and look at an element (null: back to following the pointer). */
  watch(el: HTMLElement | null): void;
  /** Raise the multi-tool toward an element without firing (null: lower it). */
  point(el: HTMLElement | null): void;
  inspect(part: Part | null): void;
  /** Show a short line in the callout next to the robot. */
  say(text: string, ms?: number): void;
  /** The visor flickers along while ARIS-1 is speaking. */
  talk(on: boolean): void;
  nod(): void;
  /** A spin and a wave. */
  celebrate(): void;
  greet(): void;
  enterSolar(): Promise<void>;
  exitSolar(): Promise<void>;
  flyTo(id: Waypoint): void;
  /** Solar mode: which body ARIS-1 is at or heading for. */
  readonly destination: Waypoint;
}
