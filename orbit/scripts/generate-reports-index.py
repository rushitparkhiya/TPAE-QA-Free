#!/usr/bin/env python3
"""
Orbit — Reports Index Generator

Scans `reports/` and generates a single `reports/index.html` linking every
report the gauntlet produced in a single, navigable dashboard.

Usage:
  python3 scripts/generate-reports-index.py [--title "Orbit QA — Plugin Name"]
"""

from __future__ import annotations

import argparse
import datetime
import html
import json
import os
import re
import sys
from pathlib import Path


def scan_reports(root: Path) -> dict:
    """Catalog all report files under reports/ by category."""
    cats = {
        "gauntlet": [],
        "skill_audits": [],
        "playwright": [],
        "lighthouse": [],
        "screenshots": [],
        "videos": [],
        "uat": [],
        "db": [],
        "competitor": [],
        "other": [],
    }

    if not root.exists():
        return cats

    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(root)
        rel_str = str(rel)
        size = p.stat().st_size
        mtime = datetime.datetime.fromtimestamp(p.stat().st_mtime)

        entry = {"path": rel_str, "name": p.name, "size": size, "mtime": mtime.isoformat()}

        if p.name == "index.html":
            continue
        if rel_str.startswith("skill-audits/"):
            cats["skill_audits"].append(entry)
        elif rel_str.startswith("playwright-html/"):
            if p.name == "index.html":
                cats["playwright"].append(entry)
        elif rel_str.startswith("lighthouse/"):
            cats["lighthouse"].append(entry)
        elif rel_str.startswith("screenshots/"):
            cats["screenshots"].append(entry)
        elif rel_str.startswith("videos/"):
            cats["videos"].append(entry)
        elif "uat" in p.name.lower():
            cats["uat"].append(entry)
        elif "db-profile" in p.name.lower():
            cats["db"].append(entry)
        elif "competitor" in p.name.lower():
            cats["competitor"].append(entry)
        elif p.name.startswith("qa-report-") and p.suffix == ".md":
            cats["gauntlet"].append(entry)
        else:
            cats["other"].append(entry)

    return cats


def count_severity(reports_dir: Path) -> dict:
    """Sum Critical/High/Medium/Low occurrences across all skill audit .md files."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    audits = reports_dir / "skill-audits"
    if not audits.exists():
        return counts
    for md in audits.glob("*.md"):
        text = md.read_text(errors="replace")
        for sev in counts:
            counts[sev] += len(re.findall(rf"\b{sev}\b", text, re.IGNORECASE))
    return counts


def human_size(n: int) -> str:
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{u}"
        n /= 1024
    return f"{n:.1f}TB"


def section(title: str, icon: str, entries: list) -> str:
    if not entries:
        return ""
    rows = "\n".join(
        f'<tr><td><a href="{html.escape(e["path"])}">{html.escape(e["name"])}</a></td>'
        f'<td class="num">{human_size(e["size"])}</td>'
        f'<td class="num">{e["mtime"][:16].replace("T"," ")}</td></tr>'
        for e in entries
    )
    return f"""
<section>
  <h2>{icon} {title} <span class="count">({len(entries)})</span></h2>
  <table>
    <thead><tr><th>File</th><th>Size</th><th>Modified</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</section>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="Orbit QA Reports")
    ap.add_argument("--reports-dir", default="reports")
    ap.add_argument("--out", default="reports/index.html")
    args = ap.parse_args()

    reports_dir = Path(args.reports_dir).resolve()
    if not reports_dir.exists():
        reports_dir.mkdir(parents=True, exist_ok=True)

    cats = scan_reports(reports_dir)
    sev = count_severity(reports_dir)

    total_files = sum(len(v) for v in cats.values())
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    title_esc = html.escape(args.title)

    sev_bar = "".join(
        f'<span class="sev sev-{s}">{sev[s]} {s.title()}</span>'
        for s in ("critical", "high", "medium", "low")
    )

    sections = (
        section("Gauntlet markdown reports", "📋", cats["gauntlet"])
        + section("AI Skill Audits (HTML)", "🤖",
                  [{"path": "skill-audits/index.html", "name": "index.html",
                    "size": (reports_dir / "skill-audits" / "index.html").stat().st_size
                            if (reports_dir / "skill-audits" / "index.html").exists() else 0,
                    "mtime": datetime.datetime.now().isoformat()}]
                  if (reports_dir / "skill-audits" / "index.html").exists() else [])
        + section("Skill audit markdown", "📝", cats["skill_audits"])
        + section("Playwright", "🎭",
                  [{"path": "playwright-html/index.html", "name": "index.html",
                    "size": (reports_dir / "playwright-html" / "index.html").stat().st_size
                            if (reports_dir / "playwright-html" / "index.html").exists() else 0,
                    "mtime": datetime.datetime.now().isoformat()}]
                  if (reports_dir / "playwright-html" / "index.html").exists() else [])
        + section("UAT / PM reports", "👔", cats["uat"])
        + section("Lighthouse", "💡", cats["lighthouse"])
        + section("Database profiling", "🗄️", cats["db"])
        + section("Competitor comparison", "⚖️", cats["competitor"])
        + section("Screenshots", "🖼️", cats["screenshots"][:50])  # limit huge lists
        + section("Videos", "🎬", cats["videos"])
        + section("Other", "📄", cats["other"])
    )

    html_out = f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title_esc}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6;padding:0}}
  header{{background:#1e293b;padding:24px 32px;border-bottom:1px solid #334155}}
  header h1{{font-size:1.5rem;color:#f8fafc}}
  header p{{color:#94a3b8;font-size:.9rem;margin-top:4px}}
  .sev-bar{{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}}
  .sev{{padding:3px 10px;border-radius:999px;font-size:.75rem;font-weight:600;color:#fff}}
  .sev-critical{{background:#ef4444}} .sev-high{{background:#f97316}}
  .sev-medium{{background:#eab308}} .sev-low{{background:#22c55e}}
  main{{max-width:1200px;margin:0 auto;padding:32px}}
  section{{margin-bottom:32px;background:#1e293b;border-radius:8px;overflow:hidden}}
  h2{{font-size:1.15rem;padding:16px 20px;background:#1a2744;border-bottom:1px solid #334155;color:#f8fafc}}
  .count{{color:#94a3b8;font-weight:400;font-size:.85rem}}
  table{{width:100%;border-collapse:collapse}}
  td,th{{padding:10px 20px;text-align:left;border-bottom:1px solid #253352;font-size:.88rem}}
  th{{color:#94a3b8;font-weight:500;background:#1a2744}}
  td a{{color:#7dd3fc;text-decoration:none}}
  td a:hover{{color:#38bdf8;text-decoration:underline}}
  .num{{color:#94a3b8;white-space:nowrap}}
  footer{{text-align:center;padding:24px;color:#475569;font-size:.8rem;border-top:1px solid #1e293b;margin-top:40px}}
</style></head><body>
<header>
  <h1>{title_esc}</h1>
  <p>{total_files} reports · Generated {ts}</p>
  <div class="sev-bar">{sev_bar}</div>
</header>
<main>{sections}</main>
<footer>Orbit — WordPress Plugin QA Framework</footer>
</body></html>"""

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_out)
    print(f"Reports index: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
