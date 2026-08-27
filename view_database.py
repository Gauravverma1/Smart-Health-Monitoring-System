"""
📊 Smart Health Monitoring - Database Viewer & Export Tool
Enhanced with ANSI terminal styling, password masking, filtering, and HTML Dashboard output.

Usage:
    python view_database.py                       # Standard viewer + auto export
    python view_database.py --show-passwords      # View cleartext passwords
    python view_database.py --search john         # Search users by name/email
    python view_database.py --role doctor         # Filter by role
    python view_database.py --json                # Export output as JSON
"""

import sqlite3
import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Find database file
BASE_DIR = Path(__file__).parent
POSSIBLE_DB_PATHS = [
    BASE_DIR / "backend_py" / "smarthealth.db",
    BASE_DIR / "backend_py" / "health.db",
    BASE_DIR / "smarthealth.db",
    BASE_DIR / "health.db"
]

db_path = None
for path in POSSIBLE_DB_PATHS:
    if path.exists():
        db_path = path
        break

output_txt = BASE_DIR / "user_accounts.txt"
output_html = BASE_DIR / "user_accounts.html"
output_json = BASE_DIR / "user_accounts.json"

# ANSI Terminal Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

def print_banner():
    print(f"{CYAN}{BOLD}=" * 80 + f"{RESET}")
    print(f"{MAGENTA}{BOLD}   SMART HEALTH MONITORING - ADVANCED DATABASE DASHBOARD{RESET}")
    print(f"{CYAN}{BOLD}=" * 80 + f"{RESET}")

def mask_password(pwd: str, show_cleartext: bool = False) -> str:
    if show_cleartext or not pwd:
        return pwd
    return "•" * min(len(pwd), 12)

