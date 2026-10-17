// Composition riêng cho từng task (Tâm viết khi khung SpaMotion/ClipEdit không đủ).
// Cách thêm: tạo file src/custom/<taskId>.tsx export một component, rồi khai báo ở mảng dưới:
//
//   import { MyVideo } from './t20261017-xxxx';
//   export const custom: CustomComposition[] = [
//     { id: 'Custom-t20261017-xxxx', component: MyVideo, defaultProps: {}, width: 1080, height: 1920, fps: 30, durationInFrames: 600 },
//   ];
//
// File src/custom/*.tsx (trừ index.tsx) không được đưa lên git.
import type React from 'react';

export type CustomComposition = {
  id: string;
  component: React.ComponentType<any>;
  defaultProps: Record<string, unknown>;
  calculateMetadata?: (o: { props: any }) => any;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
};

export const custom: CustomComposition[] = [];
