import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";

/**
 * Renders user-written Markdown (job requirements). The preview of
 * @uiw/react-md-editor keeps raw HTML (rehype-raw), so the HTML is sanitised
 * with rehype-sanitize (GitHub schema): no <script>, no on* handlers,
 * no javascript: URLs, no iframes. Prevents stored XSS.
 */
export const sanitizePlugins = [[rehypeSanitize]];

const SafeMarkdown = ({ source, className }) => (
  <MDEditor.Markdown source={source} className={className} rehypePlugins={sanitizePlugins} />
);

export default SafeMarkdown;
