// Kiểu dữ liệu props cho các khung video. Mọi thời lượng tính bằng GIÂY.
// Đường dẫn file (ảnh, clip, nhạc, logo) tính từ thư mục workspace/,
// ví dụ "assets/files/abc-logo.png" hoặc "outputs/<task>/images/anh-1.png".

export type Ratio = '9:16' | '4:5' | '1:1' | '16:9';

export type Brand = {
  name?: string;
  primary?: string;     // màu chủ đạo (nền khối, nút)
  accent?: string;      // màu nhấn (giá, điểm nhấn)
  background?: string;  // màu nền
  text?: string;        // màu chữ
  logo?: string;        // file logo
};

export type Music = { src: string; volume?: number };

export type Scene =
  | { type: 'title'; duration: number; heading: string; sub?: string; image?: string }
  | { type: 'image'; duration: number; image: string; caption?: string; zoom?: 'in' | 'out' }
  | { type: 'bullets'; duration: number; heading: string; items: string[]; image?: string }
  | { type: 'steps'; duration: number; heading: string; steps: string[] }
  | { type: 'offer'; duration: number; heading: string; price?: string; oldPrice?: string; note?: string; badge?: string }
  | { type: 'quote'; duration: number; text: string; author?: string }
  | { type: 'cta'; duration: number; heading: string; sub?: string; contact?: string };

export type SpaMotionProps = {
  composition?: 'SpaMotion';
  ratio: Ratio;
  fps?: number;
  brand?: Brand;
  music?: Music;
  disclaimer?: string;
  scenes: Scene[];
};

export type Clip = {
  src: string;
  start?: number;    // bắt đầu cắt từ giây thứ...
  end?: number;      // cắt đến giây thứ... (bỏ trống = hết clip)
  caption?: string;  // phụ đề hiện trong suốt đoạn clip
  muted?: boolean;   // tắt tiếng gốc (mặc định: tắt nếu có nhạc nền)
  duration?: number; // (tự tính) độ dài đoạn đã cắt
};

export type ClipEditProps = {
  composition?: 'ClipEdit';
  ratio: Ratio;
  fps?: number;
  brand?: Brand;
  music?: Music;
  disclaimer?: string;
  intro?: { heading: string; sub?: string; duration: number };
  clips: Clip[];
  outro?: { heading: string; sub?: string; contact?: string; duration: number };
};
