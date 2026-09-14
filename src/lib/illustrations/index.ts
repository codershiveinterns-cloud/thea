/** Public surface of the Windows 11 Settings illustration generator. See generate.ts and screens.ts. */
export {
  generateIllustrationsForPost,
  planIllustrations,
  illustrationUrl,
  stripIllustrations,
  ILLUSTRATION_MARKER,
  LEGACY_UPLOAD_MARKER,
  FEATURED_SIZE,
  INLINE_SIZE,
} from "./generate";
export { SCREENS, DEFAULT_SCREEN, detectScreenForText, renderScreenSvg, captionFor, type ScreenId } from "./screens";
