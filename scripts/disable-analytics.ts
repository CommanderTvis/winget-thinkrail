export function disableReleaseAnalytics(action: string): string {
  const input = `  posthog-project-key:
    description: "Public PostHog project key baked into release analytics; never committed"
    required: true`;
  const validation = `        case "$POSTHOG_PROJECT_KEY" in
          phc_?*) ;;
          *) echo "::error::posthog-project-key must be a phc_ project key"; exit 1 ;;
        esac`;
  const stamp = `export const posthogProjectKey = "\${POSTHOG_PROJECT_KEY}";`;
  const optionalInput = `  posthog-project-key:
    description: "Public PostHog project key; omit to disable release analytics"
    required: false
    default: ""`;
  const optionalValidation = `        case "$POSTHOG_PROJECT_KEY" in
          ""|phc_?*) ;;
          *) echo "::error::posthog-project-key must be empty or a phc_ project key"; exit 1 ;;
        esac`;
  const optional = action.includes(optionalInput);
  const expectedInput = optional ? optionalInput : input;
  const expectedValidation = optional ? optionalValidation : validation;
  for (const expected of [expectedInput, expectedValidation, stamp]) {
    if (action.split(expected).length !== 2) {
      throw new Error(
        "Upstream release analytics contract changed; review before building",
      );
    }
  }
  return action
    .replace(
      expectedInput,
      expectedInput.replace("required: true", "required: false"),
    )
    .replace(
      expectedValidation,
      "        # This fork distribution ships without analytics.",
    )
    .replace(stamp, 'export const posthogProjectKey = "";');
}

if (import.meta.main) {
  const path = ".github/actions/build-binary/action.yml";
  const action = (await Bun.file(path).text()).replaceAll("\r\n", "\n");
  await Bun.write(path, disableReleaseAnalytics(action));
}
