#!/usr/bin/env python3
"""
Orbit — UAT HTML Report Generator (Deep PM Edition)

NAMING CONVENTION (enforced — do not deviate):
  Screenshots : reports/screenshots/flows-compare/pair-NN-{slug}-{a|b}[-extra].png
  Videos      : reports/videos/pair-NN-{slug}-{a|b}.webm

  NN   = zero-padded pair number (01, 02 … 99)
  slug = short topic name, lowercase, hyphens (dashboard, social, sitemaps …)
  a    = plugin under test (left column)
  b    = competitor / comparison plugin (right column)

WHY: pairing by slug prevents the index-mismatch bug where RM-3 (Titles)
     gets shown next to NXT-3 (Social) just because they share index 3.
     The slug is the contract between the spec and the report.

Usage:
  python3 scripts/generate-uat-report.py \\
    --title  "Plugin A vs Plugin B — v2.1" \\
    --label-a "Plugin A" --label-b "Plugin B" \\
    --snaps  reports/screenshots/flows-compare \\
    --videos reports/videos \\
    --out    reports/uat-report.html
"""
import argparse, base64, json, os, re
from datetime import datetime

parser = argparse.ArgumentParser()
parser.add_argument("--title",     default="UAT Flow Report")
parser.add_argument("--out",       default="reports/uat-report.html")
parser.add_argument("--snaps",     default="reports/screenshots/flows-compare")
parser.add_argument("--videos",    default="reports/videos")
parser.add_argument("--label-a",   default="",  dest="label_a",
                    help="Display name for plugin A (auto-detected from filenames if omitted)")
parser.add_argument("--label-b",   default="",  dest="label_b",
                    help="Display name for plugin B")
parser.add_argument("--flow-data", default="",  dest="flow_data",
                    help="Path to a JSON file containing FLOW_DATA, RICE, and FEATURES. "
                         "When omitted the report shows only screenshots/videos with no PM analysis.")
args = parser.parse_args()
SNAP = args.snaps; VDIR = args.videos; OUT = args.out; TITLE = args.title

# ── Load external PM data or fall back to empty defaults ─────────────────────
_fd = {}
if args.flow_data and os.path.exists(args.flow_data):
    with open(args.flow_data) as _f:
        _fd = json.load(_f)
    # Convert string keys (JSON) back to int keys for FLOW_DATA
    _fd["FLOW_DATA"] = {int(k): v for k, v in _fd.get("FLOW_DATA", {}).items()}

# ── Media helpers ─────────────────────────────────────────────────────────────
def b64(path, mime):
    if not os.path.exists(path): return ""
    with open(path, "rb") as f: return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"
def b64img(n): return b64(os.path.join(SNAP, n), "image/png")
def b64vid(n): return b64(os.path.join(VDIR, n), "video/webm")
def img(n, cap=""):
    src = b64img(n)
    if not src: return f'<div class="no-media">Screenshot missing:<br><code>{n}</code></div>'
    return f'<figure><img src="{src}" loading="lazy" onclick="zoom(this)" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
def vid(n, cap=""):
    src = b64vid(n)
    if not src: return f'<div class="no-media">Video missing:<br><code>{n}</code></div>'
    return f'<figure class="vf"><video controls preload="metadata" playsinline><source src="{src}" type="video/webm"></video><figcaption>▶ {cap}</figcaption></figure>'
def pair_block(L, R, la="A", lb="B"):
    return (f'<div class="pair">'
            f'<div class="side sa"><span class="sl">{la}</span>{L}</div>'
            f'<div class="side sb"><span class="sl">{lb}</span>{R}</div>'
            f'</div>')