def generate_html_report(users, role_counts, total_vitals, db_path_str, generated_at):
    patient_count = sum(c for r, c in role_counts if r.lower() == 'patient')
    doctor_count = sum(c for r, c in role_counts if r.lower() == 'doctor')
    other_count = len(users) - patient_count - doctor_count

    rows_html = ""
    for u in users:
        uid, uname, pwd, role, pid, fname, email, age, gender = u
        role_class = "badge-patient" if role.lower() == 'patient' else ("badge-doctor" if role.lower() == 'doctor' else "badge-admin")
        
        rows_html += f"""
        <tr data-role="{role.lower()}" data-search="{uname} {fname or ''} {email or ''} {pid or ''}">
            <td><strong>#{uid}</strong></td>
            <td>
                <div class="user-cell">
                    <span class="user-avatar">{ (fname or uname)[0].upper() }</span>
                    <div>
                        <div class="username">{uname}</div>
                        <div class="subtext">{fname or 'No name provided'}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge {role_class}">{role.upper()}</span></td>
            <td><code>{pid or 'N/A'}</code></td>
            <td>{email or '<span class="muted">None</span>'}</td>
            <td>{age or 'N/A'} / {gender.capitalize() if gender else 'N/A'}</td>
            <td><code class="pwd-mask" title="Password">{mask_password(pwd, False)}</code></td>
        </tr>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Health - User Accounts Database</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #38bdf8;
            --accent-green: #34d399;
            --accent-purple: #c084fc;
            --accent-amber: #fbbf24;
        }}

        [data-theme="light"] {{
            --bg: #f8fafc;
            --card-bg: rgba(255, 255, 255, 0.85);
            --border: #e2e8f0;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --primary: #0284c7;
            --accent-green: #16a34a;
            --accent-purple: #9333ea;
            --accent-amber: #d97706;
        }}

        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }}
        body {{ background-color: var(--bg); color: var(--text-main); min-height: 100vh; padding: 32px 24px; transition: background 0.3s; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}

        header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }}
        .brand {{ display: flex; align-items: center; gap: 12px; }}
        .brand-icon {{ width: 44px; height: 44px; background: linear-gradient(135deg, #0284c7, #6366f1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); }}
        .brand-title {{ font-size: 22px; font-weight: 700; background: linear-gradient(90deg, var(--primary), var(--accent-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}

        .header-controls {{ display: flex; gap: 12px; }}
        .btn {{ padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-main); font-weight: 600; cursor: pointer; backdrop-filter: blur(10px); transition: all 0.2s; }}
        .btn:hover {{ border-color: var(--primary); transform: translateY(-1px); }}

        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }}
        .stat-card {{ background: var(--card-bg); border: 1px solid var(--border); padding: 20px; border-radius: 16px; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }}
        .stat-label {{ font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
        .stat-value {{ font-size: 28px; font-weight: 700; color: var(--text-main); }}

        .filter-section {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }}
        .search-box {{ position: relative; flex: 1; max-width: 400px; }}
        .search-box input {{ width: 100%; padding: 12px 16px 12px 40px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-main); font-size: 14px; outline: none; }}
        .search-box::before {{ content: "🔍"; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); opacity: 0.6; }}

        .role-filters {{ display: flex; gap: 8px; }}
        .filter-chip {{ padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted); cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; }}
        .filter-chip.active, .filter-chip:hover {{ background: var(--primary); color: white; border-color: var(--primary); }}

        .table-container {{ background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; backdrop-filter: blur(12px); box-shadow: 0 10px 40px rgba(0,0,0,0.15); }}
        table {{ width: 100%; border-collapse: collapse; text-align: left; }}
        th {{ background: rgba(0,0,0,0.1); padding: 16px 20px; font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border); }}
        td {{ padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 14px; }}
        tr:last-child td {{ border-bottom: none; }}
        tr:hover td {{ background: rgba(255, 255, 255, 0.02); }}

        .user-cell {{ display: flex; align-items: center; gap: 12px; }}
        .user-avatar {{ width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent-purple)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }}
        .username {{ font-weight: 600; }}
        .subtext {{ font-size: 12px; color: var(--text-muted); }}

        .badge {{ padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; display: inline-block; }}
        .badge-patient {{ background: rgba(52, 211, 153, 0.15); color: var(--accent-green); border: 1px solid var(--accent-green); }}
        .badge-doctor {{ background: rgba(56, 189, 248, 0.15); color: var(--primary); border: 1px solid var(--primary); }}
        .badge-admin {{ background: rgba(192, 132, 252, 0.15); color: var(--accent-purple); border: 1px solid var(--accent-purple); }}

        code {{ font-family: monospace; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 6px; font-size: 12px; }}
        .muted {{ color: var(--text-muted); font-style: italic; }}

        footer {{ margin-top: 32px; text-align: center; color: var(--text-muted); font-size: 13px; }}

        @media print {{
            body {{ background: white; color: black; padding: 0; }}
            .header-controls, .filter-section {{ display: none; }}
            .table-container, .stat-card {{ border: 1px solid #ccc; box-shadow: none; background: white; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">
                <div class="brand-icon">❤</div>
                <div>
                    <h1 class="brand-title">Smart Health Monitoring</h1>
                    <div style="font-size: 13px; color: var(--text-muted);">User Account Inspector & Analytics</div>
                </div>
            </div>
            <div class="header-controls">
                <button class="btn" onclick="toggleTheme()">🌓 Toggle Theme</button>
                <button class="btn" onclick="window.print()">🖨️ Print Report</button>
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Accounts</div>
                <div class="stat-value">{len(users)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Registered Patients</div>
                <div class="stat-value" style="color: var(--accent-green);">{patient_count}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Doctors & Admins</div>
                <div class="stat-value" style="color: var(--primary);">{doctor_count + other_count}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Recorded Vital Logs</div>
                <div class="stat-value" style="color: var(--accent-purple);">{total_vitals:,}</div>
            </div>
        </div>

        <div class="filter-section">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Search by name, username, email, ID..." oninput="filterTable()">
            </div>
            <div class="role-filters">
                <button class="filter-chip active" onclick="setRoleFilter('all', this)">All Roles ({len(users)})</button>
                <button class="filter-chip" onclick="setRoleFilter('patient', this)">Patients ({patient_count})</button>
                <button class="filter-chip" onclick="setRoleFilter('doctor', this)">Doctors ({doctor_count})</button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User / Account Name</th>
                        <th>Role</th>
                        <th>Patient ID</th>
                        <th>Email</th>
                        <th>Age / Gender</th>
                        <th>Password</th>
                    </tr>
                </thead>
                <tbody id="userTableBody">
                    {rows_html}
                </tbody>
            </table>
        </div>

        <footer>
            Database Location: <code>{db_path_str}</code> | Generated on {generated_at}
        </footer>
    </div>

    <script>
        let currentRole = 'all';

        function toggleTheme() {{
            const body = document.body;
            if (body.getAttribute('data-theme') === 'light') {{
                body.removeAttribute('data-theme');
            }} else {{
                body.setAttribute('data-theme', 'light');
            }}
        }}

        function setRoleFilter(role, el) {{
            currentRole = role;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            filterTable();
        }}

        function filterTable() {{
            const query = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#userTableBody tr');

            rows.forEach(row => {{
                const roleMatch = currentRole === 'all' || row.dataset.role === currentRole;
                const searchMatch = !query || row.dataset.search.toLowerCase().includes(query);
                row.style.display = (roleMatch && searchMatch) ? '' : 'none';
            }});
        }}
    </script>
</body>
</html>
"""
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

