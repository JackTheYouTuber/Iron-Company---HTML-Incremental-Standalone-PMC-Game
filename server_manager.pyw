# Iron Company — Server Manager
# Run with pythonw (no console) or python.

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import os
import sys
import socket
import datetime
import re
import queue
import pathlib
import webbrowser
import collections
import http.server as _http_server
import posixpath
import urllib.parse
import traceback
import json

# ─────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────
DEFAULT_PORT = 8000
DEFAULT_DIR  = os.path.dirname(os.path.abspath(__file__))
APP_TITLE    = "Iron Company — Server Manager"
WIN_W, WIN_H = 920, 640
LOG_MAX      = 2000

C = {
    "bg":        "#0d0b08",
    "panel":     "#131008",
    "border":    "#4a3810",
    "gold":      "#c8922a",
    "gold2":     "#e8b84b",
    "text":      "#d4bc88",
    "text2":     "#806848",
    "green":     "#6aaa50",
    "red":       "#a03020",
    "red2":      "#c04030",
    "blue":      "#5878c8",
    "purple":    "#8855cc",
    "entry_bg":  "#1a1508",
    "btn_bg":    "#1e1608",
    "btn_hover": "#2a2010",
    "log_bg":    "#080602",
    "ind_on":    "#6aaa50",
    "ind_off":   "#4a1810",
    "ind_wait":  "#c8922a",
}

FONTS = {
    "title":   ("Georgia",  16, "bold"),
    "heading": ("Georgia",  10, "bold"),
    "body":    ("Georgia",   9),
    "mono":    ("Consolas", 10),
    "mono_sm": ("Consolas",  9),
    "mono_lg": ("Consolas", 13, "bold"),
    "label":   ("Georgia",   8, "italic"),
}

LogEntry = collections.namedtuple("LogEntry", ["ts", "method", "path", "status", "size", "raw"])


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0

def find_free_port(start=8000, end=8100):
    for p in range(start, end):
        if not is_port_in_use(p):
            return p
    return start

def fmt_bytes(n):
    if n < 1024:     return f"{n} B"
    if n < 1<<20:    return f"{n/1024:.1f} KB"
    return               f"{n/1<<20:.1f} MB"

def now_ts():
    return datetime.datetime.now().strftime("%H:%M:%S")

def parse_log_line(line):
    m = re.search(
        r'(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)[^"]*"\s+(\d+)\s+(\S+)', line)
    if not m:
        return None
    _, dt_str, method, path, status, size = m.groups()
    try:
        t = datetime.datetime.strptime(dt_str, "%d/%b/%Y %H:%M:%S").strftime("%H:%M:%S")
    except Exception:
        t = now_ts()
    sz = "-" if size == "-" else (fmt_bytes(int(size)) if size.isdigit() else size)
    return LogEntry(t, method, path, status, sz, line.rstrip())


# ─────────────────────────────────────────────
#  NO-CACHE HTTP HANDLER
# ─────────────────────────────────────────────

class _NoCacheHandler(_http_server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?',1)[0].split('#',1)[0]
        path = posixpath.normpath(urllib.parse.unquote(path))
        p    = self.server._root_dir
        for w in [x for x in path.split('/') if x]:
            p = os.path.join(p, w)
        return p

    def _strip_cond(self):
        self.headers._headers = [
            (k,v) for k,v in self.headers._headers
            if k.lower() not in ('if-modified-since','if-none-match')
        ]

    def do_GET(self):
        self._strip_cond()
        # Debug status polling — client asks if server wants a snapshot
        if self.path == '/api/debug/status':
            pending = getattr(self.server, '_debug_request_pending', False)
            self.server._debug_request_pending = False
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'request': pending}).encode())
            return
        super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)
        # Client log — console overrides + game events
        if self.path == '/api/log':
            try:
                data    = json.loads(body)
                level   = data.get('level', 'info')
                message = data.get('message', '')
                extra   = data.get('extra')
                if hasattr(self.server, '_on_client_log'):
                    self.server._on_client_log(level, message, extra)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'OK')
            except Exception:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Bad Request')
            return
        # Debug snapshot — full game state + DOM + function inventory
        if self.path == '/api/debug':
            try:
                data = json.loads(body)
                if hasattr(self.server, '_on_debug_snapshot'):
                    self.server._on_debug_snapshot(data)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'OK')
            except Exception:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Bad Request')
            return
        self.send_response(404)
        self.end_headers()

    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate')
        self.send_header('Pragma','no-cache')
        self.send_header('Expires','0')
        super().end_headers()

    def log_message(self, fmt, *args):
        self.server._on_log(
            f'127.0.0.1 - - [{self.log_date_time_string()}] "{fmt % args}"')

    def log_error(self, fmt, *args):
        self.server._on_log(f'[ERR] {fmt % args}')


# ─────────────────────────────────────────────
#  SERVER MANAGER
# ─────────────────────────────────────────────