# ── Discover media by pair-NN-slug-a/b convention ─────────────────────────────
# Returns: { pair_num(int): { 'slug': str, 'a': [filenames], 'b': [filenames] } }
def scan_pairs(directory, ext):
    pairs = {}
    if not os.path.isdir(directory):
        return pairs
    pat = re.compile(r'^pair-(\d{2,})-(.+?)-(a|b)(?:-[\w-]+)?\.' + re.escape(ext.lstrip('.')) + '$')
    for f in sorted(os.listdir(directory)):
        m = pat.match(f)
        if not m: continue
        num  = int(m.group(1))
        slug = m.group(2)
        side = m.group(3)
        if num not in pairs:
            pairs[num] = {'slug': slug, 'a': [], 'b': []}
        pairs[num][side].append(f)
    return dict(sorted(pairs.items()))

img_pairs = scan_pairs(SNAP, '.png')
vid_pairs = scan_pairs(VDIR, '.webm')
nums = sorted(set(list(img_pairs) + list(vid_pairs)))

# Auto-detect labels from filenames if not provided via args
la = args.label_a or "Plugin A"
lb = args.label_b or "Plugin B"

tot_i = sum(len(v['a']) + len(v['b']) for v in img_pairs.values())
tot_v = sum(len(v['a']) + len(v['b']) for v in vid_pairs.values())
tot_f = len(nums)
now   = datetime.now().strftime("%Y-%m-%d %H:%M")

# ── RICE Data — loaded from --flow-data JSON or empty ─────────────────────────
RICE = _fd.get("RICE", [])

# ── Per-flow deep PM analysis — loaded from --flow-data JSON or empty ──────────
FLOW_DATA = _fd.get("FLOW_DATA", {})

# ── IA Recommendations + Feature table — loaded from --flow-data JSON or empty ──
IA_RECS  = _fd.get("IA_RECS", "")
FEATURES = _fd.get("FEATURES", [])
a_wins = sum(1 for r in FEATURES if r[3] in ("a", "a*", "none")) if FEATURES else 0
b_wins = sum(1 for r in FEATURES if r[3] == "b") if FEATURES else 0

# ── HTML builders ──────────────────────────────────────────────────────────────
def rice_row(f):
    type_map = {"qw": ("rb-qw","Quick Win"), "bb": ("rb-bb","Big Bet"), "fi": ("rb-fi","Fill-In")}
    tc, tl = type_map.get(f["t"], ("rb-fi","—"))
    q_cls  = "q1" if f["q"] == 1 else "q2"
    return (f'<tr><td class="rn">{f["r"]}</td>'
            f'<td class="fn">{f["n"]}<div class="rn-note">{f["note"]}</div></td>'
            f'<td class="rs">{f["s"]:,}</td>'
            f'<td class="mu">{f["reach"]:,}</td>'
            f'<td class="imp imp-{f["imp"].lower()}">{f["imp"]}</td>'
            f'<td class="mu">{f["eff"]}</td>'
            f'<td><span class="rb {tc}">{tl}</span></td>'
            f'<td><span class="qb {q_cls}">Q{f["q"]}</span></td></tr>')

RICE_TABLE = ("<table class='rice-tbl'><thead><tr>"
              "<th>#</th><th>Feature / Fix</th><th>RICE</th><th>Reach</th>"
              "<th>Impact</th><th>Effort</th><th>Type</th><th>Quarter</th>"
              "</tr></thead><tbody>"
              + "".join(rice_row(f) for f in RICE)
              + "</tbody></table>")

def feat_row(feat, av, bv, w):
    ac = "win" if w in ("a", "a*") else "lose" if w == "b" else ""
    bc = "win" if w == "b"          else "lose" if w in ("a","a*") else ""
    star = '<sup title="settings exist but not active on fresh install">*</sup>' if w == "a*" else ""
    return f'<tr><td class="ff">{feat}</td><td class="{ac}">{av}{star}</td><td class="{bc}">{bv}</td></tr>'

FEAT_TABLE = (f"<table class='ft'><thead><tr><th>Feature</th>"
              f"<th class='col-a'>{la}</th><th class='col-b'>{lb}</th></tr></thead><tbody>"
              + "".join(feat_row(*r) for r in FEATURES)
              + "</tbody></table>")

