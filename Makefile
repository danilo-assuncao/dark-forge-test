# Light is the only theme. `make test` fails if dark-mode remnants return to
# the site files, or if styles.css stops declaring a light-only colour scheme.
SITE_FILES := $(wildcard *.html *.css *.js)
DARK_MODE_REMNANTS := theme-toggle|data-theme|prefers-color-scheme|['\"]theme['\"]
LIGHT_ONLY_DECL := color-scheme:[[:space:]]*(only[[:space:]]+)?light[[:space:]]*;

.PHONY: test check-light-only

test: check-light-only
	@echo "Run .factory/project.yaml gates"

check-light-only:
	@grep -nEi "$(DARK_MODE_REMNANTS)" $(SITE_FILES) /dev/null; status=$$?; \
	if [ $$status -eq 0 ]; then echo "FAIL: dark-mode remnants found (listed above)"; exit 1; fi; \
	if [ $$status -ne 1 ]; then echo "FAIL: could not scan the site files"; exit 1; fi; \
	if ! grep -qE "$(LIGHT_ONLY_DECL)" styles.css; then echo "FAIL: styles.css must declare a light-only color-scheme"; exit 1; fi; \
	echo "OK: no dark-mode remnants; light-only color-scheme declared"
