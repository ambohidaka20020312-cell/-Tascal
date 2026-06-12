import { useViewport, DeviceType } from "../hooks/useViewport";

export const BREAKPOINTS = {
  "phone-small": 0,
  phone: 375,
  "phone-large": 428,
  tablet: 768,
  desktop: 1024,
  ultrawide: 1920,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

const BREAKPOINT_ORDER: BreakpointName[] = [
  "phone-small",
  "phone",
  "phone-large",
  "tablet",
  "desktop",
  "ultrawide",
];

function bpIndex(bp: BreakpointName): number {
  return BREAKPOINT_ORDER.indexOf(bp);
}

export interface BreakpointUtils {
  current: DeviceType;
  isAtLeast: (bp: BreakpointName) => boolean;
  isAtMost: (bp: BreakpointName) => boolean;
}

export function useBreakpoint(): BreakpointUtils {
  const { deviceType } = useViewport();

  const isAtLeast = (bp: BreakpointName) =>
    bpIndex(deviceType as BreakpointName) >= bpIndex(bp);

  const isAtMost = (bp: BreakpointName) =>
    bpIndex(deviceType as BreakpointName) <= bpIndex(bp);

  return { current: deviceType, isAtLeast, isAtMost };
}