class ServerManager:
    def __init__(self, on_log, on_state, on_client_log=None, on_debug_snapshot=None):
        self._httpd      = None
        self._thread     = None
        self.on_log      = on_log
        self.on_state    = on_state
        self.on_client_log      = on_client_log      # (level, message, extra) → None
        self.on_debug_snapshot  = on_debug_snapshot  # (data: dict) → None
        self._state      = "off"
        self.port        = DEFAULT_PORT
        self.root_dir    = DEFAULT_DIR
        self.bytes_out   = 0
        self.req_count   = 0
        self.err_count   = 0
        self.start_time  = None
        self._debug_request_pending = False  # set True when UI requests a snapshot

    @property
    def state(self): return self._state
    @property
    def running(self): return self._state == "on" and self._httpd is not None

    def _set(self, s):
        self._state = s
        self.on_state(s)

    def request_debug(self):
        """Ask the connected browser to send a full debug snapshot."""
        self._debug_request_pending = True

    def start(self, port, root_dir):
        if self._state != "off": return
        self.port     = port
        self.root_dir = root_dir
        if is_port_in_use(port):
            self.on_log(f"[Error] Port {port} is already in use.", "error"); return
        self._set("starting")
        self.on_log(f"[System] Starting on port {port}…", "system")
        self.on_log(f"[System] Serving: {root_dir}", "system")
        self.on_log(f"[System] Cache-Control: no-store (304s suppressed)", "system")
        try:
            self._httpd = _http_server.HTTPServer(('', port), _NoCacheHandler)
        except OSError as e:
            self.on_log(f"[Error] Cannot bind port {port}: {e}", "error")
            self._set("off"); return
        self._httpd._root_dir            = root_dir
        self._httpd._on_log              = self._handle
        self._httpd._on_client_log       = self.on_client_log
        self._httpd._on_debug_snapshot   = self.on_debug_snapshot
        self._httpd._debug_request_pending = False
        self.bytes_out  = 0
        self.req_count  = 0
        self.err_count  = 0
        self.start_time = datetime.datetime.now()
        self._set("on")
        self.on_log(f"[System] Fort open — http://127.0.0.1:{port}", "start")
        self._thread = threading.Thread(target=self._serve, daemon=True, name="iron-http")
        self._thread.start()

    def stop(self):
        if self._state not in ("on","starting"): return
        self._set("stopping")
        self.on_log("[System] Lowering the gate…", "system")
        if self._httpd:
            self._httpd.shutdown()
            self._httpd = None
        self._set("off")
        self.on_log("[System] Server stopped.", "stop")

    def _serve(self):
        try: self._httpd.serve_forever()
        except Exception: pass
        finally:
            if self._state == "on":
                self._set("off")
                self.on_log("[System] Server stopped unexpectedly.", "warning")

    def _handle(self, line):
        self.req_count += 1
        e = parse_log_line(line)
        if e:
            try:
                m = re.search(r'\s(\d+)$', e.raw)
                if m: self.bytes_out += int(m.group(1))
            except Exception: pass
            if e.status.startswith(('4','5')): self.err_count += 1
            self.on_log(e, None)
        else:
            s = line.rstrip()
            if s: self.on_log(f"[SYS] {s}", "info")

    def uptime(self):
        if not self.start_time: return "—"
        d = datetime.datetime.now() - self.start_time
        h,r = divmod(int(d.total_seconds()), 3600)
        m,s = divmod(r, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"


# ─────────────────────────────────────────────
#  MAIN APP
# ─────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry(f"{WIN_W}x{WIN_H}")
        self.minsize(720, 500)
        self.configure(bg=C["bg"])
        self._set_icon()

        self._q          = queue.Queue()
        self._log_store  = []          # (kind, ...) tuples
        self._show_assets = tk.BooleanVar(value=False)
        self._errors     = []          # list of dicts for error panel
        self._selected_entry = None    # for detail inspector

        # ── Client logging (from grimveil) ────────────────────────────
        self._client_log_q       = queue.Queue()   # (level, message, extra)
        self._client_log_entries = []              # all received entries
        self._debug_q            = queue.Queue()   # debug snapshot dicts
        self._debug_snapshots    = []              # all received snapshots

        self.server = ServerManager(
            on_log=self._enqueue,
            on_state=self._on_state,
            on_client_log=self._client_log_q.put,
            on_debug_snapshot=self._debug_q.put,
        )

        self._build_ui()
        self._start_poll()

        self._log("Iron Company Server Manager ready.", "system")
        self._log(f"Default directory: {DEFAULT_DIR}", "info")
        self._log("Press  ▶ Start  to raise the fort.", "info")
        self._auto_detect()

    # ── Icon ──────────────────────────────────
    def _set_icon(self):
        try:
            icon = tk.PhotoImage(data="R0lGODlhEAAQAKEAAAAAAP///wAAAAAAACH5BAEAAAIALAAAAAAQABAAAAImlI+py+0Po5y02ouzPgT8D4biSJbmiabqyrbuC8fyTNf2jRsFADs=")
            self.iconphoto(True, icon)
        except Exception: pass

    # ── Auto-detect ───────────────────────────
    def _auto_detect(self):
        for c in [
            pathlib.Path(__file__).parent / "iron_company",
            pathlib.Path.cwd() / "iron_company",
            pathlib.Path(__file__).parent,
            pathlib.Path.cwd(),
        ]:
            if (c / "index.html").exists():
                self._dir_var.set(str(c))
                self._enqueue(f"[System] Auto-detected: {c}", "system")
                break

    # ─────────────────────────────────────────
    #  UI BUILD
    # ─────────────────────────────────────────

    def _build_ui(self):
        self._build_title_bar()
        self._build_control_row()
        self._build_stats_bar()

        # Notebook for Log / Errors / Inspector tabs
        nb_frame = tk.Frame(self, bg=C["bg"])
        nb_frame.pack(fill="both", expand=True, padx=10, pady=(4,0))

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
            style.configure("IC.TNotebook",              background=C["bg"],       borderwidth=0)
            style.configure("IC.TNotebook.Tab",          background=C["panel"],    foreground=C["text2"],
                            font=FONTS["body"],           padding=(10,4))
            style.map("IC.TNotebook.Tab",
                background=[("selected", C["btn_hover"])],
                foreground=[("selected", C["gold2"])])
            style.configure("Vertical.TScrollbar",
                background=C["border"],   troughcolor=C["log_bg"],
                arrowcolor=C["text2"],    bordercolor=C["bg"])
            style.configure("Horizontal.TScrollbar",
                background=C["border"],   troughcolor=C["log_bg"],
                arrowcolor=C["text2"],    bordercolor=C["bg"])
        except Exception: pass

        self._nb = ttk.Notebook(nb_frame, style="IC.TNotebook")
        self._nb.pack(fill="both", expand=True)

        self._build_log_tab()
        self._build_error_tab()
        self._build_inspector_tab()
        self._build_game_log_tab()
        self._build_client_debug_tab()
        self._build_bottom_bar()

    # ── Title bar ─────────────────────────────
    def _build_title_bar(self):
        bar = tk.Frame(self, bg=C["panel"])
        bar.pack(fill="x")
        tk.Frame(bar, bg=C["border"], height=1).pack(fill="x")
        inner = tk.Frame(bar, bg=C["panel"])
        inner.pack(fill="x", padx=14, pady=8)

        tk.Label(inner, text="Iron Company", font=FONTS["title"],
                 fg=C["gold2"], bg=C["panel"]).pack(side="left")
        tk.Label(inner, text="— Server Manager",
                 font=("Georgia", 9, "italic"), fg=C["text2"], bg=C["panel"]).pack(side="left", padx=8)

        # Status indicator (right side)
        sf = tk.Frame(inner, bg=C["panel"])
        sf.pack(side="right")
        self._ind = tk.Canvas(sf, width=14, height=14, bg=C["panel"], highlightthickness=0)
        self._ind.pack(side="left", padx=(0,6))
        self._draw_ind("off")
        self._status_lbl = tk.Label(sf, text="Offline", font=FONTS["body"],
                                     fg=C["text2"], bg=C["panel"])
        self._status_lbl.pack(side="left")
        tk.Frame(bar, bg=C["border"], height=1).pack(fill="x")

    # ── Control row ───────────────────────────
    def _build_control_row(self):
        row = tk.Frame(self, bg=C["bg"])
        row.pack(fill="x", padx=12, pady=(8,4))

        # Port
        tk.Label(row, text="Port", font=FONTS["label"],
                 fg=C["text2"], bg=C["bg"]).pack(side="left")
        self._port_var = tk.StringVar(value=str(DEFAULT_PORT))
        self._port_entry = tk.Entry(
            row, textvariable=self._port_var, width=6,
            bg=C["entry_bg"], fg=C["text"], insertbackground=C["gold"],
            relief="flat", font=FONTS["mono"],
            highlightthickness=1, highlightbackground=C["border"], highlightcolor=C["gold2"],
        )
        self._port_entry.pack(side="left", padx=(5,3))
        self._btn(row, "Auto", self._auto_port, w=5).pack(side="left", padx=(0,12))

        # Directory
        tk.Label(row, text="Directory", font=FONTS["label"],
                 fg=C["text2"], bg=C["bg"]).pack(side="left")
        self._dir_var = tk.StringVar(value=DEFAULT_DIR)
        self._dir_entry = tk.Entry(
            row, textvariable=self._dir_var, width=38,
            bg=C["entry_bg"], fg=C["text"], insertbackground=C["gold"],
            relief="flat", font=FONTS["mono_sm"],
            highlightthickness=1, highlightbackground=C["border"], highlightcolor=C["gold2"],
        )
        self._dir_entry.pack(side="left", padx=(5,5))
        self._btn(row, "Browse…", self._browse,   w=8).pack(side="left", padx=(0,14))

        # Open browser
        self._btn(row, "Open in Browser", self._open_browser, w=14).pack(side="right")

        # Start / Stop
        self._stop_btn  = self._btn(row, "■  Stop",  self._stop,  w=10, fg=C["red"],   state="disabled")
        self._stop_btn.pack(side="right", padx=(5,0))
        self._start_btn = self._btn(row, "▶  Start", self._start, w=10, fg=C["green"])
        self._start_btn.pack(side="right", padx=(0,5))

    # ── Stats bar ─────────────────────────────
    def _build_stats_bar(self):
        row = tk.Frame(self, bg=C["panel"])
        row.pack(fill="x", padx=10, pady=(0,4))
        tk.Frame(row, bg=C["border"], height=1).pack(fill="x")
        inner = tk.Frame(row, bg=C["panel"])
        inner.pack(fill="x", padx=8, pady=6)

        self._svars = {
            "requests": tk.StringVar(value="0"),
            "errors":   tk.StringVar(value="0"),
            "warnings": tk.StringVar(value="0"),
            "served":   tk.StringVar(value="0 B"),
            "uptime":   tk.StringVar(value="—"),
            "url":      tk.StringVar(value="—"),
        }

        stat_defs = [
            ("REQUESTS", "requests", C["text"]),
            ("ERRORS",   "errors",   C["red2"]),
            ("WARNINGS", "warnings", C["gold"]),
            ("SERVED",   "served",   C["blue"]),
            ("UPTIME",   "uptime",   C["text2"]),
            ("URL",      "url",      C["purple"]),
        ]
        for lbl, key, col in stat_defs:
            f = tk.Frame(inner, bg=C["panel"])
            f.pack(side="left", padx=12)
            tk.Label(f, text=lbl, font=FONTS["label"], fg=C["text2"], bg=C["panel"]).pack(anchor="w")
            tk.Label(f, textvariable=self._svars[key], font=FONTS["mono_lg"],
                     fg=col, bg=C["panel"]).pack(anchor="w")

        tk.Frame(row, bg=C["border"], height=1).pack(fill="x")

    # ── Log tab ───────────────────────────────
    def _build_log_tab(self):
        frame = tk.Frame(self._nb, bg=C["bg"])
        self._nb.add(frame, text=" Access Log ")

        # Toolbar: filter checkboxes + asset toggle
        tb = tk.Frame(frame, bg=C["panel"])
        tb.pack(fill="x")
        tk.Frame(tb, bg=C["border"], height=1).pack(fill="x")
        tb_inner = tk.Frame(tb, bg=C["panel"])
        tb_inner.pack(fill="x", padx=8, pady=5)

        tk.Label(tb_inner, text="Show:", font=FONTS["label"],
                 fg=C["text2"], bg=C["panel"]).pack(side="left", padx=(0,6))

        self._fvars = {
            "request": tk.BooleanVar(value=True),
            "error":   tk.BooleanVar(value=True),
            "warning": tk.BooleanVar(value=True),
            "info":    tk.BooleanVar(value=True),
            "system":  tk.BooleanVar(value=True),
        }
        for tag, lbl in [("request","Requests"),("error","Errors"),
                          ("warning","Warnings"),("system","System"),("info","Info")]:
            tk.Checkbutton(tb_inner, text=lbl, variable=self._fvars[tag],
                           font=FONTS["body"], fg=C["text"], bg=C["panel"],
                           activebackground=C["panel"], activeforeground=C["gold2"],
                           selectcolor=C["entry_bg"], bd=0, cursor="hand2",
                           command=self._refilter).pack(side="left", padx=4)

        tk.Label(tb_inner, text="  |", fg=C["border"], bg=C["panel"],
                 font=FONTS["body"]).pack(side="left")
        tk.Checkbutton(tb_inner, text="Assets", variable=self._show_assets,
                       font=FONTS["body"], fg=C["text2"], bg=C["panel"],
                       activebackground=C["panel"], activeforeground=C["gold2"],
                       selectcolor=C["entry_bg"], bd=0, cursor="hand2",
                       command=self._refilter).pack(side="left", padx=(6,0))
        tk.Frame(tb, bg=C["border"], height=1).pack(fill="x")

        # Column headers
        ch = tk.Frame(frame, bg=C["panel"])
        ch.pack(fill="x")
        ch_inner = tk.Frame(ch, bg=C["panel"])
        ch_inner.pack(fill="x", padx=8, pady=3)
        for hdr, w in [("TIME",8),("METHOD",8),("STATUS",7),("SIZE",9),("PATH",0)]:
            tk.Label(ch_inner, text=hdr, font=FONTS["mono_sm"],
                     fg=C["text2"], bg=C["panel"],
                     width=w, anchor="w").pack(side="left", padx=(2,0))
        tk.Frame(ch, bg=C["border"], height=1).pack(fill="x")

        # Text widget
        lf = tk.Frame(frame, bg=C["log_bg"])
        lf.pack(fill="both", expand=True)
        vs = ttk.Scrollbar(lf)
        vs.pack(side="right", fill="y")

        self._log_txt = tk.Text(
            lf, bg=C["log_bg"], fg=C["text"], font=FONTS["mono"],
            relief="flat", wrap="none", state="disabled",
            selectbackground=C["border"], selectforeground=C["gold2"],
            cursor="arrow", bd=0, padx=6, pady=4,
            yscrollcommand=vs.set,
        )
        self._log_txt.pack(side="left", fill="both", expand=True)
        vs.config(command=self._log_txt.yview)
        hs = ttk.Scrollbar(frame, orient="horizontal", command=self._log_txt.xview)
        hs.pack(fill="x")
        self._log_txt.config(xscrollcommand=hs.set)

        # Bind click for inspector
        self._log_txt.bind("<Button-1>", self._on_log_click)

        # Tags
        for tag, fg in [
            ("ts",      C["text2"]),
            ("method",  C["gold"]),
            ("s2xx",    C["green"]),
            ("s3xx",    C["text2"]),
            ("s4xx",    C["red2"]),
            ("s5xx",    "#c06040"),
            ("s_other", C["text2"]),
            ("size",    C["blue"]),
            ("path",    C["text"]),
            ("sys",     C["text2"]),
            ("sys_start", C["green"]),
            ("sys_stop",  C["red2"]),
            ("sys_warn",  C["gold"]),
            ("sys_err",   C["red2"]),
            ("hovered",   C["gold2"]),
        ]:
            self._log_txt.tag_configure(tag, foreground=fg)
        self._log_txt.tag_configure("hidden", elide=True)
        self._log_txt.tag_configure("row_selected", background="#241c08")

    # ── Error tab ─────────────────────────────
    def _build_error_tab(self):
        frame = tk.Frame(self._nb, bg=C["bg"])
        self._nb.add(frame, text=" Errors & Warnings  0 ")
        self._err_tab_frame = frame
        self._err_tab_idx   = 1   # notebook tab index

        top = tk.Frame(frame, bg=C["panel"])
        top.pack(fill="x")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")
        top_inner = tk.Frame(top, bg=C["panel"])
        top_inner.pack(fill="x", padx=8, pady=5)
        tk.Label(top_inner, text="HTTP errors, warnings, and system alerts.",
                 font=FONTS["label"], fg=C["text2"], bg=C["panel"]).pack(side="left")
        self._btn(top_inner, "Clear", self._clear_errors, w=7).pack(side="right")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")

        ef = tk.Frame(frame, bg=C["log_bg"])
        ef.pack(fill="both", expand=True)
        evs = ttk.Scrollbar(ef)
        evs.pack(side="right", fill="y")

        self._err_txt = tk.Text(
            ef, bg=C["log_bg"], fg=C["text"], font=FONTS["mono"],
            relief="flat", wrap="word", state="disabled",
            selectbackground=C["border"], selectforeground=C["gold2"],
            cursor="arrow", bd=0, padx=8, pady=6,
            yscrollcommand=evs.set,
        )
        self._err_txt.pack(fill="both", expand=True)
        evs.config(command=self._err_txt.yview)

        for tag, fg, extra in [
            ("err_ts",     C["text2"],   {}),
            ("err_status", C["red2"],    {"font": FONTS["mono_lg"]}),
            ("err_warn_s", C["gold"],    {"font": FONTS["mono_lg"]}),
            ("err_method", C["gold"],    {}),
            ("err_path",   C["text"],    {}),
            ("err_body",   C["text2"],   {"font": FONTS["mono_sm"]}),
            ("err_sep",    C["border"],  {}),
        ]:
            self._err_txt.tag_configure(tag, foreground=fg, **extra)

    # ── Inspector tab ─────────────────────────
    def _build_inspector_tab(self):
        frame = tk.Frame(self._nb, bg=C["bg"])
        self._nb.add(frame, text=" Request Inspector ")

        top = tk.Frame(frame, bg=C["panel"])
        top.pack(fill="x")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")
        ti = tk.Frame(top, bg=C["panel"])
        ti.pack(fill="x", padx=8, pady=5)
        tk.Label(ti, text="Click any row in the Access Log to inspect it here.",
                 font=FONTS["label"], fg=C["text2"], bg=C["panel"]).pack(side="left")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")

        self._insp_txt = scrolledtext.ScrolledText(
            frame, bg=C["log_bg"], fg=C["text"], font=FONTS["mono"],
            relief="flat", wrap="word", state="disabled",
            selectbackground=C["border"], selectforeground=C["gold2"],
            bd=0, padx=10, pady=8,
        )
        self._insp_txt.pack(fill="both", expand=True)

        for tag, fg, extra in [
            ("i_lbl",   C["text2"],  {"font": ("Consolas", 9, "bold")}),
            ("i_val",   C["text"],   {}),
            ("i_ok",    C["green"],  {"font": FONTS["mono_lg"]}),
            ("i_warn",  C["gold"],   {"font": FONTS["mono_lg"]}),
            ("i_err",   C["red2"],   {"font": FONTS["mono_lg"]}),
            ("i_path",  C["gold2"],  {"font": FONTS["mono"]}),
            ("i_hint",  C["text2"],  {"font": FONTS["mono_sm"], "lmargin1": 16, "lmargin2": 16}),
            ("i_sep",   C["border"], {}),
        ]:
            self._insp_txt.tag_configure(tag, foreground=fg, **extra)

        self._insp_entry_ref = None  # the LogEntry currently shown

    # ── Bottom bar ────────────────────────────
    def _build_bottom_bar(self):
        bar = tk.Frame(self, bg=C["panel"])
        bar.pack(fill="x", side="bottom")
        tk.Frame(bar, bg=C["border"], height=1).pack(fill="x")
        inner = tk.Frame(bar, bg=C["panel"])
        inner.pack(fill="x", padx=10, pady=6)

        self._btn(inner, "Export All",   self._export_all,  w=12, fg=C["purple"]).pack(side="left")
        self._btn(inner, "Export Log",   self._export,      w=12, fg=C["blue"]).pack(side="left", padx=6)
        self._btn(inner, "Clear Log",    self._clear_log,   w=10).pack(side="left", padx=6)
        self._btn(inner, "Copy URL",     self._copy_url,    w=10).pack(side="left", padx=6)

        self._count_var = tk.StringVar(value="0 entries")
        tk.Label(inner, textvariable=self._count_var, font=FONTS["mono_sm"],
                 fg=C["text2"], bg=C["panel"]).pack(side="right")


    # ── Game Log tab ─────────────────────────
    def _build_game_log_tab(self):
        """Displays in-game events forwarded from Iron Company's log() calls."""
        frame = tk.Frame(self._nb, bg=C["bg"])
        self._nb.add(frame, text=" Game Log ")

        top = tk.Frame(frame, bg=C["panel"])
        top.pack(fill="x")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")
        ti = tk.Frame(top, bg=C["panel"])
        ti.pack(fill="x", padx=8, pady=5)
        tk.Label(ti, text="In-game events forwarded from the browser. Requires clientLog.js to be loaded.",
                 font=FONTS["label"], fg=C["text2"], bg=C["panel"]).pack(side="left")
        self._btn(ti, "Export", self._export_game_log, w=8, fg=C["blue"]).pack(side="right", padx=4)
        self._btn(ti, "Clear",  self._clear_game_log,  w=7).pack(side="right", padx=4)
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")

        gf = tk.Frame(frame, bg=C["log_bg"])
        gf.pack(fill="both", expand=True)
        gvs = ttk.Scrollbar(gf)
        gvs.pack(side="right", fill="y")

        self._game_log_txt = tk.Text(
            gf, bg=C["log_bg"], fg=C["text"], font=FONTS["mono"],
            relief="flat", wrap="word", state="disabled",
            selectbackground=C["border"], selectforeground=C["gold2"],
            cursor="arrow", bd=0, padx=8, pady=6,
            yscrollcommand=gvs.set,
        )
        self._game_log_txt.pack(side="left", fill="both", expand=True)
        gvs.config(command=self._game_log_txt.yview)
        self._game_log_auto_scroll = tk.BooleanVar(value=True)

        for tag, color in [
            ("gl_ts",   C["text2"]),
            ("gl_good", C["green"]),
            ("gl_bad",  C["red"]),
            ("gl_gold", C["gold2"]),
            ("gl_info", C["text"]),
            ("gl_sys",  C["text2"]),
        ]:
            self._game_log_txt.tag_configure(tag, foreground=color)

    def _append_game_log(self, level: str, message: str):
        tag_map = {
            "good":   "gl_good",
            "bad":    "gl_bad",
            "gold":   "gl_gold",
            "info":   "gl_info",
            "system": "gl_sys",
        }
        tag = tag_map.get(level, "gl_info")
        ts  = now_ts()
        w   = self._game_log_txt
        w.config(state="normal")
        w.insert("end", f"[{ts}] ", "gl_ts")
        # Strip HTML tags for clean display
        import re as _re
        clean = _re.sub(r"<[^>]+>", "", message)
        w.insert("end", clean + "\n", tag)
        w.config(state="disabled")
        if self._game_log_auto_scroll.get():
            w.see("end")

    def _clear_game_log(self):
        w = self._game_log_txt
        w.config(state="normal")
        w.delete("1.0", "end")
        w.config(state="disabled")

    # ── Client Debug tab ─────────────────────
    def _build_client_debug_tab(self):
        """Full pipe: every console.log/warn/error plus debug snapshots."""
        frame = tk.Frame(self._nb, bg=C["bg"])
        self._nb.add(frame, text=" Client Debug ")

        top = tk.Frame(frame, bg=C["panel"])
        top.pack(fill="x")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")
        ti = tk.Frame(top, bg=C["panel"])
        ti.pack(fill="x", padx=8, pady=5)
        tk.Label(ti, text="All browser console output and debug snapshots.",
                 font=FONTS["label"], fg=C["text2"], bg=C["panel"]).pack(side="left")
        self._btn(ti, "Request State", self._request_debug_state, w=14, fg=C["blue"]).pack(side="right", padx=4)
        self._btn(ti, "Export",        self._export_debug_log,    w=8,  fg=C["purple"]).pack(side="right", padx=4)
        self._btn(ti, "Clear",         self._clear_debug_log,     w=7).pack(side="right", padx=4)
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x")

        df = tk.Frame(frame, bg=C["log_bg"])
        df.pack(fill="both", expand=True)
        dvs = ttk.Scrollbar(df)
        dvs.pack(side="right", fill="y")

        self._debug_txt = tk.Text(
            df, bg=C["log_bg"], fg=C["text"], font=FONTS["mono_sm"],
            relief="flat", wrap="word", state="disabled",
            selectbackground=C["border"], selectforeground=C["gold2"],
            cursor="arrow", bd=0, padx=8, pady=6,
            yscrollcommand=dvs.set,
        )
        self._debug_txt.pack(side="left", fill="both", expand=True)
        dvs.config(command=self._debug_txt.yview)
        self._debug_auto_scroll = tk.BooleanVar(value=True)

        for tag, color in [
            ("db_ts",       C["text2"]),
            ("db_log",      C["text"]),
            ("db_info",     C["blue"]),
            ("db_warn",     C["gold"]),
            ("db_error",    C["red2"]),
            ("db_snapshot", C["purple"]),
        ]:
            self._debug_txt.tag_configure(tag, foreground=color)

    def _append_debug_log_line(self, level: str, message: str, extra):
        tag_map = {
            "log":   "db_log",
            "info":  "db_info",
            "warn":  "db_warn",
            "error": "db_error",
        }
        tag = tag_map.get(level, "db_log")
        ts  = now_ts()
        w   = self._debug_txt
        w.config(state="normal")
        w.insert("end", f"[{ts}] ", "db_ts")
        w.insert("end", f"{level.upper()}: {message}\n", tag)
        if extra:
            w.insert("end", f"    extra: {extra}\n", "db_log")
        w.config(state="disabled")
        if self._debug_auto_scroll.get():
            w.see("end")

    def _append_debug_snapshot(self, data: dict):
        ts  = now_ts()
        w   = self._debug_txt
        w.config(state="normal")
        w.insert("end", f"[{ts}] ", "db_ts")
        w.insert("end", "SNAPSHOT\n", "db_snapshot")
        snippet = json.dumps(data, indent=2, default=str)[:1200]
        w.insert("end", snippet + "\n", "db_log")
        w.config(state="disabled")
        if self._debug_auto_scroll.get():
            w.see("end")

    def _clear_debug_log(self):
        self._client_log_entries.clear()
        self._debug_snapshots.clear()
        w = self._debug_txt
        w.config(state="normal")
        w.delete("1.0", "end")
        w.config(state="disabled")

    # ── Client error routing ─────────────────
    def _append_client_error_line(self, level: str, message: str, extra):
        """Route JS errors/warnings into the existing Errors & Warnings tab."""
        entry_str = f"[CLIENT {level.upper()}] {message}"
        if extra:
            entry_str += f"\n  extra: {extra}"
        self._errors.append({"kind": "line", "ts": now_ts(), "text": entry_str, "tag": "error"})
        self._update_err_tab_title()
        w = self._err_txt
        w.config(state="normal")
        t = "err_status" if level == "error" else "err_warn_s"
        w.insert("end", f"\n{now_ts()}  ", "err_ts")
        w.insert("end", entry_str + "\n", t)
        w.insert("end", "─" * 60 + "\n", "err_sep")
        w.config(state="disabled")
        w.see("end")

    # ── Export functions ──────────────────────
    def _export_game_log(self):
        name = f"iron_company_game_log_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path = filedialog.asksaveasfilename(
            title="Export Game Log", initialfile=name,
            defaultextension=".txt", filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Game Log\n")
                f.write(f"Exported: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n")
                f.write("─" * 72 + "\n\n")
                import re as _re
                for level, message, _extra in self._client_log_entries:
                    if level in ("good", "bad", "gold", "info", "system"):
                        clean = _re.sub(r"<[^>]+>", "", message)
                        f.write(f"[{level.upper()}] {clean}\n")
            self._log(f"[System] Game log exported → {path}", "system")
        except Exception as ex:
            messagebox.showerror("Export Failed", str(ex))

    def _export_debug_log(self):
        name = f"iron_company_debug_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path = filedialog.asksaveasfilename(
            title="Export Client Debug Log", initialfile=name,
            defaultextension=".txt", filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Client Debug Log\n")
                f.write(f"Exported: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n")
                f.write("─" * 72 + "\n\n")
                for level, message, extra in self._client_log_entries:
                    f.write(f"[{level.upper()}] {message}\n")
                    if extra:
                        f.write(f"  extra: {extra}\n")
                for snap in self._debug_snapshots:
                    f.write("\n--- SNAPSHOT ---\n")
                    json.dump(snap, f, indent=2, default=str)
                    f.write("\n---\n")
            self._log(f"[System] Debug log exported → {path}", "system")
        except Exception as ex:
            messagebox.showerror("Export Failed", str(ex))

    def _export_errors_file(self):
        """Export all errors/warnings (HTTP + client JS) to a file."""
        name = f"iron_company_errors_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path = filedialog.asksaveasfilename(
            title="Export Error Log", initialfile=name,
            defaultextension=".txt", filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Error Log\n")
                f.write(f"Exported: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n")
                f.write("─" * 72 + "\n\n")
                for err in self._errors:
                    if err.get("kind") == "http":
                        e = err["entry"]
                        f.write(f"{e.ts}  {e.method:<8} {e.status:<6}  {e.path}\n")
                    else:
                        f.write(err.get("text", "") + "\n")
            self._log(f"[System] Error log exported → {path}", "system")
        except Exception as ex:
            messagebox.showerror("Export Failed", str(ex))

    def _export_all(self):
        """Export all tabs into separate timestamped files in a chosen directory."""
        dir_path = filedialog.askdirectory(title="Select directory for export", parent=self)
        if not dir_path:
            return
        ts   = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        base = f"iron_company_{ts}"
        try:
            # Access log
            al_path = os.path.join(dir_path, f"{base}_access_log.txt")
            with open(al_path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Access Log\n")
                f.write(f"Exported: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n")
                f.write("─" * 72 + "\n\n")
                for rec in self._log_store:
                    if rec[0] == "entry":
                        e = rec[1]
                        f.write(f"{e.ts}  {e.method:<8} {e.status:<6}  {e.size:<10}  {e.path}\n")
                    else:
                        _, tts, text, _ = rec
                        f.write(f"[{tts}]  {text}\n")

            # Game log
            import re as _re
            gl_path = os.path.join(dir_path, f"{base}_game_log.txt")
            with open(gl_path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Game Log\n\n")
                for level, message, _extra in self._client_log_entries:
                    if level in ("good", "bad", "gold", "info", "system"):
                        clean = _re.sub(r"<[^>]+>", "", message)
                        f.write(f"[{level.upper()}] {clean}\n")

            # Client debug
            cd_path = os.path.join(dir_path, f"{base}_client_debug.txt")
            with open(cd_path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Client Debug Log\n\n")
                for level, message, extra in self._client_log_entries:
                    f.write(f"[{level.upper()}] {message}\n")
                    if extra:
                        f.write(f"  extra: {extra}\n")
                for snap in self._debug_snapshots:
                    f.write("\n--- SNAPSHOT ---\n")
                    json.dump(snap, f, indent=2, default=str)
                    f.write("\n---\n")

            # Errors
            er_path = os.path.join(dir_path, f"{base}_errors.txt")
            with open(er_path, "w", encoding="utf-8") as f:
                f.write("Iron Company — Error Log\n\n")
                for err in self._errors:
                    if err.get("kind") == "http":
                        e = err["entry"]
                        f.write(f"{e.ts}  {e.method:<8} {e.status:<6}  {e.path}\n")
                    else:
                        f.write(err.get("text", "") + "\n")

            self._log(f"[System] All logs exported to {dir_path}", "system")
            messagebox.showinfo("Export Complete",
                f"Four files written to:\n{dir_path}\n\n"
                f"  {base}_access_log.txt\n"
                f"  {base}_game_log.txt\n"
                f"  {base}_client_debug.txt\n"
                f"  {base}_errors.txt",
                parent=self)
        except Exception as ex:
            messagebox.showerror("Export Failed", str(ex))


    # ─────────────────────────────────────────
    #  WIDGET HELPERS
    # ─────────────────────────────────────────

    def _btn(self, parent, text, cmd, w=None, fg=None, state="normal"):
        b = tk.Button(
            parent, text=text, command=cmd,
            bg=C["btn_bg"], fg=fg or C["text"],
            activebackground=C["btn_hover"], activeforeground=C["gold2"],
            relief="flat", bd=0, cursor="hand2",
            font=FONTS["body"], state=state,
            padx=8, pady=4,
        )
        if w: b.config(width=w)
        b.bind("<Enter>", lambda e: b.config(bg=C["btn_hover"]) if b["state"]!="disabled" else None)
        b.bind("<Leave>", lambda e: b.config(bg=C["btn_bg"]))
        return b

    def _draw_ind(self, state):
        self._ind.delete("all")
        col = {"on": C["ind_on"], "off": C["ind_off"],
               "starting": C["ind_wait"], "stopping": C["ind_wait"]}.get(state, C["ind_off"])
        self._ind.create_oval(2,2,12,12, fill=col, outline="")

    # ─────────────────────────────────────────
    #  LOG QUEUE / APPEND
    # ─────────────────────────────────────────

    def _enqueue(self, item, tag="info"):
        self._q.put((item, tag))

    def _start_poll(self):
        self._poll()
        self._poll_client_log()
        self._poll_client_debug()

    def _poll(self):
        try:
            while True:
                item, tag = self._q.get_nowait()
                if isinstance(item, LogEntry):
                    self._append_entry(item)
                else:
                    self._log(str(item), tag or "info")
        except queue.Empty:
            pass
        # Live stat updates
        if self.server.running:
            self._svars["uptime"].set(self.server.uptime())
            self._svars["served"].set(fmt_bytes(self.server.bytes_out))
        self.after(100, self._poll)

    def _poll_client_log(self):
        """Drain the client log queue (console overrides + game events)."""
        try:
            while True:
                level, message, extra = self._client_log_q.get_nowait()
                self._on_client_log(level, message, extra)
        except queue.Empty:
            pass
        self.after(80, self._poll_client_log)

    def _poll_client_debug(self):
        """Drain the debug snapshot queue."""
        try:
            while True:
                data = self._debug_q.get_nowait()
                self._on_debug_snapshot(data)
        except queue.Empty:
            pass
        self.after(80, self._poll_client_debug)

    def _on_client_log(self, level: str, message: str, extra):
        """Route an incoming client log entry to the right panels."""
        self._client_log_entries.append((level, message, extra))
        # Game Log tab — in-game events only
        if level in ("good", "bad", "gold", "info", "system"):
            self._append_game_log(level, message)
        # Errors tab — JS errors and warnings
        if level in ("error", "warn"):
            self._append_client_error_line(level, message, extra)
        # Client Debug tab — everything
        self._append_debug_log_line(level, message, extra)

    def _on_debug_snapshot(self, data: dict):
        """Receive and display a full debug snapshot."""
        self._debug_snapshots.append(data)
        self._append_debug_snapshot(data)

    def _request_debug_state(self):
        """Ask the browser to send a fresh debug snapshot."""
        if self.server.running:
            self.server.request_debug()
            self._log("[System] Requested client debug snapshot.", "system")

    def _append_entry(self, e: LogEntry):
        # Asset filter
        if not self._show_assets.get():
            ext = e.path.split("?")[0].rsplit(".",1)[-1].lower()
            if ext in ("png","jpg","jpeg","gif","ico","svg","woff","woff2","ttf","webp","css"):
                return

        # Status tag
        if   e.status.startswith("2"): st = "s2xx"
        elif e.status.startswith("3"): st = "s3xx"
        elif e.status.startswith("4"): st = "s4xx"
        elif e.status.startswith("5"): st = "s5xx"
        else:                           st = "s_other"

        # Counters
        cnt = int(self._svars["requests"].get()); self._svars["requests"].set(str(cnt+1))
        if e.status.startswith(("4","5")):
            ec = int(self._svars["errors"].get()); self._svars["errors"].set(str(ec+1))

        rec = ("entry", e, st)
        self._log_store.append(rec)
        self._trim_store()
        self._write_entry(e, st, show=self._fvars["request"].get())
        self._count_var.set(f"{len(self._log_store)} entries")

        # Mirror errors to error tab
        if e.status.startswith(("4","5")):
            self._add_error_entry(e)

    def _write_entry(self, e: LogEntry, st: str, show=True):
        w = self._log_txt
        w.config(state="normal")
        vis = "request" if show else "hidden"
        w.insert("end", f"  {e.ts}  ",          ("ts",     vis))
        w.insert("end", f"{e.method:<8}",        ("method", vis))
        w.insert("end", f"{e.status:<8}",        (st,       vis))
        w.insert("end", f"{e.size:<11}",         ("size",   vis))
        w.insert("end", f"{e.path}\n",           ("path",   vis))
        w.config(state="disabled")
        w.see("end")

    def _log(self, text, tag="info"):
        ts = now_ts()
        rec = ("line", ts, text, tag)
        self._log_store.append(rec)
        self._trim_store()

        # Counters
        if tag == "error":
            ec = int(self._svars["errors"].get()); self._svars["errors"].set(str(ec+1))
        elif tag == "warning":
            wc = int(self._svars["warnings"].get()); self._svars["warnings"].set(str(wc+1))

        show = self._fvars.get(tag, tk.BooleanVar(value=True)).get()
        self._write_line(ts, text, tag, show)
        self._count_var.set(f"{len(self._log_store)} entries")

        # Mirror warnings/errors to error tab
        if tag in ("error", "warning"):
            self._add_error_line(ts, text, tag)

    def _write_line(self, ts, text, tag, show):
        sys_tag_map = {
            "start":   "sys_start",
            "stop":    "sys_stop",
            "warning": "sys_warn",
            "error":   "sys_err",
        }
        rt = sys_tag_map.get(tag, "sys")
        vis = tag if show else "hidden"
        w = self._log_txt
        w.config(state="normal")
        w.insert("end", f"  [{ts}]  ", ("ts", vis))
        w.insert("end", text + "\n",   (rt,  vis))
        w.config(state="disabled")
        w.see("end")

    def _trim_store(self):
        if len(self._log_store) > LOG_MAX:
            self._log_store = self._log_store[-LOG_MAX:]

    # ── Error tab ─────────────────────────────
    def _add_error_entry(self, e: LogEntry):
        self._errors.append({"kind": "http", "entry": e})
        self._update_err_tab_title()
        w = self._err_txt
        w.config(state="normal")
        is_5xx = e.status.startswith("5")
        st_tag = "err_status" if is_5xx else "err_warn_s"
        w.insert("end", f"\n{e.ts}  ", "err_ts")
        w.insert("end", f"{e.status} ", st_tag)
        w.insert("end", f"{e.method}  ", "err_method")
        w.insert("end", e.path + "\n", "err_path")
        if is_5xx:
            w.insert("end", "  → Server-side error. Check that all data/ JSON files are valid.\n", "err_body")
        elif e.status == "404":
            w.insert("end", f"  → File not found: {e.path}\n", "err_body")
            w.insert("end", f"     Check the path exists under: {self.server.root_dir}\n", "err_body")
        w.insert("end", "─"*60 + "\n", "err_sep")
        w.config(state="disabled")
        w.see("end")

    def _add_error_line(self, ts, text, tag):
        self._errors.append({"kind": "line", "ts": ts, "text": text, "tag": tag})
        self._update_err_tab_title()
        w = self._err_txt
        w.config(state="normal")
        t = "err_status" if tag == "error" else "err_warn_s"
        w.insert("end", f"\n{ts}  ", "err_ts")
        w.insert("end", text + "\n", t)
        w.insert("end", "─"*60 + "\n", "err_sep")
        w.config(state="disabled")
        w.see("end")

    def _update_err_tab_title(self):
        count = len(self._errors)
        self._nb.tab(self._err_tab_idx, text=f" Errors & Warnings  {count} ")

    def _clear_errors(self):
        self._errors.clear()
        self._err_txt.config(state="normal")
        self._err_txt.delete("1.0","end")
        self._err_txt.config(state="disabled")
        self._update_err_tab_title()

    # ── Inspector ─────────────────────────────
    def _on_log_click(self, event):
        """When a row in the access log is clicked, show details in Inspector."""
        w = self._log_txt
        idx = w.index(f"@{event.x},{event.y}")
        line_no = int(idx.split(".")[0])

        # Match line number to log_store entry records
        entry_lines = [r for r in self._log_store if r[0] == "entry"]
        # Account for the fact that filtered entries may not be rendered
        # Use a simpler approach: find the n-th visible entry line
        visible = 0
        for r in self._log_store:
            if r[0] != "entry": continue
            if not self._show_assets.get():
                ext = r[1].path.split("?")[0].rsplit(".",1)[-1].lower()
                if ext in ("png","jpg","jpeg","gif","ico","svg","woff","woff2","ttf","webp","css"):
                    continue
            visible += 1
            if visible == line_no:
                self._show_inspector(r[1])
                break

    def _show_inspector(self, e: LogEntry):
        self._insp_entry_ref = e
        w = self._insp_txt
        w.config(state="normal")
        w.delete("1.0","end")

        # Status interpretation
        STATUS_MEANINGS = {
            "200": ("OK", "i_ok",   "Request succeeded."),
            "206": ("Partial", "i_ok", "Partial content served (range request)."),
            "301": ("Moved", "i_warn","Resource permanently redirected."),
            "302": ("Found", "i_warn","Resource temporarily redirected."),
            "304": ("Not Modified", "i_warn",
                    "Stale cache hit — this should not happen with no-store headers active.\n"
                    "  Hard-refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)."),
            "400": ("Bad Request",  "i_err", "Malformed request from the browser."),
            "403": ("Forbidden",    "i_err", "Server refused to serve this path."),
            "404": ("Not Found",    "i_err",
                    "The file does not exist at the requested path.\n"
                    "  Verify the file exists under the serve directory."),
            "500": ("Server Error", "i_err",
                    "Internal server error. Usually a broken JSON file or missing data.\n"
                    "  Check data/ files for syntax errors."),
            "503": ("Unavailable",  "i_err", "Server temporarily unavailable."),
        }
        meaning, st_tag, hint = STATUS_MEANINGS.get(
            e.status, (f"HTTP {e.status}", "i_warn", "Consult the HTTP specification for this status code."))

        w.insert("end", "\n")
        w.insert("end", f"  {e.status} {meaning}\n", st_tag)
        w.insert("end", "\n")

        for lbl, val in [
            ("Time",    e.ts),
            ("Method",  e.method),
            ("Path",    e.path),
            ("Status",  f"{e.status} — {meaning}"),
            ("Size",    e.size),
        ]:
            w.insert("end", f"  {lbl:<10}", "i_lbl")
            tag = "i_path" if lbl == "Path" else "i_val"
            w.insert("end", f"{val}\n", tag)

        w.insert("end", "\n")
        w.insert("end", "  What this means\n", "i_lbl")
        w.insert("end", f"  {hint}\n", "i_hint")

        # Path hints for 404s
        if e.status == "404":
            w.insert("end", "\n")
            w.insert("end", "  Common causes\n", "i_lbl")
            for tip in [
                "Typo in a fetch() path in JS or JSON file.",
                "File not present in the serve directory.",
                "Case mismatch on a case-sensitive OS.",
                "Missing data/ file listed in data.js.",
            ]:
                w.insert("end", f"  • {tip}\n", "i_hint")

        w.insert("end", "\n" + "─"*50 + "\n", "i_sep")
        w.insert("end", "  Raw log line\n", "i_lbl")
        w.insert("end", f"  {e.raw}\n", "i_hint")

        w.config(state="disabled")
        # Switch to inspector tab
        self._nb.select(2)

    # ─────────────────────────────────────────
    #  FILTER / REFILTER
    # ─────────────────────────────────────────

    def _refilter(self):
        w = self._log_txt
        w.config(state="normal")
        w.delete("1.0","end")
        w.config(state="disabled")
        for rec in self._log_store:
            if rec[0] == "entry":
                _, e, st = rec
                if not self._show_assets.get():
                    ext = e.path.split("?")[0].rsplit(".",1)[-1].lower()
                    if ext in ("png","jpg","jpeg","gif","ico","svg","woff","woff2","ttf","webp","css"):
                        continue
                self._write_entry(e, st, show=self._fvars["request"].get())
            else:
                _, ts, text, tag = rec
                show = self._fvars.get(tag, tk.BooleanVar(value=True)).get()
                self._write_line(ts, text, tag, show)

    # ─────────────────────────────────────────
    #  STATE CHANGE
    # ─────────────────────────────────────────

    def _on_state(self, state):
        self.after(0, self._apply_state, state)

    def _apply_state(self, state):
        labels = {"off":"Offline","starting":"Starting…","on":"Online","stopping":"Stopping…"}
        colors  = {"on": C["green"], "off": C["red2"],
                   "starting": C["gold"], "stopping": C["gold"]}
        self._draw_ind(state)
        self._status_lbl.config(text=labels.get(state, state),
                                 fg=colors.get(state, C["text2"]))
        if state == "on":
            self._start_btn.config(state="disabled")
            self._stop_btn.config(state="normal")
            self._port_entry.config(state="disabled")
            self._dir_entry.config(state="disabled")
            port = self._port_var.get()
            self._svars["url"].set(f"http://127.0.0.1:{port}")
        elif state == "off":
            self._start_btn.config(state="normal")
            self._stop_btn.config(state="disabled")
            self._port_entry.config(state="normal")
            self._dir_entry.config(state="normal")
            self._svars["uptime"].set("—")
            self._svars["url"].set("—")
        else:
            self._start_btn.config(state="disabled")
            self._stop_btn.config(state="disabled")

    # ─────────────────────────────────────────
    #  ACTIONS
    # ─────────────────────────────────────────

    def _start(self):
        ps = self._port_var.get().strip()
        try:
            port = int(ps)
            if not (1 <= port <= 65535): raise ValueError
        except ValueError:
            messagebox.showerror("Invalid Port", f"'{ps}' is not a valid port (1–65535).")
            return
        d = self._dir_var.get().strip()
        if not os.path.isdir(d):
            messagebox.showerror("Invalid Directory", f"Directory not found:\n{d}")
            return
        for k in ("requests","errors","warnings"):
            self._svars[k].set("0")
        self._svars["served"].set("0 B")
        self.server.start(port, d)

    def _stop(self):
        threading.Thread(target=self.server.stop, daemon=True).start()

    def _browse(self):
        d = filedialog.askdirectory(title="Select Iron Company directory",
                                    initialdir=self._dir_var.get())
        if d: self._dir_var.set(d)

    def _auto_port(self):
        p = find_free_port()
        self._port_var.set(str(p))
        self._enqueue(f"[System] Auto-selected free port: {p}", "system")

    def _open_browser(self):
        url = f"http://127.0.0.1:{self._port_var.get()}"
        webbrowser.open(url)
        self._enqueue(f"[System] Opened browser → {url}", "system")

    def _copy_url(self):
        url = f"http://127.0.0.1:{self._port_var.get()}"
        self.clipboard_clear()
        self.clipboard_append(url)
        self._enqueue(f"[System] Copied to clipboard: {url}", "system")

    def _export(self):
        if not self._log_store:
            messagebox.showinfo("Nothing to export","The chronicle is empty.")
            return
        name = f"iron_company_log_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path = filedialog.asksaveasfilename(
            title="Export Activity Chronicle", initialfile=name,
            defaultextension=".txt", filetypes=[("Text","*.txt"),("All","*.*")])
        if not path: return
        try:
            n = 0
            with open(path,"w",encoding="utf-8") as f:
                f.write("Iron Company — Activity Chronicle\n")
                f.write(f"Exported: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Directory: {self._dir_var.get()}\n")
                f.write(f"Port: {self._port_var.get()}\n")
                f.write("─"*72+"\n\n")
                for rec in self._log_store:
                    if rec[0] == "entry":
                        e = rec[1]
                        f.write(f"{e.ts}  {e.method:<8} {e.status:<8} {e.size:<11}  {e.path}\n"); n+=1
                    else:
                        _, ts, text, tag = rec
                        f.write(f"[{ts}]  {text}\n"); n+=1
                f.write(f"\n{'─'*72}\nTotal: {n} lines\n")
            self._enqueue(f"[System] Exported {n} lines → {path}", "system")
        except Exception as ex:
            messagebox.showerror("Export Failed", str(ex))

    def _clear_log(self):
        if not self._log_store: return
        if messagebox.askyesno("Clear Log","Erase the activity log? This cannot be undone."):
            self._log_store.clear()
            self._log_txt.config(state="normal")
            self._log_txt.delete("1.0","end")
            self._log_txt.config(state="disabled")
            for k in ("requests","errors","warnings"):
                self._svars[k].set("0")
            self._svars["served"].set("0 B")
            self._count_var.set("0 entries")
            self._log("[System] Log cleared.", "system")

    # ── Close ─────────────────────────────────
    def on_close(self):
        if self.server.state in ("on","starting"):
            if messagebox.askyesno("Server Running","The server is still running.\nStop it and exit?"):
                self.server.stop()
                self.destroy()
        else:
            self.destroy()


# ─────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    app = App()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()