# ── Per-flow section builder ───────────────────────────────────────────────────
def flow_sec(idx):
    ip  = img_pairs.get(idx, {'slug': '', 'a': [], 'b': []})
    vp  = vid_pairs.get(idx, {'slug': '', 'a': [], 'b': []})
    ais = ip['a']; bis = ip['b']
    avs = vp['a']; bvs = vp['b']

    d       = FLOW_DATA.get(idx, {})
    slug    = d.get("slug", ip.get('slug', f"flow-{idx}"))
    title   = d.get("title", slug.replace("-", " ").title())
    verdict = d.get("verdict", "")

    body = f'<div class="flow-meta"><span class="verdict">{verdict}</span><code class="slug-badge">pair-{idx:02d}-{slug}</code></div>'

    # Screenshots paired correctly by side (a vs b), not by index
    for i in range(max(len(ais), len(bis))):
        af = ais[i] if i < len(ais) else None
        bf = bis[i] if i < len(bis) else None
        L  = img(af, (af or "").replace(".png","").replace("-"," ").title()) if af else '<div class="no-media">—</div>'
        R  = img(bf, (bf or "").replace(".png","").replace("-"," ").title()) if bf else '<div class="no-media">—</div>'
        body += pair_block(L, R, la, lb)

    # Summary bar
    a_sum = d.get("a_summary", ""); b_sum = d.get("b_summary", "")
    if a_sum or b_sum:
        body += (f'<div class="summary-bar">'
                 f'<div class="sb-side sa"><span class="sl">{la}</span><p>{a_sum}</p></div>'
                 f'<div class="sb-side sb"><span class="sl">{lb}</span><p>{b_sum}</p></div>'
                 f'</div>')

    # Videos paired by side
    avid = avs[0] if avs else None
    bvid = bvs[0] if bvs else None
    L = vid(avid, f"{la} — {title}") if avid else '<div class="no-media">No video — run: npm run uat</div>'
    R = vid(bvid, f"{lb} — {title}") if bvid else '<div class="no-media">No video — run: npm run uat</div>'
    body += pair_block(L, R, la, lb)

    # Deep PM analysis
    if d.get("pm_analysis"):
        body += f'<div class="pm-analysis"><div class="pma-h">PM Analysis</div>{d["pm_analysis"]}</div>'

    # Wins / Gaps / Actions
    wins = d.get("wins", []); gaps = d.get("gaps", []); actions = d.get("actions", [])
    if wins or gaps or actions:
        body += '<div class="wga">'
        if wins:    body += f'<div class="wga-col"><div class="wga-h win-h">✓ Wins</div><ul>'    + "".join(f"<li>{w}</li>" for w in wins)    + "</ul></div>"
        if gaps:    body += f'<div class="wga-col"><div class="wga-h gap-h">✗ Gaps</div><ul>'    + "".join(f"<li>{g}</li>" for g in gaps)    + "</ul></div>"
        if actions: body += f'<div class="wga-col"><div class="wga-h act-h">→ Actions</div><ul>' + "".join(f"<li>{a}</li>" for a in actions) + "</ul></div>"
        body += '</div>'

    return f'<div class="sec" id="flow{idx}"><div class="sh"><span class="snum">Pair {idx}</span><h2>{title}</h2></div>{body}</div>'

flow_secs = "".join(flow_sec(n) for n in nums)

# ── Nav ────────────────────────────────────────────────────────────────────────
nav = '<a href="#pm">RICE</a><a href="#ia">IA Fix</a><a href="#compare">Features</a>'
for n in nums:
    d = FLOW_DATA.get(n, {})
    icon = d.get("verdict", "")[:2] if d.get("verdict") else ""
    nav += f'<a href="#flow{n}">{icon} {d.get("title", f"Flow {n}")[:22]}</a>'

