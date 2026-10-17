import React from 'react';
import { Composition } from 'remotion';
import { ClipEdit, clipEditMetadata } from './ClipEdit';
import { SpaMotion, spaMotionMetadata } from './SpaMotion';
import { custom } from './custom';
import type { ClipEditProps, SpaMotionProps } from './types';

const sampleMotion: SpaMotionProps = {
  ratio: '9:16',
  disclaimer: 'Kết quả tùy cơ địa mỗi người',
  scenes: [
    { type: 'title', duration: 3, heading: '60 phút cho riêng bạn', sub: 'Massage đá nóng thư giãn' },
    { type: 'steps', duration: 4, heading: 'Liệu trình 3 bước', steps: ['Xông thảo mộc', 'Massage đá nóng', 'Trà gừng ấm'] },
    { type: 'offer', duration: 3.5, badge: 'ƯU ĐÃI', heading: 'Giảm 30% tuần này', oldPrice: '500.000đ', price: '350.000đ' },
    { type: 'cta', duration: 3, heading: 'Đặt lịch ngay', sub: 'Inbox để Spa giữ chỗ cho bạn', contact: 'Hotline 09xx xxx xxx' },
  ],
};

const sampleClips: ClipEditProps = {
  ratio: '9:16',
  intro: { heading: 'Một buổi chiều ở Spa', sub: 'Thư giãn trọn vẹn', duration: 2.5 },
  clips: [],
  outro: { heading: 'Hẹn bạn ở Spa', contact: 'Inbox để đặt lịch', duration: 3 },
};

export const Root: React.FC = () => (
  <>
    <Composition id="SpaMotion" component={SpaMotion} defaultProps={sampleMotion} calculateMetadata={spaMotionMetadata}
      width={1080} height={1920} fps={30} durationInFrames={300} />
    <Composition id="ClipEdit" component={ClipEdit} defaultProps={sampleClips} calculateMetadata={clipEditMetadata}
      width={1080} height={1920} fps={30} durationInFrames={300} />
    {custom.map((c) => (
      <Composition key={c.id} id={c.id} component={c.component} defaultProps={c.defaultProps}
        calculateMetadata={c.calculateMetadata} width={c.width || 1080} height={c.height || 1920} fps={c.fps || 30}
        durationInFrames={c.durationInFrames || 300} />
    ))}
  </>
);
