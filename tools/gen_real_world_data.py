#!/usr/bin/env python3
"""
Generate realWorldData.ts from a Gallagher Command Centre bundle.js export.

Usage:
    python tools/gen_real_world_data.py
        --input  C:/Users/JCullum/Downloads/bundle.js
        --output abac-soc-demo-v2/src/data/realWorldData.ts
"""

import argparse
import json
import re
import sys

# ---------------------------------------------------------------------------
# Static definitions
# ---------------------------------------------------------------------------

CLEARANCE_MAP = {"Standard": "Unclassified", "High": "Confidential", "Critical": "Secret"}

SCHEDULES_STATIC = [
    {"id": "sched-always",  "name": "Always",          "type": "always"},
    {"id": "sched-bh",      "name": "Business Hours",  "type": "weekly",
     "days": ["Mon","Tue","Wed","Thu","Fri"], "start": "08:00", "end": "18:00"},
    {"id": "sched-ah",      "name": "After Hours",     "type": "weekly",
     "days": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "start": "17:30", "end": "08:00"},
    {"id": "sched-wknd",    "name": "Weekend",         "type": "weekly",
     "days": ["Sat","Sun"], "start": "00:00", "end": "23:59"},
]

DYNAMIC_GROUPS = [
    {
        "id": "grp-dyn-security", "name": "All Security Personnel",
        "type": "access_level", "membershipType": "dynamic",
        "members": [],
        "rules": [{"field": "department", "op": "contains", "value": "Security"}],
        "description": "All users in Security departments",
    },
    {
        "id": "grp-dyn-it", "name": "All IT Staff",
        "type": "access_level", "membershipType": "dynamic",
        "members": [],
        "rules": [{"field": "department", "op": "contains", "value": "IT"}],
        "description": "All users in IT departments",
    },
    {
        "id": "grp-dyn-clearance-confidential", "name": "Clearance: Confidential+",
        "type": "access_level", "membershipType": "dynamic",
        "members": [],
        "rules": [{"field": "clearanceLevel", "op": "gte", "value": "Confidential"}],
        "description": "All users with Confidential or higher clearance",
    },
    {
        "id": "grp-dyn-clearance-secret", "name": "Clearance: Secret+",
        "type": "access_level", "membershipType": "dynamic",
        "members": [],
        "rules": [{"field": "clearanceLevel", "op": "gte", "value": "Secret"}],
        "description": "All users with Secret or higher clearance",
    },
    {
        "id": "grp-dyn-managers", "name": "All Managers",
        "type": "access_level", "membershipType": "dynamic",
        "members": [],
        "rules": [{"field": "jobTitle", "op": "contains", "value": "Manager"}],
        "description": "All users whose title contains Manager",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UNICODE_REPLACEMENTS = [
    ("\u2013", " - "), ("\u2014", " - "), ("\u2018", "'"), ("\u2019", "'"),
    ("\u201c", '"'),   ("\u201d", '"'),   ("\u2026", "..."), ("\u00a0", " "),
    ("\ufffd", "?"),
]

def clean(s: str) -> str:
    if not s:
        return ""
    for bad, good in UNICODE_REPLACEMENTS:
        s = s.replace(bad, good)
    s = "".join(c if ord(c) < 128 else "?" for c in s)
    return s.strip()

def jdump(obj) -> str:
    return json.dumps(obj, ensure_ascii=True)

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

# ---------------------------------------------------------------------------
# Parse
# ---------------------------------------------------------------------------

def parse(bundle_path: str) -> dict:
    with open(bundle_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    result = {}
    for key in ["users", "doors", "areas", "groups", "schedules", "policies"]:
        m = re.search(rf"window\.ABAC_DATA\.{key}\s*=\s*(\[[\s\S]*?\]);", content)
        if not m:
            print(f"WARNING: key '{key}' not found", file=sys.stderr)
            result[key] = []
        else:
            result[key] = json.loads(m.group(1))

    return result

# ---------------------------------------------------------------------------
# Transform
# ---------------------------------------------------------------------------

def transform(raw: dict):
    raw_users     = raw["users"]      # 721 items, id=int non-sequential
    raw_doors     = raw["doors"]      # 85 items, id=int
    raw_areas     = raw["areas"]      # 23 items, id=int
    raw_groups    = raw["groups"]     # 37 items (25 AL + 12 ctrl)
    raw_schedules = raw["schedules"]  # 24 items, id=int
    raw_policies  = raw["policies"]   # 25 items, id=string

    # ── User ID mapping: int -> "user-XXXX" ─────────────────────────────────
    user_id_map = {u["id"]: f"user-{i:04d}" for i, u in enumerate(raw_users)}

    # ── Controllers → Sites ─────────────────────────────────────────────────
    ctrl_groups = [g for g in raw_groups if g["source"] == "controller"]
    # Map controller sourceId (int) → site id string
    ctrl_src_to_site = {}
    sites = []
    for cg in ctrl_groups:
        sid = f"site-ctrl-{cg['sourceId']}"
        ctrl_src_to_site[cg["sourceId"]] = sid
        sites.append({
            "id": sid,
            "name": clean(cg["name"]),
            "location": f"Controller {cg['sourceId']}",
            "status": "online",
        })

    # ── Areas → Zones ───────────────────────────────────────────────────────
    area_id_to_zone = {}   # raw area int id → zone id string
    zones = []
    for a in raw_areas:
        zid = f"zone-{a['id']}"
        area_id_to_zone[a["id"]] = zid
        ctrl_id = a.get("controllerId", 0)
        site_id = ctrl_src_to_site.get(ctrl_id, sites[0]["id"] if sites else "site-ctrl-0")
        sec_level = a.get("customAttrValues", {}).get("securityLevel", "Standard")
        zones.append({
            "id": zid,
            "name": clean(a["name"]),
            "siteId": site_id,
            "securityLevel": sec_level,
            "requiresTwoFactor": sec_level == "Critical",
        })

    # ── Doors ───────────────────────────────────────────────────────────────
    door_id_to_str = {}   # raw door int id → door id string
    doors = []
    for d in raw_doors:
        did = f"door-{d['id']}"
        door_id_to_str[d["id"]] = did
        ctrl_id = d.get("controllerId", 0)
        site_id = ctrl_src_to_site.get(ctrl_id, sites[0]["id"] if sites else "site-ctrl-0")
        area_inside = d.get("areaInside")
        zone_id = area_id_to_zone.get(area_inside) if area_inside is not None and area_inside != 2147483647 else None
        if zone_id is None and zones:
            # Assign to first zone in this site
            zone_id = next((z["id"] for z in zones if z["siteId"] == site_id), zones[0]["id"])
        req_2fa = d.get("customAttrValues", {}).get("requiresTwoFactor", False)
        doors.append({
            "id": did,
            "name": clean(d["name"]),
            "zoneId": zone_id,
            "siteId": site_id,
            "type": "standard",
            "status": "locked",
            "online": True,
            "requiresTwoFactor": bool(req_2fa),
        })

    # ── Users ───────────────────────────────────────────────────────────────
    users = []
    for i, u in enumerate(raw_users):
        attrs = u.get("attributes", {})
        custom = u.get("customAttrValues", {})
        raw_cl = attrs.get("clearanceLevel", "Standard")
        cl = CLEARANCE_MAP.get(raw_cl, "Unclassified")
        dept = clean(attrs.get("department", "General"))
        title = clean(custom.get("job_title") or attrs.get("jobTitle") or "Staff")
        users.append({
            "id": user_id_map[u["id"]],
            "name": clean(u.get("displayName") or f"{u.get('firstName','')} {u.get('lastName','')}"),
            "email": clean(u.get("email", f"user{i}@acme.co.nz")),
            "department": dept,
            "jobTitle": title,
            "clearanceLevel": cl,
            "active": not u.get("disabled", False),
        })

    # ── Groups (access levels) → demo Groups ────────────────────────────────
    al_groups = [g for g in raw_groups if g["source"] == "access_level"]
    groups = []
    al_grp_id_map = {}  # "group-al-N" → demo group id
    for ag in al_groups:
        gid = ag["id"]  # already "group-al-N"
        al_grp_id_map[gid] = gid
        raw_members = ag.get("memberUserIds", [])
        members = [user_id_map[uid] for uid in raw_members if uid in user_id_map]
        groups.append({
            "id": gid,
            "name": clean(ag["name"]),
            "type": "access_level",
            "membershipType": "explicit",
            "members": members,
            "description": clean(ag.get("description", "")),
        })

    for dg in DYNAMIC_GROUPS:
        groups.append(dg)

    # ── Schedules ───────────────────────────────────────────────────────────
    # Map Gallagher schedule int id + name → demo schedule id
    sched_id_map = {}   # name.lower() → demo sched id
    schedules = []
    for s in SCHEDULES_STATIC:
        sched_id_map[s["name"].lower()] = s["id"]
        schedules.append(s)
    for rs in raw_schedules:
        rs_name = clean(rs.get("name", ""))
        rs_id = f"sched-gallagher-{rs['id']}"
        if rs_name.lower() not in sched_id_map:
            sched_id_map[rs_name.lower()] = rs_id
            days_obj = rs.get("days", {})
            day_names = [k.capitalize()[:3] for k, v in days_obj.items() if v]
            schedules.append({
                "id": rs_id,
                "name": rs_name,
                "type": "weekly",
                "days": day_names,
                "start": rs.get("startTime", "00:00"),
                "end": rs.get("endTime", "23:59"),
            })

    # ── Grants (from Gallagher policies) ────────────────────────────────────
    grants = []
    grant_id_map = {}   # policy id → grant id
    for rp in raw_policies:
        pid = rp["id"]
        cond = rp.get("conditions", {})
        subject = cond.get("subject", {})
        resource = cond.get("resource", {})
        env = cond.get("environment", {})

        grp_id = subject.get("groupId")
        if not grp_id or grp_id not in al_grp_id_map:
            continue

        raw_door_ids = resource.get("doorIds", [])
        mapped_doors = [door_id_to_str[did] for did in raw_door_ids if did in door_id_to_str]
        if not mapped_doors:
            continue

        sched_name = (env.get("scheduleName") or "Always").lower()
        sched_id = sched_id_map.get(sched_name, "sched-always")

        gid = f"grant-{pid}"
        grant_id_map[pid] = gid
        grants.append({
            "id": gid,
            "name": clean(rp["name"]),
            "actions": ["unlock"],
            "scope": "global",
            "scheduleId": sched_id,
            "description": clean(rp.get("description", "")),
            "assignedGroups": [grp_id],
            "targetDoors": mapped_doors,
            "applicationMode": "assigned",
        })

    # ── ABAC Policies (from zone security levels) ────────────────────────────
    policies = build_abac_policies(zones, doors)

    # ── Controllers list ────────────────────────────────────────────────────
    controllers = []
    for i, cg in enumerate(ctrl_groups):
        site_id = ctrl_src_to_site[cg["sourceId"]]
        managed_doors = [door_id_to_str[did] for did in cg.get("memberDoorIds", [])
                         if did in door_id_to_str]
        controllers.append({
            "id": f"ctrl-{cg['sourceId']:02d}",
            "name": clean(cg["name"]),
            "siteId": site_id,
            "status": "online",
            "doorsManaged": managed_doors,
        })

    # ── Tasks (sample) ──────────────────────────────────────────────────────
    u = lambda i: users[i]["id"] if i < len(users) else None
    tasks = [
        {"id": "task-001", "title": "Annual access review - all sites", "status": "open",
         "priority": "High",     "assignee": u(0), "description": "Review all active grants for each controller site"},
        {"id": "task-002", "title": "Revoke departed employee access",  "status": "in-progress",
         "priority": "Critical", "assignee": u(1), "description": "Three employees departed last week - access not yet revoked"},
        {"id": "task-003", "title": "Update visitor policy schedule",   "status": "open",
         "priority": "Medium",   "assignee": u(2), "description": "Visitor escort policy needs schedule update for new hours"},
        {"id": "task-004", "title": "Critical zone audit - Server Rooms", "status": "open",
         "priority": "High",     "assignee": u(3), "description": "Verify two-factor is enforced on all Critical zone doors"},
        {"id": "task-005", "title": "Quarterly compliance report",     "status": "open",
         "priority": "Medium",   "assignee": u(0), "description": "Generate Q1 access compliance report for management"},
        {"id": "task-006", "title": "Investigate door offline status",  "status": "in-progress",
         "priority": "High",     "assignee": u(4), "description": "Controller offline - investigate network connectivity"},
        {"id": "task-007", "title": "New contractor onboarding",       "status": "open",
         "priority": "Low",      "assignee": u(5), "description": "Provision temporary visitor escort grants for 12 contractors"},
        {"id": "task-008", "title": "Emergency procedure drill",       "status": "open",
         "priority": "Medium",   "assignee": u(6), "description": "Test emergency override access for all security personnel"},
        {"id": "task-009", "title": "Night shift access audit",        "status": "open",
         "priority": "Low",      "assignee": u(7), "description": "Audit all users with after-hours schedule grants"},
        {"id": "task-010", "title": "ABAC policy update - Research",   "status": "open",
         "priority": "High",     "assignee": u(8), "description": "Upgrade Research zone to require Confidential clearance"},
    ]

    # ── Arming Logs ─────────────────────────────────────────────────────────
    arming_logs = [
        {"id": "arm-001", "zoneId": zones[0]["id"] if zones else None,
         "action": "arm",    "userId": u(0), "timestamp": "2026-04-07T08:00:00Z", "reason": "End of shift"},
        {"id": "arm-002", "zoneId": zones[1]["id"] if len(zones)>1 else None,
         "action": "disarm", "userId": u(1), "timestamp": "2026-04-07T07:45:00Z", "reason": "Start of shift"},
        {"id": "arm-003", "zoneId": zones[2]["id"] if len(zones)>2 else None,
         "action": "arm",    "userId": u(0), "timestamp": "2026-04-06T22:00:00Z", "reason": "After hours arming"},
        {"id": "arm-004", "zoneId": zones[0]["id"] if zones else None,
         "action": "disarm", "userId": u(2), "timestamp": "2026-04-07T06:30:00Z", "reason": "Early morning"},
        {"id": "arm-005", "zoneId": zones[3]["id"] if len(zones)>3 else None,
         "action": "arm",    "userId": u(1), "timestamp": "2026-04-07T09:00:00Z", "reason": "Scheduled arming"},
        {"id": "arm-006", "zoneId": zones[4]["id"] if len(zones)>4 else None,
         "action": "disarm", "userId": u(3), "timestamp": "2026-04-07T07:00:00Z", "reason": "Morning open"},
    ]

    return {
        "sites":       sites,
        "zones":       zones,
        "doors":       doors,
        "controllers": controllers,
        "users":       users,
        "groups":      groups,
        "grants":      grants,
        "policies":    policies,
        "schedules":   schedules,
        "tasks":       tasks,
        "armingLogs":  arming_logs,
    }


def build_abac_policies(zones, doors):
    """Derive ABAC attribute-gate policies from zone security levels."""
    critical_doors = [d["id"] for d in doors
                      if any(z["id"] == d.get("zoneId") and z["securityLevel"] == "Critical"
                             for z in zones)]
    high_doors = [d["id"] for d in doors
                  if any(z["id"] == d.get("zoneId") and z["securityLevel"] == "High"
                         for z in zones)]
    twofa_doors = [d["id"] for d in doors if d.get("requiresTwoFactor")]

    policies = []
    if critical_doors:
        policies.append({
            "id": "abac-critical-zones",
            "name": "Critical Zone - Secret Clearance Required",
            "description": "Doors in Critical security zones require Secret clearance and MFA",
            "doorIds": critical_doors,
            "conditions": [
                {"attribute": "clearanceLevel", "op": "gte",  "value": "Secret"},
                {"attribute": "mfaVerified",    "op": "eq",   "value": True},
            ],
            "effect": "Deny",
            "priority": 1,
        })
    if high_doors:
        policies.append({
            "id": "abac-high-zones",
            "name": "High Security Zone - Confidential Clearance Required",
            "description": "Doors in High security zones require Confidential clearance",
            "doorIds": high_doors,
            "conditions": [
                {"attribute": "clearanceLevel", "op": "gte",  "value": "Confidential"},
            ],
            "effect": "Deny",
            "priority": 2,
        })
    if twofa_doors:
        policies.append({
            "id": "abac-two-factor",
            "name": "Two-Factor Authentication Required",
            "description": "Doors marked requiresTwoFactor demand MFA verification",
            "doorIds": twofa_doors,
            "conditions": [
                {"attribute": "mfaVerified", "op": "eq", "value": True},
            ],
            "effect": "Deny",
            "priority": 1,
        })
    policies.append({
        "id": "abac-after-hours",
        "name": "After-Hours - Security Personnel Only",
        "description": "Outside business hours, non-security users are denied entry",
        "doorIds": [d["id"] for d in doors[:15]],
        "conditions": [
            {"attribute": "timeOfDay",       "op": "outside", "value": "08:00-18:00"},
            {"attribute": "groupMembership", "op": "notIn",   "value": ["grp-dyn-security", "group-al-1"]},
        ],
        "effect": "Deny",
        "priority": 3,
    })
    return policies


# ---------------------------------------------------------------------------
# Render TypeScript
# ---------------------------------------------------------------------------

TS_HEADER = '''// AUTO-GENERATED by tools/gen_real_world_data.py - DO NOT EDIT MANUALLY
// Source: Gallagher Command Centre export (acme.co.nz)
// Run: python tools/gen_real_world_data.py

import { useStore } from '../store/store';

'''

def render_ts(d: dict) -> str:
    lines = [TS_HEADER]

    def arr(name, items):
        return f"const {name} = {jdump(items)} as const;\n\n"

    lines.append(arr("SITES",       d["sites"]))
    lines.append(arr("ZONES",       d["zones"]))
    lines.append(arr("DOORS",       d["doors"]))
    lines.append(arr("CONTROLLERS", d["controllers"]))
    lines.append(arr("USERS",       d["users"]))
    lines.append(arr("GROUPS",      d["groups"]))
    lines.append(arr("GRANTS",      d["grants"]))
    lines.append(arr("POLICIES",    d["policies"]))
    lines.append(arr("SCHEDULES",   d["schedules"]))
    lines.append(arr("TASKS",       d["tasks"]))
    lines.append(arr("ARMING_LOGS", d["armingLogs"]))

    lines.append("""export function generateRealWorldData(): void {
  const store = useStore.getState();

  store.setSites(SITES as any);
  store.setZones(ZONES as any);
  store.setDoors(DOORS as any);
  store.setControllers(CONTROLLERS as any);
  store.setUsers(USERS as any);
  store.setGroups(GROUPS as any);
  store.setGrants(GRANTS as any);
  store.setPolicies(POLICIES as any);
  store.setSchedules(SCHEDULES as any);
  store.setTasks(TASKS as any);
  store.setArmingLogs(ARMING_LOGS as any);
}
""")

    return "".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="C:/Users/JCullum/Downloads/bundle.js")
    parser.add_argument("--output", default="abac-soc-demo-v2/src/data/realWorldData.ts")
    args = parser.parse_args()

    print(f"Reading {args.input} ...")
    raw = parse(args.input)

    print("Transforming ...")
    transformed = transform(raw)

    counts = {k: len(v) for k, v in transformed.items()}
    print("Counts:", counts)

    ts = render_ts(transformed)

    # Verify ASCII clean
    bad = [(i, c) for i, c in enumerate(ts) if ord(c) > 127]
    if bad:
        print(f"WARNING: {len(bad)} non-ASCII chars in output at positions {bad[:5]}", file=sys.stderr)

    print(f"Writing {args.output} ...")
    with open(args.output, "w", encoding="ascii", errors="replace") as f:
        f.write(ts)

    print("Done.")


if __name__ == "__main__":
    main()
