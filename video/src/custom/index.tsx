// Composition riêng cho từng task (Tâm viết khi khung SpaMotion/ClipEdit không đủ).
// KHÔNG sửa file này. Chỉ cần tạo file src/custom/<taskId>.tsx và export:
//
//   export const composition: CustomComposition = {
//     id: 'Custom-<taskId>', component: MyVideo, defaultProps: {},
//     width: 1080, height: 1920, fps: 30, durationInFrames: 360,
//   };
//
// File sẽ được tự động nhận diện. Các file src/custom/*.tsx (trừ index.tsx) không được đưa lên git.
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

declare const require: { context: (dir: string, deep: boolean, re: RegExp) => { keys(): string[]; (k: string): any } };

const files = require.context('./', false, /^\.\/(?!index\.)[^/]+\.tsx$/);

export const custom: CustomComposition[] = files.keys().flatMap((k) => {
  const c = files(k).composition as CustomComposition | undefined;
  return c && c.id && c.component ? [c] : [];
});
