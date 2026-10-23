import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafeMarkdown from "./SafeMarkdown";

const payload = `
## Requirements

- **React** and *Node.js*

<img src="x" onerror="window.__xss = true">
<script>window.__xss = true</script>
<iframe src="https://evil.example"></iframe>
<a href="javascript:window.__xss = true">click</a>
<div onmouseover="window.__xss = true">hover</div>
`;

describe("SafeMarkdown (stored XSS in job requirements)", () => {
  it("keeps the Markdown formatting", () => {
    const { container } = render(<SafeMarkdown source={payload} />);
    expect(container.querySelector("h2")?.textContent).toContain("Requirements");
    expect(container.querySelector("strong")?.textContent).toBe("React");
    expect(container.querySelector("li")).not.toBeNull();
  });

  it("removes scripts, event handlers, iframes and javascript: links", () => {
    const { container } = render(<SafeMarkdown source={payload} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("[onerror], [onmouseover], [onclick]")).toBeNull();
    for (const link of container.querySelectorAll("a")) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
    }
    expect(window.__xss).toBeUndefined();
  });
});
