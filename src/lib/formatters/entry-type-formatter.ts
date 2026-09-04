import { ENTRY_TYPE_NAMES, type EntryTypeName } from '@hayman/hayagriva-schema';
import {
  BookIcon,
  BookOpenIcon,
  BookTypeIcon,
  ClipboardListIcon,
  CopyrightIcon,
  EyeIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileTextIcon,
  FilmIcon,
  FolderOpenIcon,
  GlobeIcon,
  GraduationCapIcon,
  LandmarkIcon,
  LayersIcon,
  MessageCircleIcon,
  MusicIcon,
  NewspaperIcon,
  PaletteIcon,
  PenLineIcon,
  StarIcon,
  UsersIcon,
  VideoIcon,
} from '@lucide/svelte';

export const entryTypeIcons: Record<EntryTypeName, typeof BookOpenIcon> = {
  article: FileTextIcon,
  chapter: FileTextIcon,
  entry: FileTextIcon,
  anthos: LayersIcon,
  report: ClipboardListIcon,
  thesis: GraduationCapIcon,
  web: GlobeIcon,
  scene: FilmIcon,
  artwork: PaletteIcon,
  patent: CopyrightIcon,
  case: LandmarkIcon,
  newspaper: NewspaperIcon,
  legislation: LandmarkIcon,
  manuscript: PenLineIcon,
  original: StarIcon,
  post: MessageCircleIcon,
  misc: FileArchiveIcon,
  performance: MusicIcon,
  periodical: BookTypeIcon,
  proceedings: LayersIcon,
  book: BookIcon,
  blog: GlobeIcon,
  reference: ClipboardListIcon,
  conference: UsersIcon,
  anthology: LayersIcon,
  repository: FolderOpenIcon,
  thread: MessageCircleIcon,
  video: VideoIcon,
  audio: FileAudioIcon,
  exhibition: EyeIcon,
};

/**
 * Re-exported for backwards compatibility - prefer importing
 * `ENTRY_TYPE_NAMES` from `@hayman/hayagriva-schema` directly in new code.
 */
export const ENTRY_TYPES = ENTRY_TYPE_NAMES;

function isEntryTypeName(value: string): value is EntryTypeName {
  return (ENTRY_TYPE_NAMES as readonly string[]).includes(value);
}

export function formatEntryType(type: string): {
  label: string;
  Icon: typeof BookOpenIcon;
} {
  if (!type) return { label: '', Icon: FileArchiveIcon };
  const normalized = type.charAt(0).toLowerCase() + type.slice(1).toLowerCase();
  const Icon = isEntryTypeName(normalized)
    ? entryTypeIcons[normalized]
    : FileArchiveIcon;
  const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return { label, Icon };
}