# ── CSS ────────────────────────────────────────────────────────────────────────
CSS = """
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#21262d;--bd:#30363d;--t:#e6edf3;--mu:#8b949e;
--g:#3fb950;--r:#f85149;--y:#d29922;--b:#58a6ff;--ca:#9b70e0;--cb:#f07050;--or:#e36209}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--t);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;font-size:14px}
a{color:var(--b)} sup{font-size:10px;color:var(--y);cursor:help}
p+p{margin-top:10px} strong{color:var(--t)}
.hdr{background:linear-gradient(135deg,#1a1f35,#0d1117);border-bottom:1px solid var(--bd);padding:28px 44px}
.hdr h1{font-size:24px;font-weight:700;margin-bottom:6px}
.sub-txt{color:var(--mu);font-size:12px;margin-bottom:12px}
.badges{display:flex;gap:8px;flex-wrap:wrap}
.badge{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
.ba{background:rgba(155,112,224,.15);color:var(--ca);border:1px solid var(--ca)}
.bb{background:rgba(240,112,80,.15);color:var(--cb);border:1px solid var(--cb)}
.bi{background:rgba(88,166,255,.1);color:var(--b);border:1px solid rgba(88,166,255,.3)}
.bp{background:rgba(63,185,80,.1);color:var(--g);border:1px solid rgba(63,185,80,.3)}
nav{background:var(--bg2);border-bottom:1px solid var(--bd);padding:0 44px;display:flex;overflow-x:auto;position:sticky;top:0;z-index:100}
nav a{padding:10px 12px;font-size:12px;color:var(--mu);text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;transition:.15s}
nav a:hover,nav a.act{color:var(--t);border-bottom-color:var(--b)}
.wrap{max-width:1420px;margin:0 auto;padding:32px 44px}
.sec{margin-bottom:60px;scroll-margin-top:52px}
.sh{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--bd)}
.snum{background:rgba(88,166,255,.1);color:var(--b);font-size:11px;font-weight:700;padding:3px 9px;border-radius:4px;flex-shrink:0}
.sh h2{font-size:18px;font-weight:700}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px}
.stat{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:14px 16px}
.sv{font-size:22px;font-weight:700;color:var(--b)}.sk{font-size:12px;color:var(--mu);margin-top:2px}
.rice-tbl{width:100%;border-collapse:collapse;background:var(--bg2);border-radius:10px;overflow:hidden;margin-bottom:8px}
.rice-tbl th{background:var(--bg3);padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mu)}
.rice-tbl td{padding:9px 12px;border-bottom:1px solid var(--bg3);font-size:13px;vertical-align:top}
.rice-tbl tr:last-child td{border-bottom:none}
.rice-tbl tr:hover td{background:rgba(88,166,255,.04)}
.rn{color:var(--mu);font-size:11px;width:24px;vertical-align:middle}.fn{font-weight:500;max-width:320px}
.rn-note{font-size:11px;color:var(--mu);margin-top:3px;font-weight:400;line-height:1.5}
.rs{font-weight:700;color:var(--b);font-size:14px;vertical-align:middle}.mu{color:var(--mu);vertical-align:middle}
.imp-massive{color:#f0a050;font-weight:700}.imp-high{color:var(--r);font-weight:700}.imp-med{color:var(--y);font-weight:600}.imp-low{color:var(--mu)}
.rb{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap}
.rb-qw{background:rgba(63,185,80,.15);color:var(--g)}.rb-bb{background:rgba(248,81,73,.12);color:var(--r)}.rb-fi{background:rgba(88,166,255,.1);color:var(--b)}
.qb{font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700}
.q1{background:rgba(155,112,224,.15);color:var(--ca)}.q2{background:rgba(240,112,80,.15);color:var(--cb)}
.ft{width:100%;border-collapse:collapse;background:var(--bg2);border-radius:10px;overflow:hidden}
.ft th{background:var(--bg3);padding:9px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mu)}
.col-a{color:var(--ca)!important}.col-b{color:var(--cb)!important}
.ft td{padding:9px 14px;border-bottom:1px solid var(--bg3);font-size:13px;vertical-align:top}
.ft tr:last-child td{border-bottom:none}.ff{font-weight:500}
.ft td.win{color:var(--g);font-weight:600}.ft td.lose{color:var(--mu)}
.flow-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.verdict{font-size:13px;font-weight:600;padding:4px 12px;border-radius:6px;background:var(--bg2);border:1px solid var(--bd)}
.slug-badge{font-size:10px;color:var(--mu);background:var(--bg3);padding:2px 8px;border-radius:4px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.side{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px}
.sa{border-top:2px solid var(--ca)}.sb{border-top:2px solid var(--cb)}
.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 7px;border-radius:3px;display:inline-block;margin-bottom:2px}
.sa .sl{background:rgba(155,112,224,.15);color:var(--ca)}.sb .sl{background:rgba(240,112,80,.15);color:var(--cb)}
figure{margin:0}
figure img{width:100%;border-radius:6px;border:1px solid var(--bd);cursor:zoom-in;display:block}
figure img:hover{opacity:.88}
figcaption{font-size:11px;color:var(--mu);margin-top:3px}
.vf video{width:100%;border-radius:6px;border:1px solid var(--bd);background:#000}
.no-media{padding:20px;text-align:center;color:var(--mu);font-size:12px;background:var(--bg3);border-radius:6px}
.summary-bar{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
.sb-side{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:12px 14px}
.sb-side.sa{border-top:2px solid var(--ca)}.sb-side.sb{border-top:2px solid var(--cb)}
.sb-side p{font-size:13px;color:var(--mu);margin-top:6px;line-height:1.6}
.pm-analysis{background:var(--bg2);border:1px solid var(--bd);border-left:3px solid var(--b);border-radius:8px;padding:20px 24px;margin:14px 0}
.pma-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--b);margin-bottom:12px}
.pm-analysis p{font-size:13px;color:var(--mu);line-height:1.75}
.pm-analysis strong{color:var(--t)}
.wga{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.wga-col{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:14px 16px}
.wga-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.win-h{color:var(--g)}.gap-h{color:var(--r)}.act-h{color:var(--b)}
.wga-col ul{padding-left:16px}.wga-col li{font-size:12px;color:var(--mu);margin-bottom:4px;line-height:1.5}
.ia-wrap{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:20px 24px;margin-bottom:24px}
.ia-h{font-size:13px;font-weight:700;margin-bottom:12px;color:var(--t)}
.ia-tree{font-family:'SF Mono',Consolas,monospace;font-size:12px;line-height:2}
.ia-node{color:var(--mu)}.ia-top{color:var(--t);font-weight:700}
.ia-l1{padding-left:8px}.ia-l2{padding-left:24px}.ia-l3{padding-left:40px}
.ia-bad{color:var(--r);font-weight:600}.ia-good{color:var(--g);font-weight:600}
.ia-new{color:var(--t)}.ia-tag{background:rgba(88,166,255,.12);color:var(--b);font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;font-family:inherit}
.lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:999;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
.lb.on{display:flex}
.lb img{max-width:92vw;max-height:92vh;border-radius:8px;object-fit:contain}
.footer{padding:20px 0;border-top:1px solid var(--bd);color:var(--mu);font-size:12px;text-align:center;margin-top:24px}
@media(max-width:900px){.pair,.stats,.wga,.summary-bar{grid-template-columns:1fr}.wrap,.hdr{padding:18px}nav{padding:0 18px}}
"""

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title><style>{CSS}</style>
</head>
<body>
<div class="lb" id="lb" onclick="this.classList.remove('on')"><img id="lbimg" src="" alt=""></div>

