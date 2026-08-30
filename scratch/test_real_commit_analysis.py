import sys
import os
sys.path.insert(0, os.path.abspath("."))

from backend.shared.models import ProjectVerificationItem, VerifiedSkillItem
import httpx
import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

def extract_github_owner_repo(repo_url: str) -> Optional[Tuple[str, str]]:
    cleaned = repo_url.strip().rstrip('/')
    if not cleaned.startswith(('http://', 'https://')):
        cleaned = 'https://' + cleaned
    m = re.search(r'github\.com/([^/]+)/([^/]+)', cleaned, re.IGNORECASE)
    if m:
        owner = m.group(1).strip()
        repo = m.group(2).strip().removesuffix('.git')
        return owner, repo
    return None

def test_analyze(repo_url: str, primary_skill: str):
    owner_repo = extract_github_owner_repo(repo_url)
    assert owner_repo is not None
    owner, repo_name = owner_repo

    headers = {
        "User-Agent": "SkillTwin-Verification-Engine/1.0",
        "Accept": "application/vnd.github.v3+json"
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"

    repo_api_url = f"https://api.github.com/repos/{owner}/{repo_name}"

    with httpx.Client(timeout=10.0) as client:
        res = client.get(repo_api_url, headers=headers)
        assert res.status_code == 200, f"Status: {res.status_code}"
        repo_data = res.json()

        # Commits
        commits_res = client.get(f"{repo_api_url}/commits?per_page=100", headers=headers)
        assert commits_res.status_code == 200
        commits_json = commits_res.json()

        link_header = commits_res.headers.get("link", "")
        match = re.search(r'page=(\d+)[^>]*>;\s*rel=["\']last["\']', link_header)
        if match:
            last_page = int(match.group(1))
            last_page_res = client.get(f"{repo_api_url}/commits?per_page=100&page={last_page}", headers=headers)
            if last_page_res.status_code == 200 and isinstance(last_page_res.json(), list):
                total_commits = (last_page - 1) * 100 + len(last_page_res.json())
            else:
                total_commits = last_page * 100
        else:
            total_commits = len(commits_json)

        parsed_commits = []
        for c in commits_json[:15]:
            c_info = c.get("commit", {}) or {}
            c_author = c_info.get("author", {}) or {}
            parsed_commits.append({
                "sha": c.get("sha", "")[:7],
                "message": (c_info.get("message") or "Commit").split("\n")[0][:120],
                "author": c_author.get("name") or (c.get("author") or {}).get("login") or "Contributor",
                "date": c_author.get("date") or "",
                "url": c.get("html_url") or ""
            })

        print(f"[{owner}/{repo_name}] Real commits count: {total_commits}")
        print(f"  First commit: {parsed_commits[0]}")
        print(f"  Last listed commit: {parsed_commits[-1]}")

if __name__ == "__main__":
    test_analyze("https://github.com/octocat/Hello-World", "C")
    test_analyze("https://github.com/pallets/flask", "Python")
