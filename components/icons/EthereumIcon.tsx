import React from 'react';
import { Svg, Polygon } from 'react-native-svg';

interface EthereumIconProps {
  size?: number;
  color?: string;
}

export const EthereumIcon: React.FC<EthereumIconProps> = ({ size = 24, color = '#627eea' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 311.39 507.11">
      <Polygon
        points="155.65 0 152.25 11.56 152.25 346.87 155.65 350.26 311.3 258.26 155.65 0"
        fill="#343434"
      />
      <Polygon
        points="155.65 0 0 258.26 155.65 350.27 155.65 187.51 155.65 0"
        fill="#8c8c8c"
      />
      <Polygon
        points="155.65 379.74 153.73 382.07 153.73 501.52 155.65 507.11 311.39 287.78 155.65 379.74"
        fill="#3c3c3b"
      />
      <Polygon
        points="155.65 507.11 155.65 379.73 0 287.78 155.65 507.11"
        fill="#8c8c8c"
      />
      <Polygon
        points="155.65 350.26 311.3 258.26 155.65 187.51 155.65 350.26"
        fill="#141414"
      />
      <Polygon
        points="0 258.26 155.65 350.26 155.65 187.51 0 258.26"
        fill="#393939"
      />
    </Svg>
  );
};