<div class="hdr">
  <h1>{TITLE}</h1>
  <div class="sub-txt">Generated: {now} &nbsp;·&nbsp; Playwright UAT + RICE Prioritization + Deep PM Analysis</div>
  <div class="badges">
    <span class="badge ba">{la}</span>
    <span class="badge bb">{lb}</span>
    <span class="badge bi">{tot_f} Flows · RICE Backlog · IA Audit · Feature Matrix</span>
    <span class="badge bp">Orbit</span>
  </div>
</div>

<nav id="nav">{nav}</nav>

<div class="wrap">

<div class="sec" id="overview">
  <div class="sh"><span class="snum">Overview</span><h2>Test Run Summary</h2></div>
  <div class="stats">
    <div class="stat"><div class="sv">{tot_f}</div><div class="sk">Flows Compared</div></div>
    <div class="stat"><div class="sv">{tot_i}</div><div class="sk">Screenshots</div></div>
    <div class="stat"><div class="sv">{tot_v}</div><div class="sk">Videos</div></div>
    <div class="stat"><div class="sv">#1 Priority</div><div class="sk">Fix LLMs.txt 404 (RICE 54,000)</div></div>
  </div>
</div>

<div class="sec" id="pm">
  <div class="sh"><span class="snum">RICE Backlog</span><h2>Priority Roadmap — from UAT Findings</h2></div>
  <p style="font-size:12px;color:var(--mu);margin-bottom:14px">Scored using RICE framework on Playwright + PM analysis data. Quick Win = high value, XS/S effort. Big Bet = high value, M/L effort. Q1 = ship now.</p>
  {RICE_TABLE}
  <p style="font-size:12px;color:var(--mu);margin-top:8px">Top 5 items (ranks 1–5) are all XS effort — combinable into a single sprint with massive impact on discoverability and activation.</p>
