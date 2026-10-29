"""Exercise the production image without exposing any host ports."""

import argparse
import json
import re
import subprocess
import time


def run(*args):
    result = subprocess.run(args, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f"{' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def verify(image, revision):
    container = run("docker", "run", "--detach", "--network", "none", image)
    try:
        for _ in range(30):
            health = run("docker", "inspect", "--format", "{{.State.Health.Status}}", container)
            if health == "healthy":
                break
            if health == "unhealthy":
                raise AssertionError("Container is unhealthy")
            time.sleep(1)
        else:
            raise AssertionError("Container did not become healthy")

        def fetch(path):
            response = subprocess.run(
                ["docker", "exec", container, "wget", "-S", "-O", "-",
                 "http://127.0.0.1:8080" + path],
                # Fonts are binary; only headers and text bodies are inspected.
                text=True, errors="replace", capture_output=True,
            )
            return response.returncode, response.stdout, response.stderr.lower()

        def fetch_raw(path):
            # BusyBox wget does not print headers of error responses, so speak HTTP directly.
            request = f"GET {path} HTTP/1.0\r\nHost: localhost\r\n\r\n"
            response = subprocess.run(
                ["docker", "exec", "-i", container, "nc", "127.0.0.1", "8080"],
                input=request, text=True, capture_output=True,
            )
            return response.stdout.split("\r\n\r\n", 1)[0].lower()

        code, body, headers = fetch("/")
        assert code == 0 and "<html" in body, "Production HTML is not served"
        heading = re.search(r"<h1[^>]*>(.*?)</h1>", body, re.S)
        text = re.sub(r"<[^>]+>", " ", heading.group(1)) if heading else ""
        assert text.split() == ["Henrik", "Kurelid"], "Landing heading is missing"
        assert "cache-control: no-cache" in headers, "HTML must revalidate"
        stylesheets = re.findall(r'href="(/_astro/[^"]+\.css)"', body)
        assert stylesheets, "Production HTML has no hashed stylesheet"
        assets = set(re.findall(r'(?:src|href)="(/_astro/[^"]+)"', body))
        for stylesheet in stylesheets:
            _, css, _ = fetch(stylesheet)
            assets.update(re.findall(r'url\((/_astro/[^)]+)\)', css))
        assert any(a.endswith(".woff2") for a in assets), "Self-hosted fonts are missing"
        for asset in sorted(assets):
            code, _, headers = fetch(asset)
            assert code == 0, f"Asset is missing: {asset}"
            assert "max-age=31536000, immutable" in headers, f"Hashed asset must be cacheable: {asset}"
        code, body, headers = fetch("/release.json")
        assert code == 0 and json.loads(body) == {"revision": revision}, "Wrong release identity"
        assert "cache-control: no-cache" in headers, "Release identity must revalidate"
        code, body, headers = fetch("/stats.json")
        stats = json.loads(body) if code == 0 else {}
        assert stats.get("publicRepos", 0) > 0 and stats.get("repos"), "Build-time stats are not served"
        assert "cache-control: no-cache" in headers, "Stats must revalidate"
        # The container has no network here, so the refresher must fail and keep the baked file.
        for _ in range(20):
            logs = subprocess.run(["docker", "logs", container], text=True, capture_output=True).stderr
            if "stats: refresh failed" in logs:
                break
            time.sleep(0.5)
        else:
            raise AssertionError("Stats refresher did not run")
        code, body, _ = fetch("/stats.json")
        assert code == 0 and json.loads(body) == stats, "Failed refresh must keep previous stats"
        code, body, _ = fetch("/healthz")
        assert code == 0 and body == "ok", "Health endpoint failed"
        for missing in ("/_astro/not-present.js", "/not-present", "/not-present.css"):
            headers = fetch_raw(missing)
            assert headers.startswith("http/1.0 404"), f"Missing path must return 404: {missing}"
            assert "cache-control: no-cache" in headers, f"404 must not be cached: {missing}"
        print("Production container smoke checks passed.")
    finally:
        subprocess.run(["docker", "rm", "--force", container], capture_output=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--revision", required=True)
    args = parser.parse_args()
    verify(args.image, args.revision)
