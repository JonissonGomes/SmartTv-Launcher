import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  X,
  type LucideProps,
} from 'lucide-react'

const TV: LucideProps = {
  size: 22,
  strokeWidth: 2.25,
  absoluteStrokeWidth: true,
  'aria-hidden': true,
}

/** Ícones Lucide padronizados para controles de mídia / TV. */
export const MediaIcons = {
  Play: (p?: LucideProps) => <Play {...TV} {...p} />,
  Pause: (p?: LucideProps) => <Pause {...TV} {...p} />,
  SeekBack: (p?: LucideProps) => <RotateCcw {...TV} size={20} {...p} />,
  SeekFwd: (p?: LucideProps) => <RotateCw {...TV} size={20} {...p} />,
  PrevEp: (p?: LucideProps) => <SkipBack {...TV} {...p} />,
  NextEp: (p?: LucideProps) => <SkipForward {...TV} {...p} />,
  Episodes: (p?: LucideProps) => <ListVideo {...TV} {...p} />,
  CaptionsOn: (p?: LucideProps) => <Captions {...TV} {...p} />,
  CaptionsOff: (p?: LucideProps) => <CaptionsOff {...TV} {...p} />,
  Close: (p?: LucideProps) => <X {...TV} {...p} />,
  ChevronLeft: (p?: LucideProps) => <ChevronLeft {...TV} {...p} />,
  ChevronRight: (p?: LucideProps) => <ChevronRight {...TV} {...p} />,
}
