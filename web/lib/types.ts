export type Trade = {
  id: string;
  video_id: string;
  video_date: string | null;
  instrument: string | null;
  direction: "long" | "short" | null;
  final_outcome: string;
  setup_type: string | null;
  estimated_rr: string | null;
  reasoning: string | null;
  entry_frame_path: string | null;
  trade_clip_path: string | null;
  similarity?: number;
};

export type TranscriptChunk = {
  id: string;
  video_id: string;
  video_date: string | null;
  start_sec: number;
  end_sec: number;
  text: string;
  similarity?: number;
};