</div>

<div class="sec" id="ia">
  <div class="sh"><span class="snum">IA Audit</span><h2>Navigation Architecture — What Needs to Change</h2></div>
  <p style="font-size:13px;color:var(--mu);margin-bottom:16px;line-height:1.7">The single biggest problem is not missing features — it is <strong style="color:var(--t)">navigation architecture</strong>. "Advanced" contains 8 unrelated features. Redirections and LLMs.txt are buried 3–5 clicks deep. A user who needs to add a redirect will search the WordPress admin sidebar, find nothing, and install a competing plugin. Two of the top-5 RICE items are pure navigation changes requiring zero new features.</p>
  {IA_RECS}
</div>

<div class="sec" id="compare">
  <div class="sh"><span class="snum">Feature Matrix</span><h2>Full Comparison — All Tested Features</h2></div>
  {FEAT_TABLE}
  <p style="font-size:12px;color:var(--mu);margin-top:8px">* = settings page exists but feature not active on fresh install (needs rewrite rules)</p>
</div>

{flow_secs}

<div class="footer">Orbit UAT · PM Edition &nbsp;·&nbsp; {now} &nbsp;·&nbsp; {tot_i} screenshots · {tot_v} videos · {tot_f} flows</div>
</div>

<script>
function zoom(i){{document.getElementById('lbimg').src=i.src;document.getElementById('lb').classList.add('on')}}
document.addEventListener('keydown',e=>{{if(e.key==='Escape')document.getElementById('lb').classList.remove('on')}});
document.querySelectorAll('.sec').forEach(s=>new IntersectionObserver(es=>{{
  es.forEach(e=>{{if(e.isIntersecting){{
    document.querySelectorAll('nav a').forEach(l=>l.classList.remove('act'));
    const a=document.querySelector('nav a[href="#'+e.target.id+'"]');
    if(a)a.classList.add('act');
  }}}});
}},{{threshold:0.2}}).observe(s));
</script>
</body></html>"""

os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w") as f: f.write(HTML)
size = os.path.getsize(OUT) / 1024 / 1024
print(f"Report: {OUT} ({size:.1f}MB) — {tot_i} screenshots, {tot_v} videos, {tot_f} flows")
