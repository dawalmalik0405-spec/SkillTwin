import sys
import os
sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.main import app

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

print("=" * 70)
print("TESTING REAL GITHUB REPOSITORY & COMMIT ANALYSIS IN PROJECT VERIFICATION")
print("=" * 70)

test_user = "user_github_verification@test.com"

# 1. Test invalid repository URL format
print("\n--- Test 1: Invalid URL Format Handling ---")
r_invalid = client.post("/api/verification/submit", json={
    "repo_url": "https://notgithub.com/someone/somerepo",
    "primary_skill": "Python",
    "user_id": test_user
})
print("Invalid URL Status:", r_invalid.status_code, "Detail:", r_invalid.json().get("detail"))
assert r_invalid.status_code == 400
assert "Invalid GitHub repository URL" in r_invalid.json().get("detail")
print("[PASS] Invalid URL rejected with clean 400 error.")

# 2. Test non-existent / private repository or rate limit handling
print("\n--- Test 2: Non-Existent Repository 404 or Rate Limit 429 Handling ---")
r_404 = client.post("/api/verification/submit", json={
    "repo_url": "https://github.com/octocat/non-existent-repo-super-secret-12345",
    "primary_skill": "JavaScript",
    "user_id": test_user
})
print("Non-existent Repo Status:", r_404.status_code, "Detail:", r_404.json().get("detail"))
assert r_404.status_code in (404, 429), f"Expected 404 or 429, got {r_404.status_code}"
if r_404.status_code == 404:
    assert "was not found or is private" in r_404.json().get("detail")
    print("[PASS] Non-existent/private repo rejected with clean 404 error.")
else:
    assert "rate limit" in r_404.json().get("detail", "").lower()
    print("[PASS] GitHub rate limit handled cleanly with user-friendly 429 error.")

# 3. Test Repository A: octocat/Hello-World
print("\n--- Test 3: Submitting Real Repository A (octocat/Hello-World) ---")
r_repo_a = client.post("/api/verification/submit", json={
    "repo_url": "https://github.com/octocat/Hello-World",
    "primary_skill": "C",
    "user_id": test_user
})
assert r_repo_a.status_code == 200, f"Submission A failed: {r_repo_a.text}"
data_a = r_repo_a.json()
proj_a = next(p for p in data_a["projects"] if "hello-world" in p["repo_url"].lower())

print(f"Repo A Name: {proj_a['name']}")
print(f"Repo A URL: {proj_a['repo_url']}")
print(f"Repo A Commits Count: {proj_a['commits_count']}")
print(f"Repo A Status: {proj_a['status']} ({proj_a['score_pct']}%)")
print(f"Repo A Latest Commit: '{proj_a['latest_commit_message']}' by {proj_a['latest_commit_author']} on {proj_a['latest_commit_date']}")
print(f"Repo A Recent Commits Sample ({len(proj_a.get('recent_commits', []))} stored):")
for c in proj_a.get('recent_commits', [])[:3]:
    print(f"    • [{c['sha']}] {c['message']} (by {c['author']} on {c['date']})")

assert proj_a['commits_count'] == 3, f"Expected 3 commits for octocat/Hello-World, got {proj_a['commits_count']}"
assert len(proj_a['recent_commits']) == 3
assert "Spaceghost" in proj_a['latest_commit_message'] or "Merge pull request" in proj_a['latest_commit_message']
print("[PASS] Repository A successfully analyzed with exact real commits.")

# 4. Test Repository B: pallets/flask
print("\n--- Test 4: Submitting Real Repository B (pallets/flask) ---")
r_repo_b = client.post("/api/verification/submit", json={
    "repo_url": "https://github.com/pallets/flask",
    "primary_skill": "Python",
    "user_id": test_user
})
assert r_repo_b.status_code == 200, f"Submission B failed: {r_repo_b.text}"
data_b = r_repo_b.json()
proj_b = next(p for p in data_b["projects"] if "flask" in p["repo_url"].lower())

print(f"Repo B Name: {proj_b['name']}")
print(f"Repo B URL: {proj_b['repo_url']}")
print(f"Repo B Commits Count: {proj_b['commits_count']}")
print(f"Repo B Status: {proj_b['status']} ({proj_b['score_pct']}%)")
print(f"Repo B Latest Commit: '{proj_b['latest_commit_message']}' by {proj_b['latest_commit_author']} on {proj_b['latest_commit_date']}")
print(f"Repo B Recent Commits Sample ({len(proj_b.get('recent_commits', []))} stored):")
for c in proj_b.get('recent_commits', [])[:3]:
    print(f"    • [{c['sha']}] {c['message']} (by {c['author']} on {c['date']})")

assert proj_b['commits_count'] > 5000, f"Expected >5000 commits for pallets/flask, got {proj_b['commits_count']}"
assert proj_b['commits_count'] != proj_a['commits_count'], "Commit counts MUST differ between different repositories!"
assert proj_b['latest_commit_message'] != proj_a['latest_commit_message'], "Commit messages MUST differ between different repositories!"
assert proj_b['latest_commit_author'] != proj_a['latest_commit_author'], "Authors MUST differ between different repositories!"
print("[PASS] Repository B successfully analyzed with exact real commits.")

# 5. Verification of Isolation and No Data Contamination
print("\n--- Test 5: Verifying Isolation Between Repositories ---")
repo_a_shas = {c['sha'] for c in proj_a.get('recent_commits', [])}
repo_b_shas = {c['sha'] for c in proj_b.get('recent_commits', [])}
overlap = repo_a_shas.intersection(repo_b_shas)
assert len(overlap) == 0, f"Contamination detected! Shared commit SHAs: {overlap}"
print(f"[PASS] Zero SHA overlap between Repository A and Repository B ({len(repo_a_shas)} vs {len(repo_b_shas)} SHAs).")

# 6. Resubmission Consistency Test
print("\n--- Test 6: Resubmitting Repository A for Consistency ---")
r_repo_a_repeat = client.post("/api/verification/submit", json={
    "repo_url": "https://github.com/octocat/Hello-World",
    "primary_skill": "C",
    "user_id": test_user
})
assert r_repo_a_repeat.status_code == 200
data_repeat = r_repo_a_repeat.json()
proj_a_repeat = next(p for p in data_repeat["projects"] if "hello-world" in p["repo_url"].lower())
assert proj_a_repeat['commits_count'] == proj_a['commits_count'], "Resubmitted commit count changed unexpectedly!"
assert proj_a_repeat['latest_commit_message'] == proj_a['latest_commit_message'], "Resubmitted commit message changed unexpectedly!"
print(f"[PASS] Resubmission produced identical consistent commit data: {proj_a_repeat['commits_count']} commits.")

print("\n" + "=" * 70)
print("ALL REAL GITHUB REPOSITORY & COMMIT ANALYSIS TESTS PASSED 100%!")
print("=" * 70)
