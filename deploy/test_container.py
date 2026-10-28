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
                text=True, capture_output=True,
            )
            return response.returncode, response.stdout, response.stderr.lower()

        code, body, headers = fetch("/")
        assert code == 0 and "<html" in body, "Production HTML is not served"
        assert "<h1>rmstdope.eu</h1>" in body, "Landing heading is missing"
        assert "cache-control: no-cache" in headers, "HTML must revalidate"
        # Astro inlines small stylesheets, so hashed assets are optional.
        for asset in re.findall(r'(?:src|href)="(/_astro/[^"]+)"', body):
            code, _, headers = fetch(asset)
            assert code == 0, f"Asset is missing: {asset}"
            assert "max-age=31536000, immutable" in headers, "Hashed assets must be cacheable"
        code, body, headers = fetch("/release.json")
        assert code == 0 and json.loads(body) == {"revision": revision}, "Wrong release identity"
        assert "cache-control: no-cache" in headers, "Release identity must revalidate"
        code, body, _ = fetch("/healthz")
        assert code == 0 and body == "ok", "Health endpoint failed"
        for missing in ("/_astro/not-present.js", "/not-present", "/not-present.css"):
            code, _, headers = fetch(missing)
            assert code != 0 and "404" in headers, f"Missing path must return 404: {missing}"
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