def main():
    parser = argparse.ArgumentParser(description="Smart Health Database Inspector")
    parser.add_argument("--show-passwords", action="store_true", help="Display cleartext passwords in terminal")
    parser.add_argument("--search", type=str, default="", help="Filter users by search term")
    parser.add_argument("--role", type=str, default="", help="Filter users by role (patient, doctor, admin)")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    args = parser.parse_args()

    print_banner()

    if not db_path:
        print(f"\n{RED}Error: SQLite database not found.{RESET}")
        print(f"{DIM}Searched paths: {[str(p) for p in POSSIBLE_DB_PATHS]}{RESET}\n")
        sys.exit(1)

    print(f"Connected Database: {CYAN}{db_path}{RESET}")
    print(f"Timestamp:          {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print(f"{YELLOW}Warning: 'users' table does not exist yet in database.{RESET}")
        conn.close()
        sys.exit(0)

    # Fetch total vitals count if available
    total_vitals = 0
    try:
        cursor.execute("SELECT COUNT(*) FROM vital_readings")
        total_vitals = cursor.fetchone()[0]
    except Exception:
        pass

    # Build SQL Query
    query = "SELECT id, username, password, role, patientId, fullName, email, age, gender FROM users WHERE 1=1"
    params = []

    if args.role:
        query += " AND LOWER(role) = ?"
        params.append(args.role.lower())

    if args.search:
        query += " AND (username LIKE ? OR fullName LIKE ? OR email LIKE ? OR patientId LIKE ?)"
        s = f"%{args.search}%"
        params.extend([s, s, s, s])

    query += " ORDER BY id"
    cursor.execute(query, params)
    users = cursor.fetchall()

    # Get role stats
    cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
    role_counts = cursor.fetchall()

    if args.json:
        user_list = []
        for u in users:
            user_list.append({
                "id": u[0],
                "username": u[1],
                "password": u[2] if args.show_passwords else mask_password(u[2]),
                "role": u[3],
                "patientId": u[4],
                "fullName": u[5],
                "email": u[6],
                "age": u[7],
                "gender": u[8]
            })
        print(json.dumps(user_list, indent=2))
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(user_list, f, indent=2)
        print(f"\n{GREEN}Exported JSON data to {output_json}{RESET}")
        conn.close()
        return

    # Terminal Output Presentation
    print(f"{BOLD}ACCOUNT SUMMARY:{RESET}")
    print(f"   Total Matching Users: {GREEN}{len(users)}{RESET}")
    print(f"   Total Vital Records:  {MAGENTA}{total_vitals:,}{RESET}")
    for role, count in role_counts:
        print(f"   - {role.capitalize()}s: {CYAN}{count}{RESET}")

    print("\n" + f"{CYAN}-" * 80 + f"{RESET}")

    # Header Row
    header = f"{'ID':<5} | {'USERNAME':<16} | {'ROLE':<8} | {'PATIENT ID':<10} | {'FULL NAME':<20} | {'PASSWORD':<12}"
    print(f"{BOLD}{header}{RESET}")
    print(f"{CYAN}-" * 80 + f"{RESET}")

    txt_lines = [
        "=" * 80,
        "SMART HEALTH MONITORING - USER ACCOUNTS DATABASE",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Database: {db_path}",
        "=" * 80,
        ""
    ]

    for u in users:
        uid, uname, pwd, role, pid, fname, email, age, gender = u
        masked_pwd = mask_password(pwd, args.show_passwords)
        
        role_color = GREEN if role.lower() == 'patient' else (BLUE if role.lower() == 'doctor' else MAGENTA)
        
        row_str = f"{uid:<5} | {uname:<16} | {role_color}{role.upper():<8}{RESET} | {(pid or 'N/A'):<10} | {(fname or 'N/A'):<20} | {DIM}{masked_pwd:<12}{RESET}"
        print(row_str)

        txt_lines.append("-" * 80)
        txt_lines.append(f"ID:           {uid}")
        txt_lines.append(f"Username:     {uname}")
        txt_lines.append(f"Password:     {pwd if args.show_passwords else masked_pwd}")
        txt_lines.append(f"Role:         {role.upper()}")
        if pid: txt_lines.append(f"Patient ID:   {pid}")
        if fname: txt_lines.append(f"Full Name:    {fname}")
        if email: txt_lines.append(f"Email:        {email}")
        if age: txt_lines.append(f"Age:          {age}")
        if gender: txt_lines.append(f"Gender:       {gender}")
        txt_lines.append("")

    print(f"{CYAN}-" * 80 + f"{RESET}\n")

    # Export Text File
    try:
        with open(output_txt, 'w', encoding='utf-8') as f:
            f.write('\n'.join(txt_lines))
        print(f"{GREEN}Plaintext report exported to:{RESET} {output_txt}")
    except Exception as e:
        print(f"{RED}Failed to write txt report: {e}{RESET}")

    # Export HTML File
    try:
        generate_html_report(users, role_counts, total_vitals, str(db_path), datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        print(f"{GREEN}Interactive HTML Dashboard generated at:{RESET} {CYAN}{output_html}{RESET}")
        print(f"   {DIM}(Open {output_html.name} in any web browser for live search & theme toggle){RESET}\n")
    except Exception as e:
        print(f"{RED}Failed to generate HTML report: {e}{RESET}")

    conn.close()

if __name__ == "__main__":
    main()
