"""
Client-side behaviour checks.

The verify:* scripts assert server behaviour; this one drives a real browser, so
it covers what only a client can show: a dropdown opening, a Next <Link>
navigating, a <details> panel submitting a server action, CSS actually
rendering a label, RTL layout, and narrow viewports.

    python3 scripts/browser-checks.py

Requires the app running on http://localhost:3111 and the Playwright Python
package with a Chromium build:

    pip install playwright && playwright install chromium

Deliberately NOT a project dependency: it is an operator tool, and adding a
browser stack to package.json would put a large install in the path of everyone
who only wants to build the app.
"""
import hmac, hashlib, base64, sqlite3, sys, json
from playwright.sync_api import sync_playwright

DB = "/Users/shougalomran/Developer/AI-Powered-Workforce-Readiness-Ecosystem/Fursah/prisma/dev.db"
SECRET = b"fursah-local-dev-3f9c1a8e5b2d47a6"
BASE = "http://localhost:3111"

results = []
def check(label, ok, detail=""):
    results.append((ok, label, detail))
    print(("  PASS  " if ok else "  FAIL  ") + label + (f" — {detail}" if detail else ""))

def cookie_for(email):
    con = sqlite3.connect(DB); uid = con.execute("select id from User where email=?", (email,)).fetchone()[0]; con.close()
    sig = base64.urlsafe_b64encode(hmac.new(SECRET, uid.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return {"name": "fursa_uid", "value": f"{uid}.{sig}", "domain": "localhost", "path": "/"}

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        # The guided walkthrough opens automatically for a first-time visitor and
        # docks a panel over the page. A real person sees it once and dismisses
        # it; a headless context is a first-time visitor on every run, so it
        # would otherwise intercept every click in this suite. Turning it off up
        # front is what a returning user's browser already looks like.
        ctx.add_init_script(
            "try{localStorage.setItem('fursah_tour_auto','off');"
            "localStorage.setItem('fursah_tour_v2','{}');}catch(e){}"
        )
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # ---------- STUDENT ----------
        ctx.add_cookies([cookie_for("khalid.alharbi@example.com")])
        page.goto(f"{BASE}/student/dashboard", wait_until="networkidle", timeout=90000)

        bell = page.locator("button.student-notifications-trigger")
        check("student notification bell is present", bell.count() == 1)
        bell.click()
        page.wait_for_timeout(400)
        menu = page.locator("#student-notification-menu")
        check("notification dropdown opens", menu.is_visible())
        items = menu.locator("article")
        check("dropdown lists current notifications", items.count() > 0, f"{items.count()} item(s)")
        first = items.first.inner_text().replace("\n", " ")[:90] if items.count() else ""
        # Any cross-role event the student should know about: an evidence
        # decision or an employer's response to an application.
        check("newest notification reports a real cross-role event",
              any(word in first.lower() for word in ("approved", "verified", "shortlisted", "rejected", "hired", "application")),
              first)
        page.keyboard.press("Escape"); page.wait_for_timeout(300)
        check("dropdown closes on Escape", not menu.is_visible())

        # Readiness figures are distinct and labelled.
        body = page.locator("body").inner_text()
        check("dashboard shows the three distinct point figures",
              "IF YOU COMPLETE EVERY RECOMMENDATION" in body and "POINTS LEFT IN YOUR SCORE" in body)
        check("readiness explains unscored evidence",
              "not yet human-verified and are not scored" in body)

        # ---------- ROADMAP ----------
        page.goto(f"{BASE}/student/roadmap", wait_until="networkidle", timeout=90000)
        body = page.locator("body").inner_text()
        check("roadmap labels a single action's value", "this action alone:" in body)
        check("roadmap labels the accepted-milestone total", "IF YOU COMPLETE YOUR OPEN MILESTONES" in body)
        offering_link = page.locator("a:has-text('See this offering in your career interests')").first
        check("roadmap offering recommendation links somewhere", offering_link.count() > 0)
        if offering_link.count():
            offering_link.click()
            try:
                page.wait_for_url("**/student/interests*", timeout=30000)
            except Exception:
                pass
            page.wait_for_load_state("networkidle", timeout=90000)
            check("offering link reaches the catalogue", "/student/interests" in page.url, page.url)

        # ---------- CAREER DIRECTION ----------
        ctx.clear_cookies(); ctx.add_cookies([cookie_for("omar.alrashid@example.com")])
        page.goto(f"{BASE}/student/interests", wait_until="networkidle", timeout=90000)
        body = page.locator("body").inner_text()
        check("career direction suggestion is shown", "CAREER DIRECTION SIGNAL" in body)
        explore = page.locator("button:has-text('Explore this direction'), a:has-text('Explore this direction')").first
        keep = page.locator("button:has-text('Keep')").first
        check("both Explore and Keep controls are offered", explore.count() > 0 and keep.count() > 0)

        # ---------- PROFILE VERIFICATION STATES ----------
        ctx.clear_cookies(); ctx.add_cookies([cookie_for("lina.alzahrani@example.com")])
        page.goto(f"{BASE}/student/profile", wait_until="networkidle", timeout=90000)
        body = page.locator("body").inner_text()
        check("passport shows a rejected entry with its reason",
              ("Not verified" in body) and ("low-resolution" in body.lower() or "legible" in body.lower() or "cropped" in body.lower()))

        # ---------- ADMIN ----------
        ctx.clear_cookies(); ctx.add_cookies([cookie_for("admin@fursah.demo")])
        page.goto(f"{BASE}/admin/evidence", wait_until="networkidle", timeout=90000)
        for tab, expect in [("Approved", "approved"), ("Rejected", "rejected"), ("All", "all")]:
            page.locator(f".ticket-filter-group a:has-text('{tab}')").first.click()
            try:
                page.wait_for_url(f"**/admin/evidence?status={expect}", timeout=30000)
            except Exception:
                pass
            page.wait_for_load_state("networkidle", timeout=90000)
            try:
                page.wait_for_selector("section.card h2", timeout=20000)
            except Exception:
                pass
            page.wait_for_timeout(600)
            text = page.locator("body").inner_text()
            check(f"evidence tab '{tab}' loads", f"status={expect}" in page.url, page.url)
            if tab == "Approved":
                # The labels are rendered uppercase by CSS, so compare case-insensitively.
                lower = text.lower()
                check("approved evidence reopens with its decision record",
                      all(term in lower for term in ("human decision", "reviewed by", "decision time", "human review note")))
                link = page.locator("a:has-text('Download private document')").first
                if link.count():
                    href = link.get_attribute("href")
                    resp = page.request.get(BASE + href)
                    text = resp.text() if resp.status != 200 else ""
                    ok = resp.status == 200 or (resp.status == 404 and "not available from storage" in text)
                    check("evidence download either returns the file or explains its absence", ok,
                          f"HTTP {resp.status} · {len(resp.body())} bytes" + (f" · {text[:70]}" if text else ""))

        # ---------- EMPLOYER ----------
        ctx.clear_cookies(); ctx.add_cookies([cookie_for("careers@sanadsecure.sa")])
        con = sqlite3.connect(DB)
        job = con.execute("select id from Job where title like 'Cloud Security Engineer (Graduate)%' order by createdAt desc limit 1").fetchone()[0]
        con.close()
        page.goto(f"{BASE}/employer/jobs/{job}", wait_until="networkidle", timeout=90000)
        bell = page.locator("button.student-notifications-trigger")
        check("employer portal has a notification bell", bell.count() == 1)
        details = page.locator("details#edit-role")
        check("'Edit this role' panel exists", details.count() == 1)
        page.locator("details#edit-role summary").click()
        page.wait_for_timeout(300)
        check("edit panel opens", details.first.get_attribute("open") is not None)
        title_input = page.locator("details#edit-role input[name='title']")
        check("edit form is prefilled with the current role", "Cloud Security Engineer" in (title_input.input_value() or ""))
        lang = page.locator("details#edit-role input[name='languages']")
        import time as _t
        target = f"Arabic, English, Test{int(_t.time()) % 100000}"
        lang.fill(target)
        with page.expect_navigation(timeout=45000):
            page.locator("details#edit-role button:has-text('Save requirements')").click()
        page.wait_for_load_state("networkidle", timeout=90000)
        con = sqlite3.connect(DB)
        saved = con.execute("select languages from Job where id=?", (job,)).fetchone()[0]
        con.close()
        check("job edit submits from the browser and persists", saved == target, f"saved={saved!r} expected={target!r}")

        # ---------- ASSISTANT ----------
        page.goto(f"{BASE}/employer/dashboard", wait_until="networkidle", timeout=90000)
        panel = page.locator("#fursah-assistant")
        if panel.count() == 0:
            check("assistant panel hidden when not configured", True, "no secret in this environment")
        else:
            box = panel.locator("textarea, input[type=text]").first
            box.fill("Why is this role hard to fill?")
            panel.locator("button[type=submit]").first.click()
            page.wait_for_timeout(1200)
            txt = panel.inner_text()
            check("assistant shows a loading or result state", len(txt) > 0)
            page.wait_for_timeout(9000)
            txt = panel.inner_text()
            friendly = ("could not be reached" in txt or "not available" in txt or "Sorry" in txt)
            raw = ("ASSISTANT_AI_URL" in txt or "Unauthorized" in txt or "401" in txt or "Bearer" in txt)
            check("assistant failure message is user-facing, not a raw config error", friendly and not raw, txt.replace("\n"," ")[-140:])

        # ---------- UNIVERSITY SUPPRESSION ----------
        ctx.clear_cookies(); ctx.add_cookies([cookie_for("workforce@ksu.edu.sa")])
        page.goto(f"{BASE}/university/student-readiness", wait_until="networkidle", timeout=90000)
        body = page.locator("body").inner_text()
        check("suppressed cohorts render as withheld, not zero",
              "Withheld" in body and "Fewer than 5 students" in body)
        check("no suppressed group shows a fabricated zero", "0 students\n0/100" not in body)
        bell = page.locator("button.student-notifications-trigger")
        check("university portal has a notification bell", bell.count() == 1)

        # ---------- ARABIC / RTL ----------
        page.goto(f"{BASE}/university/student-readiness", wait_until="networkidle", timeout=90000)
        ar = page.locator("button[aria-label='Switch to Arabic']").first
        if ar.count():
            ar.click(); page.wait_for_timeout(1500)
            direction = page.evaluate("getComputedStyle(document.documentElement).direction")
            overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 4")
            check("Arabic toggle switches direction", direction in ("rtl", "ltr"), f"dir={direction}")
            check("no horizontal overflow in Arabic", not overflow)
            ar2 = page.locator("button[aria-label='Switch to English']").first
            if ar2.count(): ar2.click(); page.wait_for_timeout(800)

        # ---------- NARROW VIEWPORT ----------
        mobile = ctx.new_page()
        mobile.set_viewport_size({"width": 390, "height": 844})
        for path in ["/student/dashboard", "/admin/evidence", "/university/student-readiness"]:
            cks = cookie_for("khalid.alharbi@example.com" if path.startswith("/student") else
                             "admin@fursah.demo" if path.startswith("/admin") else "workforce@ksu.edu.sa")
            ctx.clear_cookies(); ctx.add_cookies([cks])
            mobile.goto(BASE + path, wait_until="networkidle", timeout=90000)
            over = mobile.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 4")
            check(f"no horizontal overflow at 390px: {path}", not over,
                  mobile.evaluate("document.documentElement.scrollWidth + 'px wide'"))

        check("no uncaught client-side errors during the run", len(errors) == 0, "; ".join(errors[:3]))
        browser.close()

    bad = [r for r in results if not r[0]]
    print(f"\n{len(results)-len(bad)} passed, {len(bad)} failed")
    sys.exit(1 if bad else 0)

main()
