import type { ColorValue } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'search'
  | 'calendar'
  | 'profile'
  | 'plus'
  | 'message'
  | 'filter'
  | 'back'
  | 'forward'
  | 'pin'
  | 'clock'
  | 'seat'
  | 'board'
  | 'shield'
  | 'route'
  | 'check'
  | 'car'
  | 'close'
  | 'sliders'
  | 'chevron-down';

type AppIconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

export function AppIcon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 1.8,
}: AppIconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none">
      {name === 'home' && (
        <>
          <Path d="M3.8 10.4 12 3.8l8.2 6.6v9.1a.7.7 0 0 1-.7.7H4.5a.7.7 0 0 1-.7-.7v-9.1Z" {...common} />
          <Path d="M9 20.2v-5.5h6v5.5" {...common} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="10.7" cy="10.7" r="6.2" {...common} />
          <Path d="m15.3 15.3 4.3 4.3" {...common} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3.5" y="5.4" width="17" height="15" rx="2.2" {...common} />
          <Path d="M7.5 3.4v3.8M16.5 3.4v3.8M3.5 9.5h17" {...common} />
          <Circle cx="8" cy="13" r="1" fill={color} />
          <Circle cx="12" cy="13" r="1" fill={color} />
          <Circle cx="16" cy="13" r="1" fill={color} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx="12" cy="8" r="3.8" {...common} />
          <Path d="M4.9 20c.7-4.2 3.1-6.2 7.1-6.2s6.4 2 7.1 6.2" {...common} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} strokeWidth={strokeWidth + 0.5} />}
      {name === 'message' && (
        <>
          <Path d="M4.2 4.7h15.6v11.7H9l-4.8 3v-14.7Z" {...common} />
          <Path d="M8 9h8M8 12.4h5.5" {...common} />
        </>
      )}
      {name === 'filter' && (
        <>
          <Path d="M3.5 6h17M6.5 12h11M10 18h4" {...common} />
          <Circle cx="8" cy="6" r="1.5" fill={colors.paper} {...common} />
          <Circle cx="15" cy="12" r="1.5" fill={colors.paper} {...common} />
        </>
      )}
      {name === 'sliders' && (
        <>
          <Path d="M4 6h16M4 12h16M4 18h16" {...common} />
          <Circle cx="8" cy="6" r="1.7" fill={colors.paper} {...common} />
          <Circle cx="15" cy="12" r="1.7" fill={colors.paper} {...common} />
          <Circle cx="10" cy="18" r="1.7" fill={colors.paper} {...common} />
        </>
      )}
      {name === 'back' && <Path d="m14.6 5.4-6.4 6.6 6.4 6.6" {...common} strokeWidth={2.2} />}
      {name === 'forward' && <Path d="m9.4 5.4 6.4 6.6-6.4 6.6" {...common} strokeWidth={2.2} />}
      {name === 'pin' && (
        <>
          <Path d="M12 21s6.8-6.1 6.8-12A6.8 6.8 0 0 0 5.2 9c0 5.9 6.8 12 6.8 12Z" {...common} />
          <Circle cx="12" cy="9" r="2.4" {...common} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.8" {...common} />
          <Path d="M12 7v5.4l3.5 2.1" {...common} />
        </>
      )}
      {name === 'seat' && (
        <>
          <Path d="M7.2 5.2v8.7h8.9l1.8 5.1M7.2 13.9H4.8v5.1h9.9" {...common} />
        </>
      )}
      {name === 'board' && (
        <Rect x="5.4" y="2.8" width="13.2" height="18.4" rx="3.4" transform="rotate(15 12 12)" {...common} />
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3.2 19 6v5.8c0 4.4-2.7 7.5-7 9-4.3-1.5-7-4.6-7-9V6l7-2.8Z" {...common} />
          <Path d="m8.8 12 2.1 2.1 4.5-4.7" {...common} />
        </>
      )}
      {name === 'route' && (
        <>
          <Circle cx="6" cy="18" r="2.2" {...common} />
          <Circle cx="18" cy="6" r="2.2" {...common} />
          <Path d="M8.1 17.1c3.2-.6 2.2-4.6 5.2-5.2 2.6-.5 2.2-3.2 3-4.7" {...common} />
        </>
      )}
      {name === 'check' && <Path d="m4.8 12.2 4.5 4.5L19.4 6.6" {...common} strokeWidth={2.2} />}
      {name === 'car' && (
        <>
          <Path d="M4.2 10.2 6.7 5.8h10.6l2.5 4.4 1.7 1.4V18H2.5v-6.4l1.7-1.4Z" {...common} />
          <Path d="M6 10.2h12M7 18v1.5M17 18v1.5" {...common} />
          <Circle cx="6.6" cy="14.2" r="1.3" fill={color} />
          <Circle cx="17.4" cy="14.2" r="1.3" fill={color} />
        </>
      )}
      {name === 'close' && <Path d="m5.5 5.5 13 13M18.5 5.5l-13 13" {...common} strokeWidth={2} />}
      {name === 'chevron-down' && <Path d="m6 9 6 6 6-6" {...common} />}
    </Svg>
  );
}
